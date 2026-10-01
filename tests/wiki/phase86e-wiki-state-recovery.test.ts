import { describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import {
  classifyWikiState,
  isWikiStateError,
  migrateWikiState,
  WikiService,
  WikiStore,
  WIKI_SCHEMA,
  WIKI_SCHEMA_VERSION,
} from '../../src/wiki/index.js';

import { KnowledgeGovernanceStore, KnowledgeGovernanceService } from '../../src/wiki/governance.js';

import { inspectWikiState, runWikiRepair } from '../../src/production/wiki-state.js';

const STATE_KEY = 'wiki/state.v1.json';
const GOVERNANCE_KEY = 'wiki/governance.v1.json';

/**
 * In-memory Wiki storage. Records every write so tests can prove that
 * read-only paths never mutate and that refused operations preserve the
 * original payload.
 */
class FakeStorage {
  readonly data = new Map<string, string>();

  readonly writes: string[] = [];

  async getText(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }

  async put(key: string, data: string | Uint8Array): Promise<void> {
    this.writes.push(key);
    this.data.set(key, typeof data === 'string' ? data : Buffer.from(data).toString('utf8'));
  }

  snapshot(): string {
    return JSON.stringify(
      [...this.data.entries()].sort(([left], [right]) => left.localeCompare(right))
    );
  }
}

/** Fails the final publish put, simulating a crash mid-write. */
class CrashOnPublishStorage extends FakeStorage {
  failKey?: string;

  override async put(key: string, data: string | Uint8Array): Promise<void> {
    if (key === this.failKey) {
      throw new Error('simulated crash during publish');
    }

    return super.put(key, data);
  }
}

function project(id = 'phase86e-wiki'): ProjectManifest {
  return {
    id,
    name: id,
    remote: id,
    rootPath: `/tmp/${id}`,
    createdAt: '2026-08-14T00:00:00.000Z',
    updatedAt: '2026-08-14T00:00:00.000Z',
    graphVersion: 0,
    memoryVersion: 0,
  };
}

function validState(projectId: string, pages: unknown[] = [], revisions: unknown[] = []): string {
  return JSON.stringify({
    schema: WIKI_SCHEMA,
    version: WIKI_SCHEMA_VERSION,
    projectId,
    pages,
    revisions,
    createdAt: '2026-08-14T00:00:00.000Z',
    updatedAt: '2026-08-14T00:00:00.000Z',
  });
}

describe('Phase 86E — Wiki state recovery', () => {
  it('T1: a never-used Wiki is a valid empty state, not corruption, and load does not write', async () => {
    const storage = new FakeStorage();
    const store = new WikiStore(storage, project());

    const classification = await store.readState();

    expect(classification.status).toBe('missing');

    const state = await store.load();

    expect(state.projectId).toBe('phase86e-wiki');
    expect(state.pages).toEqual([]);
    expect(state.revisions).toEqual([]);

    /* Reading never materialises a file. */
    expect(storage.data.has(STATE_KEY)).toBe(false);
    expect(storage.writes).toEqual([]);

    const inspection = await inspectWikiState(storage, project());

    expect(inspection.status).toBe('unused');
    expect(inspection.repairRequired).toBe(false);
    expect(storage.writes).toEqual([]);
  });

  it('T2: the first Wiki mutation initializes and persists state safely', async () => {
    const storage = new FakeStorage();
    const wiki = new WikiService(new WikiStore(storage, project()));

    await wiki.createPage({ title: 'Architecture', content: '# Architecture' });

    const text = storage.data.get(STATE_KEY);

    expect(text).toBeTruthy();

    const persisted = JSON.parse(text!) as { projectId: string; pages: unknown[] };

    expect(persisted.projectId).toBe('phase86e-wiki');
    expect(persisted.pages).toHaveLength(1);

    const classification = await new WikiStore(storage, project()).readState();

    expect(classification.status).toBe('current');
  });

  it('T3: an existing valid Wiki state loads unchanged', async () => {
    const storage = new FakeStorage();
    const page = {
      id: 'wiki-1',
      slug: 'architecture',
      title: 'Architecture',
      content: '# Architecture',
      tags: [],
      links: [],
      revision: 1,
      createdAt: '2026-08-14T00:00:00.000Z',
      updatedAt: '2026-08-14T00:00:00.000Z',
    };
    const revision = {
      id: 'revision-1',
      pageId: 'wiki-1',
      slug: 'architecture',
      revision: 1,
      title: 'Architecture',
      content: '# Architecture',
      tags: [],
      links: [],
      createdAt: '2026-08-14T00:00:00.000Z',
    };

    storage.data.set(STATE_KEY, validState('phase86e-wiki', [page], [revision]));

    const before = storage.snapshot();

    const state = await new WikiStore(storage, project()).load();

    expect(state.pages).toHaveLength(1);
    expect(state.revisions[0].id).toBe('revision-1');
    expect(storage.snapshot()).toBe(before);
  });

  it('T4: a foreign projectId is detected and never adopted', async () => {
    const storage = new FakeStorage();

    storage.data.set(STATE_KEY, validState('someone-else'));

    const before = storage.snapshot();

    await expect(new WikiStore(storage, project()).load()).rejects.toSatisfy(
      (error: unknown) => isWikiStateError(error) && error.code === 'WIKI_PROJECT_MISMATCH'
    );

    /* The other project's payload is untouched — no adoption, no rewrite. */
    expect(storage.snapshot()).toBe(before);
    expect(storage.writes).toEqual([]);

    const inspection = await inspectWikiState(storage, project());

    expect(inspection.status).toBe('project_mismatch');
    expect(inspection.repairRequired).toBe(true);

    const repair = await runWikiRepair(storage, project(), { dryRun: false });

    expect(repair.actions).toContain('refused:project-mismatch');
    expect(storage.snapshot()).toBe(before);
  });

  it('T5: malformed JSON is corruption and the original is preserved', async () => {
    const storage = new FakeStorage();

    storage.data.set(STATE_KEY, '{ not valid json');

    const before = storage.snapshot();

    await expect(new WikiStore(storage, project()).load()).rejects.toSatisfy(
      (error: unknown) => isWikiStateError(error) && error.code === 'WIKI_STATE_CORRUPT'
    );

    expect(storage.snapshot()).toBe(before);

    const repair = await runWikiRepair(storage, project());

    expect(repair.actions).toContain('refused:corrupt');
    expect(storage.snapshot()).toBe(before);
  });

  it('T6: supported schema migration is deterministic and idempotent', async () => {
    const storage = new FakeStorage();

    storage.data.set(STATE_KEY, validState('phase86e-wiki'));

    /* Version 1 is the only supported schema, so today's migration is an
     * identity transform — it exists as a real, tested path for the future. */
    const first = migrateWikiState(storage.data.get(STATE_KEY)!, 'phase86e-wiki');

    expect(first.migrated).toBe(false);
    expect(first.fromVersion).toBe(WIKI_SCHEMA_VERSION);

    const before = storage.snapshot();

    const resultA = await new WikiStore(storage, project()).migrate();
    const resultB = await new WikiStore(storage, project()).migrate();

    expect(resultA.migrated).toBe(false);
    expect(resultB.migrated).toBe(false);
    expect(storage.snapshot()).toBe(before);
  });

  it('T7: a future schema is never downgraded or overwritten', async () => {
    const storage = new FakeStorage();

    const future = JSON.stringify({
      schema: WIKI_SCHEMA,
      version: WIKI_SCHEMA_VERSION + 1,
      projectId: 'phase86e-wiki',
      pages: [],
      revisions: [],
      createdAt: '2026-08-14T00:00:00.000Z',
      updatedAt: '2026-08-14T00:00:00.000Z',
    });

    storage.data.set(STATE_KEY, future);

    const before = storage.snapshot();

    await expect(new WikiStore(storage, project()).load()).rejects.toSatisfy(
      (error: unknown) => isWikiStateError(error) && error.code === 'WIKI_SCHEMA_UNSUPPORTED'
    );

    expect(storage.snapshot()).toBe(before);

    const inspection = await inspectWikiState(storage, project());

    expect(inspection.status).toBe('schema_unsupported');
  });

  it('T8: a truncated state is explicit corruption, and a crash mid-publish keeps the previous valid state', async () => {
    const storage = new FakeStorage();

    /* Wiki keeps pages inside the state file, so a partial write is a truncated
     * JSON payload — reported as corruption, never silently treated as empty. */
    storage.data.set(STATE_KEY, validState('phase86e-wiki').slice(0, 40));

    expect((await new WikiStore(storage, project()).readState()).status).toBe('corrupt');

    /* Crash-window: a fresh valid state is staged (.pending) but the final
     * publish fails, leaving the previous valid payload readable. */
    const crash = new CrashOnPublishStorage();

    crash.data.set(STATE_KEY, validState('phase86e-wiki'));
    crash.failKey = STATE_KEY;

    const store = new WikiStore(crash, project());

    await expect(store.save(await store.load())).rejects.toThrow('simulated crash');

    const after = await new WikiStore(crash, project()).readState();

    expect(after.status === 'current' || after.status === 'empty').toBe(true);
    expect(crash.data.get(STATE_KEY)).toBe(validState('phase86e-wiki'));
  });

  it('T9: revisions that reference a missing page are an integrity error, not empty', async () => {
    const storage = new FakeStorage();

    const orphanRevision = {
      id: 'revision-orphan',
      pageId: 'wiki-missing',
      slug: 'missing',
      revision: 1,
      title: 'Missing',
      content: 'x',
      tags: [],
      links: [],
      createdAt: '2026-08-14T00:00:00.000Z',
    };

    storage.data.set(STATE_KEY, validState('phase86e-wiki', [], [orphanRevision]));

    const classification = classifyWikiState(storage.data.get(STATE_KEY)!, 'phase86e-wiki');

    expect(classification.status).toBe('revision_integrity_failed');

    const inspection = await inspectWikiState(storage, project());

    expect(inspection.status).toBe('corrupt');
  });

  it('T10: status on a never-used Wiki is idle, not error, and never writes', async () => {
    const storage = new FakeStorage();

    const inspection = await inspectWikiState(storage, project());

    expect(inspection.status).toBe('unused');
    expect(inspection.guidance).toEqual([]);
    expect(storage.writes).toEqual([]);
    /* Governance is also never-used. */
    expect(inspection.state.governance.status).toBe('missing');
  });

  it('serializes concurrent mutations through one service without losing state', async () => {
    const storage = new FakeStorage();
    const wiki = new WikiService(new WikiStore(storage, project()));

    await Promise.all([
      wiki.createPage({ title: 'One', content: 'x' }),
      wiki.createPage({ title: 'Two', content: 'y' }),
      wiki.createPage({ title: 'Three', content: 'z' }),
    ]);

    const state = await new WikiStore(storage, project()).load();

    expect(state.pages.map((page) => page.slug).sort()).toEqual(['one', 'three', 'two']);
  });

  it('does not adopt foreign governance state and never overwrites it', async () => {
    const storage = new FakeStorage();

    storage.data.set(
      GOVERNANCE_KEY,
      JSON.stringify({
        schema: 'toolnet.knowledge-governance.v1',
        version: 1,
        projectId: 'someone-else',
        policy: { autoApproveThreshold: 0.86, criticalApproveThreshold: 0.94, staleAfterDays: 90 },
        reviews: [],
        audit: [],
        createdAt: '2026-08-14T00:00:00.000Z',
        updatedAt: '2026-08-14T00:00:00.000Z',
      })
    );

    const before = storage.snapshot();

    await expect(new KnowledgeGovernanceStore(storage, project()).load()).rejects.toSatisfy(
      (error: unknown) => isWikiStateError(error) && error.code === 'WIKI_PROJECT_MISMATCH'
    );

    expect(storage.snapshot()).toBe(before);

    /* A read-only governance mutation attempt fails rather than resetting the
     * foreign state to an empty one for the current project. */
    const service = new KnowledgeGovernanceService(
      new KnowledgeGovernanceStore(storage, project())
    );

    await expect(service.setPolicy({ staleAfterDays: 30 }, 'test')).rejects.toThrow();

    expect(storage.snapshot()).toBe(before);
  });
});
