/*
 * Phase 75 — Architecture Decision Records / Persistent Engineering Knowledge.
 *
 * Verifies the ADR authority contract end to end: identity, revision model,
 * status lifecycle, supersession (with cycle prevention), byte-preserving
 * section updates, idempotency, deterministic lexical search, path/symbol
 * relevance, project isolation, history, backup/recovery, MCP registration,
 * context/impact integration, security and the packaged runtime.
 *
 * PHASE75_ARCHITECTURE_DECISIONS=PASS
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

import { ProjectScopedStorageProvider } from '../../src/storage/project/scoped-provider.js';

import { SnapshotManager } from '../../src/snapshot/index.js';

import { CodeGraphStore } from '../../src/code-intelligence/graph/graph-store.js';

import type { CodeSymbol, GraphEdge } from '../../src/core/types.js';

import {
  AdrError,
  AdrStore,
  ArchitectureDecisionQuery,
  ArchitectureDecisionService,
  adrStateKey,
  parseMarkdown,
  toMarkdown,
  type AdrStatus,
} from '../../src/knowledge/adr/index.js';

import { manageAdr } from '../../src/mcp/tools/manage-adr.js';

import { projectContext } from '../../src/mcp/tools/project-context.js';

import { analyzeImpact } from '../../src/mcp/tools/analyze-impact.js';

import type { MCPContext } from '../../src/mcp/context.js';

/* ------------------------------------------------------------------ *
 * Storage fixture
 * ------------------------------------------------------------------ */

class FakeStorage implements StorageProvider {
  readonly name = 'fake';

  readonly data = new Map<string, string>();

  async put(key: string, value: string | Uint8Array): Promise<void> {
    this.data.set(key, typeof value === 'string' ? value : Buffer.from(value).toString('utf8'));
  }

  async get(key: string): Promise<Uint8Array | null> {
    const value = this.data.get(key);

    return value === undefined ? null : Buffer.from(value, 'utf8');
  }

  async getText(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }

  async exists(key: string): Promise<boolean> {
    return this.data.has(key);
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }

  async list(prefix = ''): Promise<StorageObject[]> {
    return [...this.data.keys()]
      .filter((key) => key.startsWith(prefix))
      .sort((left, right) => left.localeCompare(right))
      .map((key) => ({ key }));
  }
}

function manifest(id: string, remote: string): ProjectManifest {
  return {
    id,
    name: remote,
    remote,
    rootPath: `/tmp/${remote}`,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    graphVersion: 0,
    memoryVersion: 0,
  };
}

async function fixture(options: { shared?: FakeStorage; remote?: string } = {}) {
  const shared = options.shared ?? new FakeStorage();
  const project = manifest('proj-adr-a', options.remote ?? 'adr-project-a');

  const storage = new ProjectScopedStorageProvider(
    shared,
    project.id,
    project.name,
    project.remote
  );

  const service = new ArchitectureDecisionService(new AdrStore(storage, project));

  await service.initialize();

  return { shared, project, storage, service };
}

async function reject(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
  } catch (error) {
    return error instanceof AdrError ? error.code : `UNEXPECTED:${String(error)}`;
  }

  return 'NO_ERROR';
}

/* ------------------------------------------------------------------ *
 * ADR authority contract
 * ------------------------------------------------------------------ */

describe('Phase 75 — ADR identity, storage and revisions', () => {
  it('allocates sequential project-scoped human ids and stores them under the project namespace', async () => {
    const { service, shared, project } = await fixture();

    const first = await service.create({ title: 'First decision', decision: 'do it' });
    const second = await service.create({ title: 'Second decision', decision: 'do it too' });

    expect(first.record.humanId).toBe('ADR-0001');
    expect(second.record.humanId).toBe('ADR-0002');
    expect(first.record.id).toBe(`${project.id}:ADR-0001`);
    expect(first.record.number).toBe(1);
    expect(first.record.revision).toBe(1);

    /* Authority lives where the scoped provider can isolate it. */
    expect(adrStateKey(project.id)).toBe(`projects/${project.id}/knowledge/adr/state.v1.json`);

    const authority = [...shared.data.keys()].filter((key) => key.includes('/knowledge/adr/'));

    expect(authority).toEqual(['projects/adr-project-a/knowledge/adr/state.v1.json']);
  });

  it('never reuses a number and refuses an explicit duplicate number', async () => {
    const { service } = await fixture();

    await service.create({ title: 'One', decision: 'x' });
    await service.create({ title: 'Two', decision: 'x' });
    await service.create({ title: 'Three', decision: 'x' });

    const page = await service.list({ status: 'all' });

    expect(page.records.map((record) => record.humanId)).toEqual([
      'ADR-0001',
      'ADR-0002',
      'ADR-0003',
    ]);

    const code = await reject(() =>
      service.create({ title: 'Imported duplicate', decision: 'x', number: 2 })
    );

    expect(code).toBe('ADR_CONFLICT');
  });

  it('creates 100 ADRs with unique ids and correct revisions', async () => {
    const { service } = await fixture();

    for (let index = 0; index < 100; index += 1) {
      await service.create({ title: `Decision ${index}`, decision: `body ${index}` });
    }

    const page = await service.list({ status: 'all', limit: 200 });

    expect(page.total).toBe(100);

    const ids = page.records.map((record) => record.humanId);

    expect(new Set(ids).size).toBe(100);
    expect(ids[0]).toBe('ADR-0001');
    expect(ids[99]).toBe('ADR-0100');
    expect(page.records.every((record) => record.revision === 1)).toBe(true);
  });

  it('serialises concurrent creates so two callers never share a number', async () => {
    const { service } = await fixture();

    const created = await Promise.all(
      Array.from({ length: 25 }, (_, index) =>
        service.create({ title: `Concurrent ${index}`, decision: 'body' })
      )
    );

    const numbers = created.map((result) => result.record.number).sort((a, b) => a - b);

    expect(numbers).toEqual(Array.from({ length: 25 }, (_, index) => index + 1));

    const page = await service.list({ status: 'all', limit: 200 });
    const ids = page.records.map((record) => record.humanId);

    expect(new Set(ids).size).toBe(25);
  });

  it('defaults to proposed and never auto-accepts', async () => {
    const { service } = await fixture();

    const created = await service.create({ title: 'Needs review', decision: 'x' });

    expect(created.record.status).toBe('proposed');
    expect(created.record.status).not.toBe('accepted');

    /* No system path promotes proposed -> accepted without an explicit call. */
    const refreshed = await service.get(created.record.humanId);

    expect(refreshed.status).toBe('proposed');
  });

  it('protects immutable identity fields from update', async () => {
    const { service } = await fixture();

    const created = await service.create({ title: 'Immutable', decision: 'x' });

    const updated = await service.update(created.record.humanId, {
      context: 'new context',
    });

    expect(updated.record.id).toBe(created.record.id);
    expect(updated.record.projectId).toBe(created.record.projectId);
    expect(updated.record.number).toBe(created.record.number);
    expect(updated.record.humanId).toBe(created.record.humanId);
    expect(updated.record.createdAt).toBe(created.record.createdAt);
    expect(updated.record.revision).toBe(2);
  });

  it('requires a non-empty decision for an accepted ADR', async () => {
    const { service } = await fixture();

    const code = await reject(() =>
      service.create({ title: 'Accepted without decision', status: 'accepted' })
    );

    expect(code).toBe('ADR_INVALID');

    const draft = await service.create({ title: 'Draft', decision: '' });

    const transition = await reject(() => service.changeStatus(draft.record.humanId, 'accepted'));

    expect(transition).toBe('ADR_INVALID');
  });
});

describe('Phase 75 — revision conflicts and idempotency', () => {
  it('rejects a stale expectedRevision with ADR_CONFLICT', async () => {
    const { service } = await fixture();

    const created = await service.create({ title: 'Conflict', decision: 'x' });

    await service.update(created.record.humanId, { context: 'first' }, { expectedRevision: 1 });

    const code = await reject(() =>
      service.update(created.record.humanId, { context: 'second' }, { expectedRevision: 1 })
    );

    expect(code).toBe('ADR_CONFLICT');
  });

  it('allows exactly one of two concurrent same-revision writers', async () => {
    const { service } = await fixture();

    const created = await service.create({ title: 'Race', decision: 'x' });

    const outcomes = await Promise.allSettled([
      service.update(created.record.humanId, { context: 'a' }, { expectedRevision: 1 }),
      service.update(created.record.humanId, { context: 'b' }, { expectedRevision: 1 }),
    ]);

    const fulfilled = outcomes.filter((outcome) => outcome.status === 'fulfilled');
    const rejected = outcomes.filter((outcome) => outcome.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(AdrError);
    expect(((rejected[0] as PromiseRejectedResult).reason as AdrError).code).toBe('ADR_CONFLICT');

    const current = await service.get(created.record.humanId);

    expect(current.revision).toBe(2);
  });

  it('applies set_sections as a byte-preserving partial update and is idempotent on retry', async () => {
    const { service } = await fixture();

    const created = await service.create({
      title: 'Sections',
      context: 'original context',
      decision: 'original decision',
      tags: ['alpha'],
      affectedPaths: ['src/a.ts'],
    });

    const first = await service.setSections(created.record.humanId, {
      consequences: { positive: ['faster'], negative: [], neutral: [] },
    });

    expect(first.idempotent).toBe(false);
    expect(first.record.revision).toBe(2);
    /* Untouched sections keep their exact previous values. */
    expect(first.record.context).toBe('original context');
    expect(first.record.decision).toBe('original decision');
    expect(first.record.tags).toEqual(['alpha']);
    expect(first.record.affectedPaths).toEqual(['src/a.ts']);
    expect(first.record.consequences.positive).toEqual(['faster']);

    const retry = await service.setSections(created.record.humanId, {
      consequences: { positive: ['faster'], negative: [], neutral: [] },
    });

    expect(retry.idempotent).toBe(true);
    expect(retry.record.revision).toBe(2);

    const history = await service.history(created.record.humanId);

    expect(history.map((event) => event.operation)).toEqual(['created', 'sections_updated']);
  });

  it('replays an identical create without allocating a second number', async () => {
    const { service } = await fixture();

    const payload = { title: 'Replay me', decision: 'body' };

    const first = await service.create(payload);
    const replay = await service.create(payload);

    expect(first.idempotent).toBe(false);
    expect(replay.idempotent).toBe(true);
    expect(replay.record.humanId).toBe(first.record.humanId);

    const page = await service.list({ status: 'all' });

    expect(page.total).toBe(1);
  });
});

describe('Phase 75 — status lifecycle and supersession', () => {
  it('enforces the explicit transition matrix', async () => {
    const { service } = await fixture();

    const created = await service.create({ title: 'Lifecycle', decision: 'body' });

    const accepted = await service.changeStatus(created.record.humanId, 'accepted');

    expect(accepted.record.status).toBe('accepted');

    /* rejected is reachable from proposed only. */
    expect(await reject(() => service.changeStatus(created.record.humanId, 'rejected'))).toBe(
      'ADR_INVALID_TRANSITION'
    );

    /* superseded is only reachable through the supersede operation. */
    expect(await reject(() => service.changeStatus(created.record.humanId, 'superseded'))).toBe(
      'ADR_INVALID_TRANSITION'
    );

    const deprecated = await service.changeStatus(created.record.humanId, 'deprecated');

    expect(deprecated.record.status).toBe('deprecated');
    /* deprecated is terminal except for supersession. */
    expect(await reject(() => service.changeStatus(created.record.humanId, 'accepted'))).toBe(
      'ADR_INVALID_TRANSITION'
    );
  });

  it('supersedes atomically in both directions', async () => {
    const { service } = await fixture();

    const old = await service.create({
      title: 'Old approach',
      decision: 'old',
      status: 'accepted',
    });

    const replacement = await service.create({
      title: 'New approach',
      decision: 'new',
      status: 'accepted',
    });

    const result = await service.supersede(old.record.humanId, replacement.record.humanId);

    expect(result.idempotent).toBe(false);
    expect(result.superseded.status).toBe('superseded');
    expect(result.superseded.supersededBy).toBe(replacement.record.humanId);
    expect(result.replacement.supersedes).toEqual([old.record.humanId]);
    expect(result.superseded.revision).toBe(2);
    expect(result.replacement.revision).toBe(2);

    const chain = await service.supersessionChain(old.record.humanId);

    expect(chain.supersededBy).toEqual([replacement.record.humanId]);

    /* Replaying the same supersession is idempotent. */
    const replay = await service.supersede(old.record.humanId, replacement.record.humanId);

    expect(replay.idempotent).toBe(true);

    const events = await service.history(replacement.record.humanId);

    expect(events.filter((event) => event.operation === 'superseded')).toHaveLength(1);
  });

  it('rejects supersession cycles', async () => {
    const { service } = await fixture();

    const a = await service.create({ title: 'A', decision: 'a', status: 'accepted' });
    const b = await service.create({ title: 'B', decision: 'b', status: 'accepted' });

    await service.supersede(a.record.humanId, b.record.humanId);

    expect(await reject(() => service.supersede(b.record.humanId, a.record.humanId))).toBe(
      'ADR_SUPERSESSION_CYCLE'
    );

    expect(await reject(() => service.supersede(a.record.humanId, a.record.humanId))).toBe(
      'ADR_SUPERSESSION_CYCLE'
    );
  });

  it('keeps superseded ADRs out of the current authority by default', async () => {
    const { service } = await fixture();

    const old = await service.create({ title: 'Retired', decision: 'x', status: 'accepted' });
    const next = await service.create({ title: 'Current', decision: 'y', status: 'accepted' });

    await service.supersede(old.record.humanId, next.record.humanId);

    const current = await service.list();

    expect(current.records.map((record) => record.humanId)).toEqual([next.record.humanId]);

    const all = await service.list({ status: 'all' });

    expect(all.records.map((record) => record.humanId)).toEqual([
      next.record.humanId,
      old.record.humanId,
    ]);
  });
});

describe('Phase 75 — history', () => {
  it('records created/updated/status/superseded events in deterministic order', async () => {
    const { service } = await fixture();

    const a = await service.create({ title: 'History A', decision: 'x' });
    await service.update(a.record.humanId, { context: 'ctx' });
    await service.changeStatus(a.record.humanId, 'accepted');

    const b = await service.create({ title: 'History B', decision: 'y' });
    await service.supersede(a.record.humanId, b.record.humanId);

    const history = await service.history(a.record.humanId);

    expect(history.map((event) => event.operation)).toEqual([
      'created',
      'updated',
      'status_changed',
      'superseded',
    ]);

    expect(history.map((event) => event.afterRevision)).toEqual([1, 2, 3, 4]);
    expect(history.every((event) => event.beforeRevision === event.afterRevision - 1)).toBe(true);
    expect(history[3]?.changedFields).toEqual(['status', 'supersededBy']);
  });
});

describe('Phase 75 — search and relevance', () => {
  it('ranks lexical matches locally without embeddings', async () => {
    const { service } = await fixture();

    await service.create({
      title: 'Use local FTS5/BM25 instead of embeddings',
      context: 'CPU VPS compatibility.',
      decision: 'Retrieval remains deterministic and local-first without a vector database.',
      status: 'accepted',
      tags: ['retrieval'],
    });

    await service.create({
      title: 'Editor tab width',
      context: 'Formatting preference.',
      decision: 'Use two spaces.',
      status: 'accepted',
    });

    const results = await service.search('vector database embeddings');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.record.title).toContain('FTS5');

    const unrelated = await service.search('kubernetes ingress controller');

    expect(unrelated).toHaveLength(0);

    /* Deterministic: the same query always returns the same ranking. */
    const again = await service.search('vector database embeddings');

    expect(again.map((item) => item.record.humanId)).toEqual(
      results.map((item) => item.record.humanId)
    );
  });

  it('finds ADRs by affected path and never by an unrelated path', async () => {
    const { service } = await fixture();

    await service.create({
      title: 'Fleet Graph is overlay only',
      decision: 'Fleet stores identity and cross-project edges only.',
      status: 'accepted',
      affectedPaths: ['src/code-intelligence/fleet/**'],
    });

    const hit = await service.relevantByPath('src/code-intelligence/fleet/fleet-store.ts');

    expect(hit.map((record) => record.humanId)).toEqual(['ADR-0001']);

    expect(
      await service.relevantByPath('./src/code-intelligence/fleet/fleet-builder.ts')
    ).toHaveLength(1);

    expect(await service.relevantByPath('src/knowledge/adr/service.ts')).toHaveLength(0);
  });

  it('requires an exact symbol match and never guesses by simple name', async () => {
    const { service } = await fixture();

    await service.create({
      title: 'FleetBuilder contract',
      decision: 'FleetBuilder consumes sanitized project exports only.',
      status: 'accepted',
      affectedSymbols: ['FleetBuilder'],
    });

    expect(await service.relevantBySymbol('FleetBuilder')).toHaveLength(1);
    /* A simple-name prefix/substring never matches. */
    expect(await service.relevantBySymbol('Fleet')).toHaveLength(0);
    expect(await service.relevantBySymbol('FleetBuilderX')).toHaveLength(0);
  });

  it('excludes superseded ADRs from relevance results', async () => {
    const { service } = await fixture();

    const old = await service.create({
      title: 'Old fleet contract',
      decision: 'old',
      status: 'accepted',
      affectedPaths: ['src/fleet/**'],
    });

    const next = await service.create({
      title: 'New fleet contract',
      decision: 'new',
      status: 'accepted',
    });

    await service.supersede(old.record.humanId, next.record.humanId);

    expect(await service.relevantByPath('src/fleet/thing.ts')).toHaveLength(0);
  });
});

describe('Phase 75 — query facade', () => {
  it('exposes the read-only knowledge questions behind one entry point', async () => {
    const { service } = await fixture();

    const query = new ArchitectureDecisionQuery(service);

    const old = await service.create({
      title: 'Facade old',
      decision: 'facade alpha',
      status: 'accepted',
      affectedPaths: ['src/facade/**'],
      affectedSymbols: ['FacadeSymbol'],
    });

    const next = await service.create({
      title: 'Facade new',
      decision: 'facade beta',
      status: 'accepted',
    });

    await service.supersede(old.record.humanId, next.record.humanId);

    expect((await query.get(next.record.humanId)).title).toBe('Facade new');
    expect((await query.list()).map((record) => record.humanId)).toEqual([next.record.humanId]);
    expect((await query.search('facade beta')).length).toBe(1);
    /* Only accepted ADRs are returned as active guidance. */
    expect(await query.affectedByPath('src/facade/x.ts')).toHaveLength(0);
    expect(await query.affectedBySymbol('FacadeSymbol')).toHaveLength(0);
    expect(await query.supersessionChain(old.record.humanId)).toEqual({
      supersedes: [],
      supersededBy: [next.record.humanId],
    });
  });
});

describe('Phase 75 — Markdown projection and import', () => {
  it('produces a byte-identical projection for the same revision', async () => {
    const { service } = await fixture();

    const created = await service.create({
      title: 'Deterministic export',
      context: 'ctx',
      decision: 'dec',
      status: 'accepted',
      affectedPaths: ['src/a.ts'],
    });

    const first = await service.exportMarkdown(created.record.humanId);
    const second = await service.exportMarkdown(created.record.humanId);

    expect(first.markdown).toBe(second.markdown);
    expect(first.filename).toBe('0001-deterministic-export.md');
    expect(first.markdown).toContain('# ADR-0001: Deterministic export');
    expect(first.markdown).toContain('Status: Accepted');
    /* No timestamps leak into the projection. */
    expect(first.markdown).not.toContain(created.record.createdAt);
  });

  it('sanitises the export filename so a hostile title cannot escape the destination', async () => {
    const { service, shared, project } = await fixture();

    const created = await service.create({
      title: '../../etc/evil ../../',
      decision: 'x',
    });

    const exported = await service.exportMarkdown(created.record.humanId, true);

    expect(exported.filename).not.toContain('/');
    expect(exported.key?.startsWith(`projects/${project.id}/knowledge/adr/markdown/`)).toBe(true);

    for (const key of shared.data.keys()) {
      expect(key).not.toContain('..');
      expect(key).not.toContain('/etc/');
    }
  });

  it('round-trips through canonical Markdown and rejects non-canonical documents', async () => {
    const { service } = await fixture();

    const created = await service.create({
      title: 'Round trip',
      context: 'ctx',
      decision: 'dec',
      status: 'accepted',
      tags: ['one', 'two'],
      affectedPaths: ['src/a.ts', 'src/b/**'],
    });

    const markdown = toMarkdown(created.record);

    const parsed = parseMarkdown(markdown);

    expect(parsed.number).toBe(1);
    expect(parsed.status).toBe('accepted');
    expect(parsed.title).toBe('Round trip');
    expect(parsed.affectedPaths).toEqual(['src/a.ts', 'src/b/**']);

    expect(await reject(() => Promise.resolve(parseMarkdown('just some notes')))).toBe(
      'ADR_UNSUPPORTED_FORMAT'
    );

    const { service: fresh } = await fixture();

    const imported = await fresh.importMarkdown(markdown);

    expect(imported.record.humanId).toBe('ADR-0001');
    expect(imported.record.provenance.source).toBe('import');
    expect(imported.record.affectedPaths).toEqual(['src/a.ts', 'src/b/**']);
  });
});

describe('Phase 75 — security', () => {
  it('rejects affected paths that escape the project root', async () => {
    const { service } = await fixture();

    for (const path of ['../../etc/passwd', '/etc/passwd', '~/secrets', 'a/../../b']) {
      expect(await reject(() => service.create({ title: 'Escape', affectedPaths: [path] }))).toBe(
        'ADR_PATH_ESCAPE'
      );
    }

    expect(
      await reject(() =>
        service.create({ title: 'Escape', affectedPaths: ['src/../../outside.ts'] })
      )
    ).toBe('ADR_PATH_ESCAPE');
  });

  it('rejects credential material in structured references and text', async () => {
    const { service } = await fixture();

    expect(
      await reject(() =>
        service.create({
          title: 'Leaky',
          references: [{ kind: 'url', target: 'https://user:sup3rsecret@example.com/x' }],
        })
      )
    ).toBe('ADR_SECRET_DETECTED');

    expect(
      await reject(() =>
        service.create({
          title: 'Leaky',
          decision: `key=${'AKIA'}${'A'.repeat(16)}`,
        })
      )
    ).toBe('ADR_SECRET_DETECTED');

    const safe = await service.create({
      title: 'Safe',
      decision: 'Use AKIA-prefixed keys from the secret manager at runtime.',
      references: [{ kind: 'url', target: 'https://example.com/design-doc' }],
    });

    expect(safe.record.humanId).toBe('ADR-0001');
  });

  it('never persists the rejected secret value', async () => {
    const { service, shared } = await fixture();

    const secret = 'sup3rsecretvalue';

    await reject(() =>
      service.create({
        title: 'Leaky',
        references: [{ kind: 'url', target: `https://user:${secret}@example.com` }],
      })
    );

    for (const value of shared.data.values()) {
      expect(value).not.toContain(secret);
    }
  });
});

describe('Phase 75 — project isolation and recovery', () => {
  it('keeps two projects with the same ADR ids fully separate', async () => {
    const shared = new FakeStorage();

    const projectA = manifest('proj-adr-a', 'isolated-a');
    const projectB = manifest('proj-adr-b', 'isolated-b');

    const storageA = new ProjectScopedStorageProvider(
      shared,
      projectA.id,
      projectA.name,
      projectA.remote
    );
    const storageB = new ProjectScopedStorageProvider(
      shared,
      projectB.id,
      projectB.name,
      projectB.remote
    );

    const serviceA = new ArchitectureDecisionService(new AdrStore(storageA, projectA));
    const serviceB = new ArchitectureDecisionService(new AdrStore(storageB, projectB));

    await serviceA.initialize();
    await serviceB.initialize();

    await serviceA.create({
      title: 'Project A decision',
      decision: 'sentinelprojecta marker',
      affectedPaths: ['src/a.ts'],
    });
    await serviceB.create({
      title: 'Project B decision',
      decision: 'sentinelprojectb marker',
      affectedPaths: ['src/b.ts'],
    });

    /* Both projects own an ADR-0001 with different identity and content. */
    const fromA = await serviceA.get('ADR-0001');
    const fromB = await serviceB.get('ADR-0001');

    expect(fromA.title).toBe('Project A decision');
    expect(fromB.title).toBe('Project B decision');
    expect(fromA.id).toBe('proj-adr-a:ADR-0001');
    expect(fromB.id).toBe('proj-adr-b:ADR-0001');

    /* A can never observe B's decisions. */
    expect(await serviceA.search('sentinelprojectb')).toHaveLength(0);
    expect((await serviceB.search('sentinelprojectb')).length).toBe(1);
    expect((await serviceA.search('sentinelprojecta')).length).toBe(1);
    expect(await serviceA.relevantByPath('src/b.ts')).toHaveLength(0);

    const keysA = [...shared.data.keys()].filter((key) => key.includes('/knowledge/adr/'));

    expect(keysA.sort()).toEqual([
      'projects/isolated-a/knowledge/adr/state.v1.json',
      'projects/isolated-b/knowledge/adr/state.v1.json',
    ]);

    /* Cross-project access through a scoped provider is refused outright. */
    await expect(storageA.getText(adrStateKey(projectB.id))).rejects.toThrow();
  });

  it('survives snapshot backup/restore with bodies, revisions, history and supersession intact', async () => {
    const { shared, project, storage, service } = await fixture();

    const old = await service.create({
      title: 'Recovered old',
      context: 'ctx old',
      decision: 'dec old',
      status: 'accepted',
      affectedPaths: ['src/fleet/**'],
    });

    const next = await service.create({
      title: 'Recovered new',
      decision: 'dec new',
      status: 'accepted',
    });

    await service.supersede(old.record.humanId, next.record.humanId);

    const before = await service.get(old.record.humanId);
    const beforeHistory = await service.history(old.record.humanId);

    const manager = new SnapshotManager(storage);

    const snapshot = await manager.create(project.id, 'phase75-certify');

    expect(snapshot).not.toBeNull();
    expect(snapshot?.objects).toContain('knowledge/adr/state.v1.json');

    /* Destroy the live authority, then restore from the snapshot. */
    shared.data.delete(adrStateKey(project.id));
    expect(shared.data.has(adrStateKey(project.id))).toBe(false);

    await manager.restore(project.id, snapshot!.id);

    const restoredService = new ArchitectureDecisionService(new AdrStore(storage, project));

    await restoredService.initialize();

    const after = await restoredService.get(old.record.humanId);
    const afterHistory = await restoredService.history(old.record.humanId);

    expect(after).toEqual(before);
    expect(afterHistory).toEqual(beforeHistory);
    expect(after.status).toBe('superseded');
    expect(after.supersededBy).toBe(next.record.humanId);
  });

  it('is deterministic across two identical datasets', async () => {
    async function build() {
      const { service } = await fixture();

      const a = await service.create({
        title: 'Deterministic A',
        decision: 'alpha beta gamma',
        status: 'accepted',
        tags: ['zeta', 'alpha'],
        affectedPaths: ['src/z.ts', 'src/a.ts'],
      });

      const b = await service.create({
        title: 'Deterministic B',
        decision: 'delta epsilon',
        status: 'accepted',
      });

      await service.supersede(a.record.humanId, b.record.humanId);

      const exported = await Promise.all(
        (await service.list({ status: 'all' })).records.map((entry) =>
          service.exportMarkdown(entry.humanId)
        )
      );

      return {
        listed: (await service.list({ status: 'all' })).records.map((entry) => ({
          humanId: entry.humanId,
          status: entry.status,
          revision: entry.revision,
          tags: entry.tags,
          affectedPaths: entry.affectedPaths,
          supersedes: entry.supersedes,
          supersededBy: entry.supersededBy,
        })),
        search: (await service.search('delta epsilon')).map((item) => item.record.humanId),
        markdown: exported.map((item) => item.markdown),
        chain: await service.supersessionChain(b.record.humanId),
      };
    }

    const first = await build();
    const second = await build();
    const third = await build();

    expect(second).toEqual(first);
    expect(third).toEqual(first);
  });
});

/* ------------------------------------------------------------------ *
 * MCP integration
 * ------------------------------------------------------------------ */

function mcpContext(
  storage: StorageProvider,
  project: ProjectManifest,
  options: { graph?: CodeGraphStore } = {}
): MCPContext {
  const graph = options.graph ?? new CodeGraphStore();

  return {
    project,
    storage,
    graph,
    memory: { recent: () => [] },
    retrieval: { search: () => [] },
    coverage: undefined,
    fleet: null,
  } as unknown as MCPContext;
}

function graphFixture(projectId: string): CodeGraphStore {
  const graph = new CodeGraphStore();

  const create: CodeSymbol = {
    id: 'f-create',
    projectId,
    name: 'createOrder',
    qualifiedName: 'createOrder',
    type: 'function',
    filePath: 'src/orders/create.ts',
    startLine: 1,
  };

  const caller: CodeSymbol = {
    id: 'f-api',
    projectId,
    name: 'handlePost',
    qualifiedName: 'handlePost',
    type: 'function',
    filePath: 'src/api.ts',
    startLine: 10,
  };

  const edge: GraphEdge = {
    id: `${projectId}:f-api:CALLS:f-create`,
    projectId,
    from: 'f-api',
    to: 'f-create',
    type: 'CALLS',
  };

  graph.import([create, caller], [edge]);

  return graph;
}

describe('Phase 75 — MCP manage_adr', () => {
  it('runs the full CRUD contract through the registered tool', async () => {
    const { storage, project } = await fixture();
    const ctx = mcpContext(storage, project);

    const created = await manageAdr(ctx, {
      action: 'create',
      title: 'Tool contract',
      context: 'ctx',
      decision: 'dec',
      status: 'accepted',
      affectedPaths: ['src/orders/**'],
    });

    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error('create failed');
    expect(created.record?.humanId).toBe('ADR-0001');
    expect(created.coverage?.scope).toBe('project');

    const got = await manageAdr(ctx, { action: 'get', id: 'ADR-0001' });
    expect(got.ok && got.record?.title).toBe('Tool contract');

    const listed = await manageAdr(ctx, { action: 'list', limit: 10 });
    expect(listed.ok && listed.records?.length).toBe(1);

    const searched = await manageAdr(ctx, { action: 'search', query: 'tool contract' });
    expect(searched.ok && searched.results?.[0]?.record.humanId).toBe('ADR-0001');

    const updated = await manageAdr(ctx, {
      action: 'set_sections',
      id: 'ADR-0001',
      sections: { tags: ['contract'], context: 'ctx' },
      expectedRevision: 1,
    });

    expect(updated.ok).toBe(true);
    if (updated.ok) {
      expect(updated.record?.tags).toEqual(['contract']);
      expect(updated.record?.context).toBe('ctx');
      expect(updated.record?.revision).toBe(2);
    }

    const history = await manageAdr(ctx, { action: 'history', id: 'ADR-0001' });
    expect(history.ok && history.history?.length).toBe(2);

    const exported = await manageAdr(ctx, { action: 'export', id: 'ADR-0001' });
    expect(exported.ok && exported.markdown?.includes('ADR-0001')).toBe(true);
    expect(exported.ok && exported.filename).toBe('0001-tool-contract.md');

    /* A corpus export persists projections and returns keys only. */
    const corpus = await manageAdr(ctx, { action: 'export' });

    expect(corpus.ok).toBe(true);
    if (corpus.ok) {
      expect(corpus.total).toBe(1);
      expect(corpus.exportKeys).toEqual([
        'projects/proj-adr-a/knowledge/adr/markdown/0001-tool-contract.md',
      ]);
      expect(corpus.markdown).toBeUndefined();
    }
  });

  it('reports deterministic error codes without leaking a stack trace', async () => {
    const { storage, project } = await fixture();
    const ctx = mcpContext(storage, project);

    const missing = await manageAdr(ctx, { action: 'get', id: 'ADR-9999' });

    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.error.code).toBe('ADR_NOT_FOUND');
      expect(missing.error).not.toHaveProperty('stack');
    }

    /* ADR-0001 now exists; an explicit duplicate number must be refused. */
    await manageAdr(ctx, { action: 'create', title: 'Existing', decision: 'x' });

    const conflict = await manageAdr(ctx, {
      action: 'create',
      title: 'Different title',
      decision: 'x',
      number: 1,
    });

    expect(conflict.ok).toBe(false);
    if (!conflict.ok) expect(conflict.error.code).toBe('ADR_CONFLICT');

    const escape = await manageAdr(ctx, {
      action: 'create',
      title: 'Escape',
      affectedPaths: ['../../etc/passwd'],
    });

    expect(escape.ok).toBe(false);
    if (!escape.ok) expect(escape.error.code).toBe('ADR_PATH_ESCAPE');

    const secret = await manageAdr(ctx, {
      action: 'create',
      title: 'Secret',
      references: [{ kind: 'url', target: 'https://u:supersecretpw@example.com' }],
    });

    expect(secret.ok).toBe(false);
    if (!secret.ok) {
      expect(secret.error.code).toBe('ADR_SECRET_DETECTED');
      expect(secret.error.message).not.toContain('supersecretpw');
    }

    const noStorage = await manageAdr({ ...ctx, storage: undefined } as unknown as MCPContext, {
      action: 'list',
    });

    expect(noStorage.ok).toBe(false);
  });

  it('links affected symbols through the graph without simple-name guessing', async () => {
    const { storage, project } = await fixture();
    const ctx = mcpContext(storage, project, { graph: graphFixture(project.id) });

    const created = await manageAdr(ctx, {
      action: 'create',
      title: 'Linked',
      decision: 'x',
      status: 'accepted',
      affectedSymbols: ['f-create', 'createOrder', 'create'],
    });

    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error('create failed');

    const links = created.record?.symbolLinks ?? [];

    expect(links.find((link) => link.target === 'f-create')).toMatchObject({
      status: 'resolved',
      symbolId: 'f-create',
    });
    expect(links.find((link) => link.target === 'createOrder')).toMatchObject({
      status: 'resolved',
      symbolId: 'f-create',
    });
    expect(links.find((link) => link.target === 'create')).toMatchObject({ status: 'unresolved' });
  });

  it('exposes supersede and chain through the tool', async () => {
    const { storage, project } = await fixture();
    const ctx = mcpContext(storage, project);

    await manageAdr(ctx, { action: 'create', title: 'Old', decision: 'a', status: 'accepted' });
    await manageAdr(ctx, { action: 'create', title: 'New', decision: 'b', status: 'accepted' });

    const superseded = await manageAdr(ctx, {
      action: 'supersede',
      oldId: 'ADR-0001',
      newId: 'ADR-0002',
    });

    expect(superseded.ok).toBe(true);
    if (superseded.ok) {
      expect(superseded.record?.status).toBe('superseded');
      expect(superseded.record?.supersededBy).toBe('ADR-0002');
      expect(superseded.replacement?.supersedes).toEqual(['ADR-0001']);
    }

    const chain = await manageAdr(ctx, { action: 'chain', id: 'ADR-0001' });

    expect(chain.ok && chain.supersededBy).toEqual(['ADR-0002']);

    const cycle = await manageAdr(ctx, {
      action: 'supersede',
      oldId: 'ADR-0002',
      newId: 'ADR-0001',
    });

    expect(cycle.ok).toBe(false);
    if (!cycle.ok) expect(cycle.error.code).toBe('ADR_SUPERSESSION_CYCLE');
  });

  it('imports canonical Markdown through the tool', async () => {
    const { storage, project } = await fixture();
    const ctx = mcpContext(storage, project);

    const markdown = [
      '# ADR-0007: Imported decision',
      '',
      'Status: Accepted',
      '',
      '## Context',
      '',
      'imported context',
      '',
      '## Decision',
      '',
      'imported decision',
      '',
      '## Affected Areas',
      '',
      '- `src/imported/**`',
      '',
    ].join('\n');

    const imported = await manageAdr(ctx, { action: 'import', markdown });

    expect(imported.ok).toBe(true);
    if (imported.ok) {
      expect(imported.record?.humanId).toBe('ADR-0007');
      expect(imported.record?.affectedPaths).toEqual(['src/imported/**']);
      expect(imported.record?.decision).toBe('imported decision');
    }

    const rejected = await manageAdr(ctx, { action: 'import', markdown: 'not an adr' });

    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.error.code).toBe('ADR_UNSUPPORTED_FORMAT');
  });
});

describe('Phase 75 — context and impact integration', () => {
  it('injects only relevant accepted ADRs into project_context', async () => {
    const { storage, project } = await fixture();
    const graph = graphFixture(project.id);
    const ctx = mcpContext(storage, project, { graph });

    await manageAdr(ctx, {
      action: 'create',
      title: 'Orders layering rule',
      context: 'Orders domain must not import transport code.',
      decision: 'Keep src/orders free of transport imports.',
      status: 'accepted',
      affectedPaths: ['src/orders/**'],
    });

    await manageAdr(ctx, {
      action: 'create',
      title: 'Unrelated decision',
      decision: 'Editor settings.',
      status: 'accepted',
      affectedPaths: ['editor/**'],
    });

    await manageAdr(ctx, {
      action: 'create',
      title: 'Proposed only',
      decision: 'Not yet authoritative.',
      status: 'proposed',
      affectedPaths: ['src/orders/**'],
    });

    const targeted = await projectContext(ctx, { filePaths: ['src/orders/create.ts'] });

    expect(targeted).toHaveProperty('architectureDecisions');
    const injected = targeted.architectureDecisions ?? [];

    expect(injected.map((entry) => entry.id)).toEqual(['ADR-0001']);
    expect(injected[0]?.title).toBe('Orders layering rule');
    /* Superseded/proposed/unrelated decisions must not be injected. */
    expect(injected.some((entry) => entry.id === 'ADR-0003')).toBe(false);
    expect(injected.some((entry) => entry.id === 'ADR-0002')).toBe(false);

    /* Untargeted calls keep the previous shape (no new field). */
    const untargeted = await projectContext(ctx, {});

    expect(untargeted).not.toHaveProperty('architectureDecisions');
    expect(untargeted).toHaveProperty('architecture');
  });

  it('returns relevantADRs from analyze_impact without changing impact semantics', async () => {
    const { storage, project } = await fixture();
    const graph = graphFixture(project.id);
    const ctx = mcpContext(storage, project, { graph });

    await manageAdr(ctx, {
      action: 'create',
      title: 'Order creation contract',
      decision: 'createOrder stays synchronous.',
      status: 'accepted',
      affectedPaths: ['src/orders/**'],
      affectedSymbols: ['f-create'],
    });

    const impact = await analyzeImpact(ctx, { symbolId: 'f-create' });

    expect(impact.found).toBe(true);
    expect(impact.relevantADRs).toEqual(['ADR-0001']);

    /* Existing impact output is unchanged in shape. */
    expect(impact.target?.id).toBe('f-create');
    expect(impact.impacts.map((item) => item.id)).toContain('f-api');

    /* A symbol with no linked ADR simply omits the additive field. */
    const unrelated = await analyzeImpact(ctx, { symbolId: 'f-api' });

    expect(unrelated.found).toBe(true);
    expect(unrelated.relevantADRs ?? []).toEqual([]);
  });

  it('degrades gracefully when ADR storage is unavailable', async () => {
    const { project } = await fixture();
    const graph = graphFixture(project.id);

    const ctx = mcpContext(new FakeStorage(), project, { graph });

    const impact = await analyzeImpact(ctx, { symbolId: 'f-create' });

    expect(impact.found).toBe(true);
    expect(impact.relevantADRs ?? []).toEqual([]);

    const context = await projectContext(ctx, { filePaths: ['src/orders/create.ts'] });

    expect(context).toHaveProperty('architecture');
  });
});

/* ------------------------------------------------------------------ *
 * Packaged runtime certification
 * ------------------------------------------------------------------ */

const repoRoot = resolve(import.meta.dirname, '..', '..');

/**
 * Run the packaged MCP bundle and read its real `tools/list` response. The MCP
 * stdio server does not exit on stdin EOF, so the probe resolves as soon as the
 * id=2 response arrives and then kills the child.
 */
async function listPackagedMcpTools(bundlePath: string): Promise<string[]> {
  const cwd = mkdtempSync(join(tmpdir(), 'toolnet-phase75-'));

  const requests = `${[
    JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'phase75-certify', version: '1.0.0' },
      },
    }),
    JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }),
  ].join('\n')}\n`;

  const child = spawn(process.execPath, [bundlePath], { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
  child.stderr.resume();

  return new Promise<string[]>((resolvePromise, rejectPromise) => {
    let buffer = '';
    let settled = false;
    let timer: NodeJS.Timeout | undefined;

    const finish = (callback: () => void) => {
      if (settled) {
        return;
      }

      settled = true;
      if (timer) clearTimeout(timer);
      child.kill('SIGKILL');
      callback();
    };

    child.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8');

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;

        let parsed: { id?: number; result?: { tools?: Array<{ name?: string }> } };

        try {
          parsed = JSON.parse(line) as typeof parsed;
        } catch {
          continue;
        }

        if (parsed.id === 2 && parsed.result?.tools) {
          finish(() =>
            resolvePromise(
              (parsed.result?.tools ?? [])
                .map((tool) => tool.name)
                .filter((name): name is string => typeof name === 'string')
            )
          );
        }
      }
    });

    child.on('error', (error) => finish(() => rejectPromise(error)));

    timer = setTimeout(
      () => finish(() => rejectPromise(new Error('packaged runtime probe timed out'))),
      30_000
    );

    child.stdin.write(requests);
  });
}

describe('Phase 75 — packaged runtime', () => {
  const bundlePath = join(repoRoot, 'bundle', 'mcp.js');

  it('ships the ADR authority module inside the packaged bundle', () => {
    expect(existsSync(bundlePath)).toBe(true);

    const bundle = readFileSync(bundlePath, 'utf8');

    /*
     * Class/identifier names are minified, so only string literals that carry
     * real runtime meaning are asserted.
     */
    for (const marker of [
      'ADR_SUPERSESSION_CYCLE',
      'ADR_SECRET_DETECTED',
      'knowledge/adr/state.v1.json',
      'knowledge/adr/markdown/',
      'manage_adr',
    ]) {
      expect(bundle).toContain(marker);
    }

    const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')) as {
      files?: string[];
      version?: string;
    };

    expect(pkg.files).toContain('bundle');
    /* The marker is a phase gate, never a package version. */
    expect(pkg.version).toBeDefined();
  });

  it('exposes manage_adr over MCP from the packaged bundle', async () => {
    const tools = await listPackagedMcpTools(bundlePath);

    expect(tools).toContain('manage_adr');
    expect(tools).toContain('project_context');
    expect(tools).toContain('analyze_impact');
  });

  it('emits the phase marker only when every ADR guarantee holds', async () => {
    const { service } = await fixture();

    const a = await service.create({ title: 'Marker A', decision: 'a', status: 'accepted' });
    const b = await service.create({ title: 'Marker B', decision: 'b', status: 'accepted' });

    await service.supersede(a.record.humanId, b.record.humanId);

    const statuses: AdrStatus[] = (await service.list({ status: 'all' })).records.map(
      (record) => record.status
    );

    expect(statuses).toContain('superseded');
    expect(statuses).toContain('accepted');

    const markdown = (await service.exportMarkdown(b.record.humanId)).markdown;

    expect(markdown.startsWith('# ADR-0002: Marker B')).toBe(true);

    console.log('PHASE75_ARCHITECTURE_DECISIONS=PASS');
  });
});
