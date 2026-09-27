/**
 * Phase 76 — Shared Graph Artifact / Portable Code Intelligence Cache.
 *
 * Production certification. This is not a smoke test: it exercises a real
 * two-machine simulation (same canonical project identity, different root path,
 * shared remote storage) plus the full attack surface of the archive codec.
 *
 * PASS marker: PHASE76_SHARED_GRAPH_ARTIFACT=PASS
 */

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { dirname, join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { RepositoryIndexer } from '../../src/code-intelligence/indexer/repository-indexer.js';

import { buildManifestFromPaths } from '../../src/code-intelligence/incremental/manifest-builder.js';

import { searchableParserExtensions } from '../../src/code-intelligence/parsers/capabilities.js';

import {
  ResolutionEngine,
  summarizeResolution,
} from '../../src/code-intelligence/resolution/resolution-engine.js';

import { GraphCoverageBuilder } from '../../src/code-intelligence/graph-coverage/coverage-builder.js';

import { GraphCoverageEvaluator } from '../../src/code-intelligence/graph-coverage/coverage-evaluator.js';

import {
  ARTIFACT_COMPONENT_SPECS,
  ARTIFACT_LIMITS,
  ARTIFACT_REASON_CODES,
  ARTIFACT_SCHEMA_VERSION,
  ArtifactError,
  CodeIntelligenceArtifactStore,
  applyArtifactRetention,
  artifactComponentKey,
  artifactGeneration,
  artifactProjectContext,
  artifactStatus,
  buildArtifact,
  checkArtifactCompatibility,
  hydrateArtifact,
  localArtifactGeneration,
  publishArtifact,
  readArtifactArchive,
  runtimeArtifactFingerprints,
  sourceManifestHash,
  verifyArtifactSource,
  writeArtifactArchive,
  type ArtifactProjectContext,
  type CodeIntelligenceArtifactManifest,
} from '../../src/code-intelligence/artifact/index.js';

import { ProjectGraphAdapter } from '../../src/code-intelligence/query-v2/project-graph-adapter.js';

import { runQuery } from '../../src/code-intelligence/query-v2/engine.js';

import { FleetBuilder } from '../../src/code-intelligence/fleet/fleet-builder.js';

import { FleetProjectRegistry } from '../../src/code-intelligence/fleet/project-registry.js';

import { CrossServiceEngine } from '../../src/code-intelligence/cross-service/cross-service-engine.js';

import { AdrStore } from '../../src/knowledge/adr/store.js';

import { ArchitectureDecisionService } from '../../src/knowledge/adr/service.js';

import { CodeGraphStore } from '../../src/code-intelligence/graph/graph-store.js';

import { LocalStorageProvider } from '../../src/storage/local/client.js';

import { ProjectScopedStorageProvider } from '../../src/storage/project/scoped-provider.js';

import { mapProjectStoragePath } from '../../src/storage/project/layout.js';

import { sanitizeProjectFolder } from '../../src/storage/project/folder.js';

import { PersistentCodeGraphStore } from '../../src/storage/code-graph-store.js';

import { PersistentCodeManifestStore } from '../../src/storage/code-manifest-store.js';

import { PersistentGraphCoverageStore } from '../../src/storage/graph-coverage-store.js';

import { PersistentTypeResolutionStore } from '../../src/storage/type-resolution-store.js';

import { PersistentFleetExportStore } from '../../src/storage/fleet-export-store.js';

import { MemoryStore } from '../../src/storage/memory-store.js';

import { manageGraphArtifact } from '../../src/mcp/tools/manage-graph-artifact.js';

import type { MCPContext } from '../../src/mcp/context.js';

import type { ProjectManifest } from '../../src/core/types.js';

import type { CodeManifest } from '../../src/code-intelligence/incremental/manifest.js';

/* ------------------------------------------------------------------ *
 * Fixtures
 * ------------------------------------------------------------------ */

const PHASE76_MARKER = 'PHASE76_SHARED_GRAPH_ARTIFACT=PASS';

const roots: string[] = [];

function temp(label: string): string {
  const value = mkdtempSync(join(tmpdir(), `toolnet-phase76-${label}-`));
  roots.push(value);
  return value;
}

afterEach(() => {
  for (const value of roots.splice(0)) {
    rmSync(value, { recursive: true, force: true });
  }
});

const SOURCE_V1: Record<string, string> = {
  'src/orders.ts': [
    'export interface Order { id: number; status: string }',
    '',
    'export class OrderRepository {',
    '  save(order: Order): void {',
    '    order.status = "saved";',
    '  }',
    '}',
    '',
    'export function createOrder(id: number): Order {',
    '  const order: Order = { id, status: "new" };',
    '  new OrderRepository().save(order);',
    '  return order;',
    '}',
    '',
  ].join('\n'),
  'src/client.ts': [
    'import { createOrder } from "./orders";',
    '',
    'export function submit(id: number): void {',
    '  createOrder(id);',
    '}',
    '',
  ].join('\n'),
};

const SOURCE_V2: Record<string, string> = {
  ...SOURCE_V1,
  'src/orders.ts': `${SOURCE_V1['src/orders.ts']}// v2\n`,
};

function writeSource(rootPath: string, files: Record<string, string>): void {
  for (const [relative, content] of Object.entries(files)) {
    const absolute = join(rootPath, relative);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, content);
  }
}

const PROJECT_ID = 'proj-shared-1';
const FOLDER = 'org/shared-repo';
/** The scoped provider silently sanitizes a remote namespace into a folder. */
const PHYSICAL_FOLDER = sanitizeProjectFolder(FOLDER);
const IDENTITY = 'github.com/org/shared-repo';

interface Machine {
  rootPath: string;
  storage: ProjectScopedStorageProvider;
  context: ArtifactProjectContext;
  projectManifest: ProjectManifest;
  logical(component: (typeof ARTIFACT_COMPONENT_SPECS)[number]['name']): string;
  physical(key: string): string;
}

interface Harness {
  /** Machine A: the publisher's storage root (stands in for the shared remote). */
  remoteRoot: string;
  /** Machine B: an independent local derived cache. */
  localRoot: string;
  a: Machine;
  b: Machine;
  seed(files: Record<string, string>): Promise<{
    manifest: CodeManifest;
    graph: CodeGraphStore;
  }>;
  /** Transport the published artifact subtree from A's root to B's root. */
  sync(): Promise<number>;
  publish(options?: PublishArtifactOptions): Promise<Awaited<ReturnType<typeof publishArtifact>>>;
  /** Local storage inspection (machine B). */
  snapshotKeys(): Promise<Map<string, string>>;
  localKey(logicalOrPhysical: string): string;
  putLocal(key: string, bytes: Uint8Array): Promise<void>;
  remote(): LocalStorageProvider;
  local(): LocalStorageProvider;
}

type PublishArtifactOptions = Parameters<typeof publishArtifact>[2];

const ARTIFACT_SUBTREE = `projects/${PHYSICAL_FOLDER}/code/graph/artifacts/`;

function machine(storageRoot: string, label: string, rootPath: string): Machine {
  const projectManifest: ProjectManifest = {
    id: PROJECT_ID,
    name: 'shared-repo',
    remote: IDENTITY,
    rootPath,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    graphVersion: 1,
    memoryVersion: 1,
  };

  const storage = new ProjectScopedStorageProvider(
    new LocalStorageProvider(storageRoot),
    PROJECT_ID,
    'shared-repo',
    FOLDER
  );

  return {
    rootPath,
    storage,
    projectManifest,
    context: artifactProjectContext(projectManifest),
    logical(component) {
      return artifactComponentKey(PROJECT_ID, component);
    },
    physical(key) {
      return mapProjectStoragePath(key).replace(
        `projects/${PROJECT_ID}/`,
        `projects/${PHYSICAL_FOLDER}/`
      );
    },
  };
}

function createHarness(): Harness {
  const remoteRoot = temp('remote');
  const localRoot = temp('local');

  const a = machine(remoteRoot, 'a', temp('a'));
  const b = machine(localRoot, 'b', temp('b'));

  const remote = () => new LocalStorageProvider(remoteRoot);
  const local = () => new LocalStorageProvider(localRoot);

  /**
   * Machine B never shares A's local derived cache. Only the immutable artifact
   * subtree travels, exactly like a bucket sync between two machines.
   */
  async function sync(): Promise<number> {
    const objects = await remote().list(ARTIFACT_SUBTREE);

    let copied = 0;

    for (const object of [...objects].sort((left, right) => left.key.localeCompare(right.key))) {
      const bytes = await remote().get(object.key);
      if (!bytes) continue;
      await local().put(object.key, bytes);
      copied += 1;
    }

    return copied;
  }

  async function publish(
    options: PublishArtifactOptions = {}
  ): Promise<Awaited<ReturnType<typeof publishArtifact>>> {
    const result = await publishArtifact(a.storage, a.context, options);
    await sync();
    return result;
  }

  async function snapshotKeys(): Promise<Map<string, string>> {
    const objects = await local().list('projects/');
    const output = new Map<string, string>();
    for (const object of [...objects].sort((left, right) => left.key.localeCompare(right.key))) {
      output.set(object.key, String(object.size ?? 0));
    }
    return output;
  }

  function localKey(value: string): string {
    return mapProjectStoragePath(value).replace(
      `projects/${PROJECT_ID}/`,
      `projects/${PHYSICAL_FOLDER}/`
    );
  }

  async function putLocal(key: string, bytes: Uint8Array): Promise<void> {
    await local().put(localKey(key), bytes);
  }

  async function seed(files: Record<string, string>) {
    writeSource(a.rootPath, files);

    const indexed = await new RepositoryIndexer().index(PROJECT_ID, a.rootPath, {});

    await new PersistentCodeGraphStore(a.storage).save({
      version: 1,
      projectId: PROJECT_ID,
      updatedAt: new Date().toISOString(),
      files: indexed.files,
      symbols: indexed.graph.allSymbols(PROJECT_ID),
      edges: indexed.graph.allEdges(PROJECT_ID),
    });

    const manifest = await buildManifestFromPaths(PROJECT_ID, a.rootPath, indexed.acceptedFiles, {
      scan: { extensions: searchableParserExtensions() },
    });

    await new PersistentCodeManifestStore(a.storage).save(manifest);

    const resolution = await new ResolutionEngine({
      projectId: PROJECT_ID,
      rootPath: a.rootPath,
      graph: indexed.graph,
      parsedFiles: indexed.parsedFiles ?? [],
    }).resolve();

    await new PersistentTypeResolutionStore(a.storage).save(resolution.snapshot);

    const coverage = new GraphCoverageBuilder().build({
      projectId: PROJECT_ID,
      scan: indexed.scan,
      acceptedFiles: indexed.acceptedFiles,
      languages: indexed.languages,
      indexedFiles: indexed.files,
      structuralFiles: indexed.structuralFiles,
      lexicalOnlyFiles: indexed.lexicalOnlyFiles,
      parseFailures: indexed.parseFailures,
      crossFileResolutionLanguages: indexed.crossFileResolutionLanguages,
      structuralParserUnavailable: indexed.structuralFallbacks,
      structuralParseFailed: indexed.structuralDiagnostics,
      resolution: summarizeResolution(resolution.snapshot),
    });

    await new PersistentGraphCoverageStore(a.storage).save(coverage);

    return { manifest, graph: indexed.graph };
  }

  return {
    remoteRoot,
    localRoot,
    a,
    b,
    seed,
    sync,
    publish,
    snapshotKeys,
    localKey,
    putLocal,
    remote,
    local,
  };
}

async function hydrateB(
  harness: Harness,
  options: Parameters<typeof hydrateArtifact>[2] = {}
): Promise<Awaited<ReturnType<typeof hydrateArtifact>>> {
  return hydrateArtifact(harness.b.storage, harness.b.context, options);
}

function mcpContext(machine: Machine, rootStorage: LocalStorageProvider): MCPContext {
  return {
    project: machine.projectManifest,
    storage: machine.storage,
    rootStorage,
  } as unknown as MCPContext;
}

type ToolFailure = { ok: false; error: { code: string }; reasonCodes: readonly string[] };

/* ------------------------------------------------------------------ *
 * Build / manifest / generation / integrity
 * ------------------------------------------------------------------ */

describe('Phase 76 — build, manifest and generation', () => {
  it('builds a manifest with every required component and verifies its integrity', async () => {
    const harness = createHarness();
    await harness.seed(SOURCE_V1);

    const exported = await buildArtifact(harness.a.storage, harness.a.context);

    const names = exported.manifest.components.map((component) => component.name);

    for (const spec of ARTIFACT_COMPONENT_SPECS) {
      if (spec.kind === 'required') {
        expect(names).toContain(spec.name);
      }
    }

    expect(exported.manifest.version).toBe(ARTIFACT_SCHEMA_VERSION);
    expect(exported.manifest.projectId).toBe(PROJECT_ID);
    expect(exported.manifest.projectIdentity).toBe(IDENTITY);
    expect(exported.manifest.integrity.algorithm).toBe('sha256');
    expect(exported.manifest.integrity.artifactHash).toBe(exported.artifactSha256);
    expect(exported.manifest.source.fileCount).toBeGreaterThan(0);
    expect(exported.manifest.stats.symbols).toBeGreaterThan(0);

    const archive = await readArtifactArchive({
      source: exported.artifactPath,
      expectedSha256: exported.artifactSha256,
    });

    expect(archive.header.generation).toBe(exported.generation);
    expect(archive.components.get('graph')).toBeDefined();
    expect(archive.components.get('code-manifest')).toBeDefined();
  });

  it('declares the local code-search cache as non-portable and rebuildable', async () => {
    const harness = createHarness();
    await harness.seed(SOURCE_V1);

    const exported = await buildArtifact(harness.a.storage, harness.a.context);

    expect(exported.manifest.nonPortableComponents.map((item) => item.name)).toContain(
      'code-search-cache'
    );

    expect(exported.manifest.components.map((item) => item.name)).not.toContain(
      'code-search-cache'
    );
  });

  it('derives a deterministic generation from source and fingerprints', async () => {
    const harness = createHarness();
    const seeded = await harness.seed(SOURCE_V1);

    const exported = await buildArtifact(harness.a.storage, harness.a.context);

    const expected = artifactGeneration({
      projectIdentity: IDENTITY,
      sourceManifestHash: sourceManifestHash(seeded.manifest),
      ...runtimeArtifactFingerprints(),
    });

    expect(exported.generation).toBe(expected);
    expect(exported.generation).toMatch(/^gen-[0-9a-f]{32}$/);
  });

  it('produces byte-identical archives for the same generation across repeated builds', async () => {
    const harness = createHarness();
    await harness.seed(SOURCE_V1);

    const first = await buildArtifact(harness.a.storage, harness.a.context);
    const second = await buildArtifact(harness.a.storage, harness.a.context);
    const third = await buildArtifact(harness.a.storage, harness.a.context);

    expect(second.generation).toBe(first.generation);
    expect(third.generation).toBe(first.generation);
    expect(second.artifactSha256).toBe(first.artifactSha256);
    expect(third.artifactSha256).toBe(first.artifactSha256);

    for (const component of first.manifest.components) {
      const repeated = third.manifest.components.find((item) => item.name === component.name);
      expect(repeated?.sha256).toBe(component.sha256);
    }
  });

  it('refuses to build when a required component is missing', async () => {
    const harness = createHarness();
    await harness.seed(SOURCE_V1);

    await harness.a.storage.delete(harness.a.physical(harness.a.logical('coverage')));

    await expect(buildArtifact(harness.a.storage, harness.a.context)).rejects.toMatchObject({
      code: 'ARTIFACT_COMPONENT_MISSING',
    });
  });

  it('refuses to publish a structurally invalid graph', async () => {
    const harness = createHarness();
    await harness.seed(SOURCE_V1);

    const graph = (await new PersistentCodeGraphStore(harness.a.storage).load(PROJECT_ID))!;

    await new PersistentCodeGraphStore(harness.a.storage).save({
      ...graph,
      edges: [
        ...graph.edges,
        {
          id: 'edge-dangling',
          projectId: PROJECT_ID,
          from: 'does-not-exist',
          to: graph.symbols[0]!.id,
          type: 'CALLS',
        } as (typeof graph)['edges'][number],
      ],
    });

    await expect(buildArtifact(harness.a.storage, harness.a.context)).rejects.toMatchObject({
      code: 'ARTIFACT_GRAPH_INVALID',
    });
  });
});

/* ------------------------------------------------------------------ *
 * Publish / current pointer / idempotency
 * ------------------------------------------------------------------ */

describe('Phase 76 — publish and current pointer', () => {
  it('publishes an immutable generation and then moves the current pointer', async () => {
    const harness = createHarness();
    await harness.seed(SOURCE_V1);

    const published = await harness.publish();

    const store = new CodeIntelligenceArtifactStore(harness.a.storage, PROJECT_ID);

    const pointer = await store.getCurrent();

    expect(pointer?.generation).toBe(published.generation);
    expect(pointer?.artifactSha256).toBe(published.artifactSha256);

    const manifest = await store.getGenerationManifest(published.generation);

    expect(manifest?.integrity.artifactHash).toBe(published.artifactSha256);
    expect(manifest?.integrity.manifestHash).toBe(pointer?.manifestSha256);
  });

  it('treats a repeated publish of the same generation as a no-op', async () => {
    const harness = createHarness();
    await harness.seed(SOURCE_V1);

    const first = await harness.publish();
    const second = await harness.publish();

    expect(first.idempotent).toBe(false);
    expect(second.idempotent).toBe(true);
    expect(second.generation).toBe(first.generation);
    expect(second.artifactSha256).toBe(first.artifactSha256);
    expect(second.manifestSha256).toBe(first.manifestSha256);

    const store = new CodeIntelligenceArtifactStore(harness.a.storage, PROJECT_ID);

    expect(await store.listGenerations()).toEqual([first.generation]);
  });

  it('never overwrites an existing generation with different bytes', async () => {
    const harness = createHarness();
    await harness.seed(SOURCE_V1);

    const published = await harness.publish();

    const store = new CodeIntelligenceArtifactStore(harness.a.storage, PROJECT_ID);

    const manifest = (await store.getGenerationManifest(published.generation))!;

    await expect(
      store.putGeneration(
        {
          ...manifest,
          integrity: { ...manifest.integrity, artifactHash: 'x'.repeat(64) },
        },
        new Uint8Array([1, 2, 3])
      )
    ).rejects.toMatchObject({ code: 'ARTIFACT_GENERATION_CONFLICT' });
  });

  it('rejects a current pointer that does not match the generation manifest', async () => {
    const harness = createHarness();
    await harness.seed(SOURCE_V1);

    const published = await harness.publish();

    const store = new CodeIntelligenceArtifactStore(harness.a.storage, PROJECT_ID);

    await store.setCurrent({
      version: 1,
      generation: published.generation,
      manifestSha256: published.manifestSha256,
      artifactSha256: 'f'.repeat(64),
      updatedAt: new Date().toISOString(),
    });

    /* The corrupted pointer must reach the pulling machine. */
    await harness.sync();

    await expect(
      hydrateArtifact(harness.b.storage, harness.b.context, {
        skipSourceValidation: true,
      })
    ).rejects.toMatchObject({ code: 'ARTIFACT_HASH_MISMATCH' });
  });

  it('keeps the previous generation readable after a new generation lands', async () => {
    const harness = createHarness();
    await harness.seed(SOURCE_V1);

    const first = await harness.publish({ prune: false });

    await harness.seed(SOURCE_V2);

    const second = await harness.publish();

    expect(second.generation).not.toBe(first.generation);

    const store = new CodeIntelligenceArtifactStore(harness.a.storage, PROJECT_ID);

    expect(await store.getGenerationManifest(first.generation)).not.toBeNull();
    expect((await store.getCurrent())?.generation).toBe(second.generation);
  });
});

/* ------------------------------------------------------------------ *
 * Pull / multi-machine
 * ------------------------------------------------------------------ */

describe('Phase 76 — multi-machine hydration', () => {
  it('hydrates on a different machine with a different root path', async () => {
    const harness = createHarness();
    const seeded = await harness.seed(SOURCE_V1);

    writeSource(harness.b.rootPath, SOURCE_V1);

    const published = await harness.publish();

    const hydrated = await hydrateB(harness);

    expect(hydrated.generation).toBe(published.generation);
    expect(hydrated.symbols).toBe(seeded.graph.allSymbols(PROJECT_ID).length);
    expect(hydrated.edges).toBe(seeded.graph.allEdges(PROJECT_ID).length);
    expect(hydrated.files).toBeGreaterThan(0);

    const local = await new PersistentCodeGraphStore(harness.b.storage).load(PROJECT_ID);

    expect(local?.symbols.length).toBe(hydrated.symbols);
    expect(local?.edges.length).toBe(hydrated.edges);

    /* No absolute machine path may leak into the hydrated derived state. */
    const serialized = JSON.stringify(local);

    expect(serialized).not.toContain(harness.a.rootPath);
    expect(serialized).not.toContain(harness.b.rootPath);
  });

  it('hydrates without parsing or scanning when the source manifest is supplied', async () => {
    const harness = createHarness();
    const seeded = await harness.seed(SOURCE_V1);

    writeSource(harness.b.rootPath, SOURCE_V1);

    await harness.publish();

    /*
     * Remove the entire source tree. Adoption must still succeed because the
     * caller supplied the manifest it already hashed: no scan, no parser and no
     * source read is involved in adopting a verified artifact.
     */
    rmSync(harness.b.rootPath, { recursive: true, force: true });

    const hydrated = await hydrateArtifact(harness.b.storage, harness.b.context, {
      sourceManifest: seeded.manifest,
    });

    expect(hydrated.symbols).toBe(seeded.graph.allSymbols(PROJECT_ID).length);

    const local = await new PersistentCodeGraphStore(harness.b.storage).load(PROJECT_ID);

    expect(local?.symbols.length).toBe(hydrated.symbols);
  });

  it('copies components byte for byte instead of rebuilding them', async () => {
    const harness = createHarness();
    await harness.seed(SOURCE_V1);
    writeSource(harness.b.rootPath, SOURCE_V1);

    const published = await harness.publish();

    await hydrateB(harness);

    const stored = await harness.b.storage.get(harness.b.physical(harness.b.logical('graph')));

    const manifestGraph = published.components.find((component) => component.name === 'graph');

    const { createHash } = await import('node:crypto');

    expect(createHash('sha256').update(stored!).digest('hex')).toBe(manifestGraph?.sha256);
  });

  it('produces the same generation on both machines', async () => {
    const harness = createHarness();
    await harness.seed(SOURCE_V1);
    writeSource(harness.b.rootPath, SOURCE_V1);

    const published = await harness.publish();

    await hydrateB(harness);

    expect(await localArtifactGeneration(harness.b.storage, harness.b.context)).toBe(
      published.generation
    );
  });

  it('answers TGQL queries identically before and after hydration', async () => {
    const harness = createHarness();
    await harness.seed(SOURCE_V1);
    writeSource(harness.b.rootPath, SOURCE_V1);

    await harness.publish();
    await hydrateB(harness);

    const snapshot = (await new PersistentCodeGraphStore(harness.a.storage).load(PROJECT_ID))!;

    const sourceGraph = new CodeGraphStore();

    sourceGraph.import(snapshot.symbols, snapshot.edges);

    const hydratedSnapshot = (await new PersistentCodeGraphStore(harness.b.storage).load(
      PROJECT_ID
    ))!;

    const hydratedGraph = new CodeGraphStore();

    hydratedGraph.import(hydratedSnapshot.symbols, hydratedSnapshot.edges);

    const query = 'MATCH (a:Function)-[:CALLS]->(b:Function) RETURN a.name, b.name LIMIT 20';

    const before = await runQuery({
      source: query,
      scope: 'project',
      graph: new ProjectGraphAdapter(sourceGraph, 'gen', PROJECT_ID),
    });

    const after = await runQuery({
      source: query,
      scope: 'project',
      graph: new ProjectGraphAdapter(hydratedGraph, 'gen', PROJECT_ID),
    });

    expect(after.rows).toEqual(before.rows);
    expect(before.rowCount).toBeGreaterThan(0);
  });

  it('preserves coverage semantics and never makes negative claims safe by itself', async () => {
    const harness = createHarness();
    await harness.seed(SOURCE_V1);
    writeSource(harness.b.rootPath, SOURCE_V1);

    const sourceCoverage = await new PersistentGraphCoverageStore(harness.a.storage).load(
      PROJECT_ID
    );

    await harness.publish();
    await hydrateB(harness);

    const hydratedCoverage = await new PersistentGraphCoverageStore(harness.b.storage).load(
      PROJECT_ID
    );

    expect(hydratedCoverage).toEqual(sourceCoverage);

    const evaluator = new GraphCoverageEvaluator({
      projectId: PROJECT_ID,
      rootPath: harness.b.rootPath,
      storage: harness.b.storage,
      snapshot: hydratedCoverage,
      graphAvailable: true,
    });

    /* Freshness is re-derived locally and still governs negative claims. */
    const stale = evaluator.evaluate('call_graph', {
      freshness: { checked: true, stale: true, added: [], modified: [], deleted: [] },
    });

    expect(stale.status).toBe('stale');
    expect(stale.negativeClaimSafe).toBe(false);

    const persisted = evaluator.evaluate('call_graph');

    expect(persisted.negativeClaimSafe).toBe(
      hydratedCoverage!.capabilities.call_graph.negativeClaimSafe
    );
  });
});

/* ------------------------------------------------------------------ *
 * Compatibility
 * ------------------------------------------------------------------ */

describe('Phase 76 — compatibility matrix', () => {
  async function manifestOf(harness: Harness): Promise<CodeIntelligenceArtifactManifest> {
    const exported = await buildArtifact(harness.a.storage, harness.a.context);
    return exported.manifest;
  }

  it('rejects an artifact built for another project', async () => {
    const harness = createHarness();
    await harness.seed(SOURCE_V1);

    const result = checkArtifactCompatibility({
      manifest: await manifestOf(harness),
      projectId: 'other-project',
      projectIdentity: IDENTITY,
    });

    expect(result.adoptable).toBe(false);
    expect(result.reason).toBe('ARTIFACT_PROJECT_MISMATCH');
  });

  it('rejects an artifact with a different canonical project identity', async () => {
    const harness = createHarness();
    await harness.seed(SOURCE_V1);

    const result = checkArtifactCompatibility({
      manifest: await manifestOf(harness),
      projectId: PROJECT_ID,
      projectIdentity: 'github.com/other/repo',
    });

    expect(result.adoptable).toBe(false);
    expect(result.reason).toBe('ARTIFACT_IDENTITY_MISMATCH');
  });

  it.each([
    ['parser', 'PARSER_FINGERPRINT_MISMATCH'],
    ['resolver', 'RESOLVER_FINGERPRINT_MISMATCH'],
    ['graphSemantics', 'SEMANTIC_SCHEMA_MISMATCH'],
    ['querySchema', 'QUERY_SCHEMA_MISMATCH'],
    ['artifactSchema', 'ARTIFACT_SCHEMA_UNSUPPORTED'],
  ] as const)('rejects a %s mismatch with its own reason code', async (axis, code) => {
    const harness = createHarness();
    await harness.seed(SOURCE_V1);

    const base = await manifestOf(harness);

    const result = checkArtifactCompatibility({
      manifest: {
        ...base,
        fingerprints: { ...base.fingerprints, [axis]: `tampered-${axis}` },
      },
      projectId: PROJECT_ID,
      projectIdentity: IDENTITY,
    });

    expect(result.adoptable).toBe(false);
    expect(result.reason).toBe(code);
  });

  it('reports every declared reason code so failures are never generic', () => {
    expect(ARTIFACT_REASON_CODES.length).toBeGreaterThan(15);
    expect(new Set(ARTIFACT_REASON_CODES).size).toBe(ARTIFACT_REASON_CODES.length);
  });
});

/* ------------------------------------------------------------------ *
 * Source validation
 * ------------------------------------------------------------------ */

describe('Phase 76 — source validation', () => {
  it('reports an exact match when local source equals the artifact source', async () => {
    const harness = createHarness();
    const seeded = await harness.seed(SOURCE_V1);
    writeSource(harness.b.rootPath, SOURCE_V1);

    const exported = await buildArtifact(harness.a.storage, harness.a.context);

    const verdict = await verifyArtifactSource(harness.b.context, exported.manifest, {
      sourceManifest: seeded.manifest,
    });

    expect(verdict.match).toBe('exact');
    expect(verdict.localManifestHash).toBe(verdict.artifactManifestHash);
  });

  it('detects a different source', async () => {
    const harness = createHarness();
    await harness.seed(SOURCE_V1);
    writeSource(harness.b.rootPath, SOURCE_V2);

    const exported = await buildArtifact(harness.a.storage, harness.a.context);

    const verdict = await verifyArtifactSource(harness.b.context, exported.manifest);

    expect(verdict.match).toBe('different');
  });

  it('rejects adoption and leaves local state untouched when the source changed', async () => {
    const harness = createHarness();
    await harness.seed(SOURCE_V1);
    writeSource(harness.b.rootPath, SOURCE_V1);

    await harness.publish();
    await hydrateB(harness);

    const before = await harness.b.storage.get(harness.b.physical(harness.b.logical('graph')));

    writeSource(harness.b.rootPath, SOURCE_V2);

    await expect(hydrateB(harness)).rejects.toMatchObject({
      code: 'ARTIFACT_SOURCE_MISMATCH',
    });

    const after = await harness.b.storage.get(harness.b.physical(harness.b.logical('graph')));

    expect(Buffer.from(after!).equals(Buffer.from(before!))).toBe(true);
  });
});

/* ------------------------------------------------------------------ *
 * Integrity / tampering
 * ------------------------------------------------------------------ */

describe('Phase 76 — integrity and tampering', () => {
  function artifactBytesKey(generation: string): string {
    return `projects/${PROJECT_ID}/graph/artifacts/generations/${generation}/artifact.tgz`;
  }

  it('rejects a modified archive byte', async () => {
    const harness = createHarness();
    await harness.seed(SOURCE_V1);

    const published = await harness.publish();

    const store = new CodeIntelligenceArtifactStore(harness.a.storage, PROJECT_ID);

    const bytes = new Uint8Array((await store.getArtifactBytes(published.generation))!);

    bytes[20] = (bytes[20]! + 1) % 256;

    await harness.putLocal(artifactBytesKey(published.generation), bytes);

    await expect(
      hydrateArtifact(harness.b.storage, harness.b.context, { skipSourceValidation: true })
    ).rejects.toMatchObject({ code: 'ARTIFACT_HASH_MISMATCH' });
  });

  it('rejects a truncated archive', async () => {
    const harness = createHarness();
    await harness.seed(SOURCE_V1);

    const published = await harness.publish();

    const store = new CodeIntelligenceArtifactStore(harness.a.storage, PROJECT_ID);

    const bytes = new Uint8Array((await store.getArtifactBytes(published.generation))!).slice(0, 8);

    await harness.putLocal(artifactBytesKey(published.generation), bytes);

    await expect(
      hydrateArtifact(harness.b.storage, harness.b.context, { skipSourceValidation: true })
    ).rejects.toBeInstanceOf(ArtifactError);
  });

  it('rejects a manifest whose body was tampered with', async () => {
    const harness = createHarness();
    await harness.seed(SOURCE_V1);

    const published = await harness.publish();

    const store = new CodeIntelligenceArtifactStore(harness.a.storage, PROJECT_ID);

    const manifest = (await store.getGenerationManifest(published.generation))!;

    await harness.putLocal(
      `projects/${PROJECT_ID}/graph/artifacts/generations/${published.generation}/manifest.json`,
      new Uint8Array(
        Buffer.from(JSON.stringify({ ...manifest, projectIdentity: 'github.com/attacker/repo' }))
      )
    );

    await expect(
      hydrateArtifact(harness.b.storage, harness.b.context, { skipSourceValidation: true })
    ).rejects.toMatchObject({ code: 'ARTIFACT_HASH_MISMATCH' });
  });

  it('rejects a component whose bytes no longer match its recorded hash', async () => {
    const harness = createHarness();
    await harness.seed(SOURCE_V1);

    const exported = await buildArtifact(harness.a.storage, harness.a.context);

    const archive = await readArtifactArchive({ source: exported.artifactPath });

    const altered = new Map(archive.components);

    const graphBytes = Buffer.from(altered.get('graph')!);

    altered.set('graph', new Uint8Array(Buffer.concat([graphBytes, Buffer.from('\n')])));

    const rewritten = join(temp('tamper'), 'tampered.tgz');

    await writeArtifactArchive({
      destination: rewritten,
      header: archive.header,
      payload: [...archive.header.components]
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((component) => ({ data: altered.get(component.name)! })),
    });

    await expect(readArtifactArchive({ source: rewritten })).rejects.toMatchObject({
      code: 'ARTIFACT_COMPONENT_HASH_MISMATCH',
    });
  });
});

/* ------------------------------------------------------------------ *
 * Archive safety
 * ------------------------------------------------------------------ */

describe('Phase 76 — archive safety', () => {
  async function hostileArchive(
    components: Array<{ name: string; size?: number; sha256?: string; data: Uint8Array }>
  ): Promise<string> {
    const header = {
      containerVersion: 1,
      artifactSchemaVersion: ARTIFACT_SCHEMA_VERSION,
      generation: `gen-${'a'.repeat(32)}`,
      projectId: 'p',
      projectIdentity: 'i',
      components: components.map((component) => ({
        name: component.name,
        schemaVersion: 1,
        kind: 'required',
        portable: true,
        sha256: component.sha256 ?? 'b'.repeat(64),
        size: component.size ?? component.data.byteLength,
      })),
    };

    const destination = join(temp('hostile'), 'hostile.tgz');

    await writeArtifactArchive({
      destination,
      header: header as never,
      payload: components.map((component) => ({ data: component.data })),
    });

    return destination;
  }

  it.each([
    '../../evil',
    '/etc/passwd',
    'graph/../../evil',
    '..',
    'GRAPH',
    'code-search-cache',
    'symlink',
  ])('rejects the hostile component name %s', async (name) => {
    const path = await hostileArchive([{ name, data: new Uint8Array([1, 2, 3]) }]);

    await expect(readArtifactArchive({ source: path })).rejects.toBeInstanceOf(ArtifactError);
  });

  it('rejects duplicate component names', async () => {
    const path = await hostileArchive([
      { name: 'graph', data: new Uint8Array([1]) },
      { name: 'graph', data: new Uint8Array([2]) },
    ]);

    await expect(readArtifactArchive({ source: path })).rejects.toMatchObject({
      code: 'ARTIFACT_COMPONENT_INVALID',
    });
  });

  it('rejects an oversized declared component before reading its payload', async () => {
    const path = await hostileArchive([
      { name: 'graph', size: ARTIFACT_LIMITS.maxComponentBytes + 1, data: new Uint8Array([1]) },
    ]);

    await expect(readArtifactArchive({ source: path })).rejects.toMatchObject({
      code: 'ARTIFACT_COMPONENT_TOO_LARGE',
    });
  });

  it('rejects an artifact declaring more components than allowed', async () => {
    const path = await hostileArchive(
      Array.from({ length: ARTIFACT_LIMITS.maxComponents + 5 }, (_, index) => ({
        name: 'graph',
        data: new Uint8Array([index % 256]),
      }))
    );

    await expect(readArtifactArchive({ source: path })).rejects.toMatchObject({
      code: 'ARTIFACT_MANIFEST_INVALID',
    });
  });

  it('enforces the decompression budget before extracting payload', async () => {
    const harness = createHarness();
    await harness.seed(SOURCE_V1);

    const exported = await buildArtifact(harness.a.storage, harness.a.context);

    await expect(
      readArtifactArchive({ source: exported.artifactPath, limits: { maxExtractedBytes: 64 } })
    ).rejects.toMatchObject({ code: 'ARTIFACT_DECOMPRESSION_LIMIT' });
  });

  it('enforces the compressed size budget', async () => {
    const harness = createHarness();
    await harness.seed(SOURCE_V1);

    const exported = await buildArtifact(harness.a.storage, harness.a.context);

    await expect(
      readArtifactArchive({ source: exported.artifactPath, limits: { maxArtifactBytes: 8 } })
    ).rejects.toMatchObject({ code: 'ARTIFACT_TOO_LARGE' });
  });

  it('rejects an artifact whose magic header is wrong', async () => {
    const path = join(temp('magic'), 'bad.tgz');

    const { gzipSync } = await import('node:zlib');

    writeFileSync(path, gzipSync(Buffer.from('XXXX-not-an-artifact')));

    await expect(readArtifactArchive({ source: path })).rejects.toMatchObject({
      code: 'ARTIFACT_MANIFEST_INVALID',
    });
  });

  it('never derives a write target outside the project staging root', async () => {
    const { artifactStagingRoot, artifactStagingFile, isInside } =
      await import('../../src/code-intelligence/artifact/staging.js');

    const staging = artifactStagingRoot(temp('staging'));

    expect(isInside(staging, artifactStagingFile(staging, `gen-${'a'.repeat(32)}`))).toBe(true);
    expect(isInside(staging, join(staging, '../../../../etc/passwd'))).toBe(false);

    /* Component keys are fixed by the table and always project-scoped. */
    for (const spec of ARTIFACT_COMPONENT_SPECS) {
      const key = artifactComponentKey(PROJECT_ID, spec.name);
      expect(key.startsWith(`projects/${PROJECT_ID}/`)).toBe(true);
      expect(key).not.toContain('..');
    }
  });
});

/* ------------------------------------------------------------------ *
 * Atomicity
 * ------------------------------------------------------------------ */

describe('Phase 76 — atomicity', () => {
  it('keeps the previous local graph when a later hydration fails', async () => {
    const harness = createHarness();
    await harness.seed(SOURCE_V1);
    writeSource(harness.b.rootPath, SOURCE_V1);

    await harness.publish();
    await hydrateB(harness);

    const before = await harness.b.storage.get(harness.b.physical(harness.b.logical('graph')));

    await harness.seed(SOURCE_V2);
    writeSource(harness.b.rootPath, SOURCE_V2);

    const second = await harness.publish();

    const store = new CodeIntelligenceArtifactStore(harness.a.storage, PROJECT_ID);

    const bytes = new Uint8Array((await store.getArtifactBytes(second.generation))!);

    bytes[10] = (bytes[10]! + 7) % 256;

    await harness.putLocal(
      `projects/${PROJECT_ID}/graph/artifacts/generations/${second.generation}/artifact.tgz`,
      bytes
    );

    await expect(hydrateB(harness)).rejects.toBeInstanceOf(ArtifactError);

    /* G1 is still current and queryable. */
    const after = await harness.b.storage.get(harness.b.physical(harness.b.logical('graph')));

    expect(Buffer.from(after!).equals(Buffer.from(before!))).toBe(true);

    const local = (await new PersistentCodeGraphStore(harness.b.storage).load(PROJECT_ID))!;

    const graph = new CodeGraphStore();

    graph.import(local.symbols, local.edges);

    const result = await runQuery({
      source: 'MATCH (f:Function) RETURN f.name LIMIT 10',
      scope: 'project',
      graph: new ProjectGraphAdapter(graph, 'gen', PROJECT_ID),
    });

    expect(result.rowCount).toBeGreaterThan(0);
  });

  it('writes no artifact component on a dry run', async () => {
    const harness = createHarness();
    await harness.seed(SOURCE_V1);
    writeSource(harness.b.rootPath, SOURCE_V1);

    await harness.publish();

    const before = await harness.snapshotKeys();

    const preview = await hydrateArtifact(harness.b.storage, harness.b.context, { dryRun: true });

    expect(preview.components.length).toBeGreaterThan(0);

    const after = await harness.snapshotKeys();

    /* Only the project registration manifest may have appeared. */
    for (const key of after.keys()) {
      if (before.has(key)) {
        continue;
      }
      expect(key.endsWith('/project.json')).toBe(true);
    }
  });

  it('leaves the remote current pointer on the old generation when a publish fails', async () => {
    const harness = createHarness();
    await harness.seed(SOURCE_V1);

    const first = await harness.publish();

    await harness.seed(SOURCE_V2);

    await expect(harness.publish({ limits: { maxArtifactBytes: 8 } })).rejects.toBeInstanceOf(
      ArtifactError
    );

    const store = new CodeIntelligenceArtifactStore(harness.a.storage, PROJECT_ID);

    expect((await store.getCurrent())?.generation).toBe(first.generation);

    expect((await store.verifyGeneration(first.generation)).manifest.generation).toBe(
      first.generation
    );
  });
});

/* ------------------------------------------------------------------ *
 * Retention / GC
 * ------------------------------------------------------------------ */

describe('Phase 76 — retention and GC', () => {
  async function threeGenerations(harness: Harness): Promise<string[]> {
    const generations: string[] = [];

    const sources = [
      SOURCE_V1,
      { ...SOURCE_V1, 'src/a.ts': 'export const a = 1;\n' },
      { ...SOURCE_V1, 'src/b.ts': 'export const b = 2;\n' },
    ];

    for (const [index, source] of sources.entries()) {
      await harness.seed(source);

      const published = await harness.publish({
        createdAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
        prune: false,
      });

      generations.push(published.generation);
    }

    return generations;
  }

  it('keeps the current generation and the configured number of previous ones', async () => {
    const harness = createHarness();

    const generations = await threeGenerations(harness);

    expect(new Set(generations).size).toBe(3);

    const store = new CodeIntelligenceArtifactStore(harness.a.storage, PROJECT_ID);

    const removed = await applyArtifactRetention(store, { keep: 1 });

    expect(removed).toHaveLength(1);

    const remaining = await store.listGenerations();

    expect(remaining).toHaveLength(2);
    expect(remaining).toContain((await store.getCurrent())!.generation);
  });

  it('never deletes the generation referenced by the current pointer', async () => {
    const harness = createHarness();

    await threeGenerations(harness);

    const store = new CodeIntelligenceArtifactStore(harness.a.storage, PROJECT_ID);

    const current = (await store.getCurrent())!.generation;

    await applyArtifactRetention(store, { keep: 0 });

    expect(await store.getGenerationManifest(current)).not.toBeNull();
  });

  it('supports a dry run that deletes nothing', async () => {
    const harness = createHarness();

    await threeGenerations(harness);

    const store = new CodeIntelligenceArtifactStore(harness.a.storage, PROJECT_ID);

    const before = await store.listGenerations();

    const removed = await applyArtifactRetention(store, { keep: 0, dryRun: true });

    expect(removed.length).toBeGreaterThan(0);
    expect(await store.listGenerations()).toEqual(before);
  });

  it('touches no authoritative data during GC', async () => {
    const harness = createHarness();

    await threeGenerations(harness);

    const store = new CodeIntelligenceArtifactStore(harness.a.storage, PROJECT_ID);

    await applyArtifactRetention(store, { keep: 0 });

    for (const component of ['graph', 'code-manifest', 'coverage', 'resolution'] as const) {
      expect(await harness.a.storage.exists(harness.a.physical(harness.a.logical(component)))).toBe(
        true
      );
    }
  });
});

/* ------------------------------------------------------------------ *
 * Authority non-interference
 * ------------------------------------------------------------------ */

describe('Phase 76 — authority non-interference', () => {
  it('never creates, overwrites, deletes or supersedes ADR state', async () => {
    const harness = createHarness();
    await harness.seed(SOURCE_V1);
    writeSource(harness.b.rootPath, SOURCE_V1);

    const service = new ArchitectureDecisionService(
      new AdrStore(harness.b.storage, harness.b.projectManifest)
    );

    await service.initialize();

    const first = await service.create({
      title: 'Fleet graph stays an overlay',
      decision: 'Never merge project graphs.',
      status: 'accepted',
    });

    const second = await service.create({
      title: 'Plugin storage providers',
      decision: 'Keep providers pluggable.',
      status: 'accepted',
    });

    await service.supersede(first.record.humanId, second.record.humanId);

    const adrKey = `projects/${PROJECT_ID}/knowledge/adr/state.v1.json`;

    const before = await harness.b.storage.getText(adrKey);

    await harness.publish();
    await hydrateB(harness);

    const after = await harness.b.storage.getText(adrKey);

    expect(after).toBe(before);

    const reloaded = await new ArchitectureDecisionService(
      new AdrStore(harness.b.storage, harness.b.projectManifest)
    ).list({ status: 'all' });

    expect(reloaded.records).toHaveLength(2);
    expect(reloaded.records.filter((record) => record.supersededBy).length).toBe(1);

    const superseded = reloaded.records.find((record) => record.humanId === first.record.humanId);

    expect(superseded?.status).toBe('superseded');
    expect(superseded?.supersededBy).toBe(second.record.humanId);
  });

  it('never touches memory or task authority state and only writes component keys', async () => {
    const harness = createHarness();
    await harness.seed(SOURCE_V1);
    writeSource(harness.b.rootPath, SOURCE_V1);

    await new MemoryStore(harness.b.storage).save(PROJECT_ID, [
      {
        id: 'mem-1',
        projectId: PROJECT_ID,
        type: 'decision',
        content: 'Memory authority must survive artifact hydration.',
        createdAt: new Date(0).toISOString(),
      } as never,
    ]);

    const taskDirectory = join(harness.b.rootPath, '.toolnet', 'tasks');

    mkdirSync(taskDirectory, { recursive: true });

    writeFileSync(join(taskDirectory, 'events.jsonl'), '{"op":"create","id":"t1"}\n');

    const memoryKey = harness.b.physical(`projects/${PROJECT_ID}/memories/current.json`);

    const memoryBefore = await harness.b.storage.getText(memoryKey);

    const taskBefore = readFileSync(join(taskDirectory, 'events.jsonl'), 'utf8');

    /* Publish and transport first, so the baseline already contains the cache. */
    await harness.publish();

    const before = await harness.snapshotKeys();

    await hydrateB(harness);

    expect(await harness.b.storage.getText(memoryKey)).toBe(memoryBefore);
    expect(readFileSync(join(taskDirectory, 'events.jsonl'), 'utf8')).toBe(taskBefore);

    const allowed = new Set(
      ARTIFACT_COMPONENT_SPECS.filter((spec) => spec.portable).map((spec) =>
        harness.b.physical(harness.b.logical(spec.name))
      )
    );

    const after = await harness.snapshotKeys();

    for (const key of after.keys()) {
      if (before.has(key)) {
        continue;
      }

      expect(allowed.has(key) || key.endsWith('/project.json')).toBe(true);
    }
  });
});

/* ------------------------------------------------------------------ *
 * Fleet integration
 * ------------------------------------------------------------------ */

describe('Phase 76 — Fleet generation invalidation', () => {
  it('re-pins the Fleet registry to the hydrated export generation', async () => {
    const harness = createHarness();
    const seeded = await harness.seed(SOURCE_V1);
    writeSource(harness.b.rootPath, SOURCE_V1);

    /* Give machine A a real Fleet export so the artifact carries one. */
    const indexed = await new RepositoryIndexer().index(PROJECT_ID, harness.a.rootPath, {});

    const crossService = await new CrossServiceEngine({ graph: seeded.graph }).analyze({
      projectId: PROJECT_ID,
      rootPath: harness.a.rootPath,
      files: indexed.acceptedFiles,
      projectName: 'shared-repo',
      projectRemote: IDENTITY,
    });

    await new PersistentFleetExportStore(harness.a.storage).save(crossService.export);

    const exportGeneration = crossService.export.generation;

    await harness.publish();

    /* Without a Fleet handle the registry is never re-pinned by hydration. */
    const withoutFleet = await hydrateArtifact(harness.b.storage, harness.b.context, {});

    expect(withoutFleet.fleetRepinned).toBe(false);

    const repinned = await hydrateB(harness, { rootStorage: harness.remote() });

    expect(repinned.fleetRepinned).toBe(true);

    const registry = new FleetProjectRegistry(harness.remote());

    const projects = await registry.discover();

    const entry = projects.find((project) => project.projectId === PROJECT_ID);

    /*
     * The pin is the export generation, exactly as a normal index records it —
     * not the artifact generation, which would fabricate a stale participant.
     */
    expect(entry?.pinnedGeneration).toBe(exportGeneration);
    expect(entry?.export?.generation).toBe(exportGeneration);

    const built = new FleetBuilder().build({ projects });

    expect(built.staleProjects).not.toContain(PROJECT_ID);
    expect(built.snapshot.projects.map((project) => project.projectId)).toContain(PROJECT_ID);
  });

  it('reports a project as stale when its pin no longer matches its export', async () => {
    const harness = createHarness();
    const seeded = await harness.seed(SOURCE_V1);

    const indexed = await new RepositoryIndexer().index(PROJECT_ID, harness.a.rootPath, {});

    const crossService = await new CrossServiceEngine({ graph: seeded.graph }).analyze({
      projectId: PROJECT_ID,
      rootPath: harness.a.rootPath,
      files: indexed.acceptedFiles,
      projectName: 'shared-repo',
      projectRemote: IDENTITY,
    });

    await new PersistentFleetExportStore(harness.a.storage).save(crossService.export);

    const registry = new FleetProjectRegistry(harness.remote());

    await registry.register({
      projectId: PROJECT_ID,
      name: 'shared-repo',
      remote: IDENTITY,
      rootPath: harness.a.rootPath,
      pinnedGeneration: 'generation-that-no-longer-exists',
    });

    const built = new FleetBuilder().build({ projects: await registry.discover() });

    expect(built.staleProjects).toContain(PROJECT_ID);
  });
});

/* ------------------------------------------------------------------ *
 * Determinism
 * ------------------------------------------------------------------ */

describe('Phase 76 — determinism', () => {
  it(
    'derives the same generation and component set for the same content on independent machines',
    { timeout: 30_000 },
    async () => {
      const first = createHarness();
      await first.seed(SOURCE_V1);

      const second = createHarness();

      /* Independent storage root, independent root path, same project identity. */
      await second.seed(SOURCE_V1);

      const exportedFirst = await buildArtifact(first.a.storage, first.a.context);
      const exportedSecond = await buildArtifact(second.a.storage, second.a.context);

      expect(second.a.rootPath).not.toBe(first.a.rootPath);
      expect(exportedSecond.generation).toBe(exportedFirst.generation);
      expect(exportedSecond.manifest.source.manifestHash).toBe(
        exportedFirst.manifest.source.manifestHash
      );

      /*
       * Semantic equality is required; byte equality is not. Each snapshot
       * carries its own indexing timestamps, so the payload legitimately
       * differs while the semantic artifact identity does not.
       */
      expect(
        exportedSecond.manifest.components.map((item) => [item.name, item.schemaVersion])
      ).toEqual(exportedFirst.manifest.components.map((item) => [item.name, item.schemaVersion]));

      expect(exportedSecond.manifest.fingerprints).toEqual(exportedFirst.manifest.fingerprints);
    }
  );

  it('derives the same status across repeated calls', async () => {
    const harness = createHarness();
    await harness.seed(SOURCE_V1);

    await harness.publish();

    const first = await artifactStatus(harness.a.storage, harness.a.context, {
      verifySource: true,
    });

    const second = await artifactStatus(harness.a.storage, harness.a.context, {
      verifySource: true,
    });

    expect(second.localGeneration).toBe(first.localGeneration);
    expect(second.remoteGeneration).toBe(first.remoteGeneration);
    expect(second.compatibility).toBe(first.compatibility);
    expect(second.sourceMatch).toBe(first.sourceMatch);
    expect(second.freshness).toBe(first.freshness);
    expect(second.components).toEqual(first.components);
    expect(second.nonPortableComponents).toEqual(first.nonPortableComponents);
  });
});

/* ------------------------------------------------------------------ *
 * MCP surface
 * ------------------------------------------------------------------ */

describe('Phase 76 — MCP surface', () => {
  it('reports status without dumping the graph', async () => {
    const harness = createHarness();
    await harness.seed(SOURCE_V1);

    const result = await manageGraphArtifact(mcpContext(harness.a, harness.remote()), {
      action: 'status',
    });

    expect(result.ok).toBe(true);

    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain('"symbols"');
    expect(serialized.length).toBeLessThan(20_000);
  });

  it('publishes, lists and pulls through the tool', async () => {
    const harness = createHarness();
    await harness.seed(SOURCE_V1);
    writeSource(harness.b.rootPath, SOURCE_V1);

    const published = (await manageGraphArtifact(mcpContext(harness.a, harness.remote()), {
      action: 'publish',
    })) as unknown as { ok: true; generation: string; idempotent: boolean };

    expect(published.ok).toBe(true);
    expect(published.idempotent).toBe(false);

    /* Transport the published generation to the second machine. */
    await harness.sync();

    const listed = (await manageGraphArtifact(mcpContext(harness.a, harness.remote()), {
      action: 'list',
      includeComponents: true,
    })) as unknown as { ok: true; total: number };

    expect(listed.ok).toBe(true);
    expect(listed.total).toBe(1);

    const pulled = (await manageGraphArtifact(mcpContext(harness.b, harness.remote()), {
      action: 'pull',
    })) as unknown as { ok: true; generation: string; fleetRepinned: boolean };

    expect(pulled.ok).toBe(true);
    expect(pulled.generation).toBe(published.generation);
    expect(pulled.fleetRepinned).toBe(true);
  });

  it('returns a structured, non-fatal failure when the source does not match', async () => {
    const harness = createHarness();
    await harness.seed(SOURCE_V1);

    await manageGraphArtifact(mcpContext(harness.a, harness.remote()), { action: 'publish' });

    await harness.sync();

    /* Machine B has no local source at all. */
    const pulled = (await manageGraphArtifact(mcpContext(harness.b, harness.remote()), {
      action: 'pull',
    })) as unknown as ToolFailure;

    expect(pulled.ok).toBe(false);
    expect(pulled.error.code).toBe('ARTIFACT_SOURCE_MISMATCH');
    expect(pulled.reasonCodes).toContain('ARTIFACT_SOURCE_MISMATCH');
  });

  it('verifies without writing and prunes only eligible generations', async () => {
    const harness = createHarness();
    await harness.seed(SOURCE_V1);
    writeSource(harness.b.rootPath, SOURCE_V1);

    await manageGraphArtifact(mcpContext(harness.a, harness.remote()), { action: 'publish' });

    const verified = (await manageGraphArtifact(mcpContext(harness.a, harness.remote()), {
      action: 'verify',
    })) as unknown as { ok: true; compatible: boolean };

    expect(verified.ok).toBe(true);
    expect(verified.compatible).toBe(true);

    const pruned = (await manageGraphArtifact(mcpContext(harness.a, harness.remote()), {
      action: 'prune',
      retain: 0,
      dryRun: true,
    })) as unknown as { ok: true; removed: string[] };

    expect(pruned.ok).toBe(true);
    expect(pruned.removed).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * Packaged runtime certification
 * ------------------------------------------------------------------ */

const repoRoot = resolve(import.meta.dirname, '..', '..');

const parsedPackage = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')) as {
  files?: string[];
  version: string;
};

describe('Phase 76 — packaged runtime', () => {
  const bundlePath = join(repoRoot, 'bundle', 'mcp.js');

  it('ships the artifact runtime inside the published package', () => {
    expect(existsSync(bundlePath)).toBe(true);

    const bundle = readFileSync(bundlePath, 'utf8');

    for (const marker of [
      'manage_graph_artifact',
      'ARTIFACT_GENERATION_CONFLICT',
      'ARTIFACT_SOURCE_MISMATCH',
      'ARTIFACT_COMPONENT_HASH_MISMATCH',
      'ARTIFACT_DECOMPRESSION_LIMIT',
      'code-search-cache',
      'artifact.tgz',
    ]) {
      expect(bundle).toContain(marker);
    }

    expect(parsedPackage.files).toContain('bundle');

    /* The marker is a phase gate, never a package version. */
    expect(parsedPackage.version).toBeDefined();
  });

  it('exposes manage_graph_artifact over MCP from the packaged bundle', async () => {
    const { spawn } = await import('node:child_process');

    const cwd = mkdtempSync(join(tmpdir(), 'toolnet-phase76-mcp-'));

    const requests = `${[
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'phase76-certify', version: '1.0.0' },
        },
      }),
      JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
      JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }),
    ].join('\n')}\n`;

    const child = spawn(process.execPath, [bundlePath], { cwd, stdio: ['pipe', 'pipe', 'pipe'] });

    child.stderr.resume();

    const tools = await new Promise<string[]>((resolvePromise, rejectPromise) => {
      let buffer = '';
      let settled = false;
      let timer: NodeJS.Timeout | undefined;

      const finish = (callback: () => void) => {
        if (settled) return;
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

    expect(tools).toContain('manage_graph_artifact');
    expect(tools).toContain('query_graph');
    expect(tools).toContain('get_graph_schema');
    expect(tools).toContain('manage_adr');

    rmSync(cwd, { recursive: true, force: true });
  });

  it('emits the phase marker only when the whole artifact contract holds', async () => {
    const harness = createHarness();
    await harness.seed(SOURCE_V1);
    writeSource(harness.b.rootPath, SOURCE_V1);

    const exported = await buildArtifact(harness.a.storage, harness.a.context);

    const published = await harness.publish();

    const hydrated = await hydrateB(harness, { rootStorage: harness.remote() });

    const status = await artifactStatus(harness.b.storage, harness.b.context, {
      verifySource: true,
    });

    const store = new CodeIntelligenceArtifactStore(harness.a.storage, PROJECT_ID);

    await store.verifyGeneration(published.generation);

    const manifest: CodeIntelligenceArtifactManifest = exported.manifest;

    const names = manifest.components.map((component) => component.name);

    const conditions = [
      names.includes('graph'),
      names.includes('coverage'),
      names.includes('resolution'),
      names.includes('code-manifest'),
      manifest.nonPortableComponents.length > 0,
      manifest.source.fileCount > 0,
      manifest.integrity.artifactHash === published.artifactSha256,
      published.generation === exported.generation,
      hydrated.generation === published.generation,
      hydrated.fleetRepinned,
      status.compatibility === 'compatible',
      status.sourceMatch === 'exact',
      status.freshness === 'fresh',
    ];

    expect(conditions.every(Boolean)).toBe(true);

    console.log(PHASE76_MARKER);

    expect(PHASE76_MARKER).toBe('PHASE76_SHARED_GRAPH_ARTIFACT=PASS');
  });
});
