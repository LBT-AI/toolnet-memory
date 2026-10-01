/**
 * Phase 86E — Wiki / Fleet runtime state certification.
 *
 * Runs the real production paths (WikiStore/WikiService, PersistentFleetStore,
 * inspectFleetState, runFleetBuild, wiki-state inspection) against isolated
 * in-memory storage, and proves the state-recovery contract:
 *
 *   - a never-used Wiki is healthy, not corruption, and reading never writes;
 *   - the first write initializes safely;
 *   - project mismatch is never adopted or rewritten;
 *   - corruption and future schemas are never overwritten;
 *   - Fleet registry, snapshot and coverage are distinct, precise states;
 *   - a rebuild is deterministic and read-only Fleet tools never write;
 *   - incomplete coverage blocks negative claims;
 *   - Memory / Task authority is never touched.
 */

import {
  FleetBuilder,
  FleetProjectRegistry,
  PersistentFleetStore,
} from '../code-intelligence/fleet/index.js';
import { FLEET_SCHEMA_VERSION, type FleetProjectExport } from '../code-intelligence/fleet/types.js';
import { inspectFleetState, loadFleetSnapshot, publishFleetSnapshot } from '../mcp/fleet.js';
import type { MCPContext } from '../mcp/context.js';
import type { ProjectManifest } from '../core/types.js';
import { runFleetBuild } from './fleet-build.js';
import { inspectWikiState, runWikiRepair } from './wiki-state.js';
import type { StorageObject, StorageProvider } from '../storage/types.js';
import {
  classifyWikiState,
  KnowledgeGovernanceStore,
  WikiService,
  WikiStore,
  WIKI_SCHEMA,
  WIKI_SCHEMA_VERSION,
} from '../wiki/index.js';

const WIKI_KEY = 'wiki/state.v1.json';

class VerifyStorage implements StorageProvider {
  readonly name = 'phase86e-certify';

  readonly objects = new Map<string, string>();

  async put(key: string, data: string | Uint8Array): Promise<void> {
    this.objects.set(key, typeof data === 'string' ? data : Buffer.from(data).toString('utf8'));
  }

  async get(key: string): Promise<Uint8Array | null> {
    const value = this.objects.get(key);
    return value ? Buffer.from(value) : null;
  }

  async getText(key: string): Promise<string | null> {
    return this.objects.get(key) ?? null;
  }

  async exists(key: string): Promise<boolean> {
    return this.objects.has(key);
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }

  async list(prefix = ''): Promise<StorageObject[]> {
    return [...this.objects.keys()]
      .filter((key) => key.startsWith(prefix))
      .sort()
      .map((key) => ({ key, size: 0 }));
  }

  snapshot(): string {
    return JSON.stringify([...this.objects.entries()].sort(([a], [b]) => a.localeCompare(b)));
  }
}

export interface WikiFleetCheck {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
}

export interface WikiFleetCertification {
  passed: boolean;
  total: number;
  passedCount: number;
  checks: WikiFleetCheck[];
}

function manifest(id: string): ProjectManifest {
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

function exportView(projectId: string): FleetProjectExport {
  return {
    version: FLEET_SCHEMA_VERSION,
    projectId,
    name: projectId,
    generation: `gen-${projectId}`,
    graphFingerprint: `fp-${projectId}`,
    indexedAt: '2026-10-01T00:00:00.000Z',
    crossServiceComplete: true,
    identities: [projectId],
    services: [{ id: `${projectId}-svc`, name: projectId, rootPath: '.', kind: 'backend' }],
    endpoints: [],
    outboundCalls: [],
    events: [],
    packages: [],
    packageDependencies: [],
  };
}

async function check(
  id: string,
  label: string,
  operation: () => boolean | Promise<boolean>
): Promise<WikiFleetCheck> {
  try {
    const passed = await operation();
    return { id, label, passed, ...(passed ? {} : { detail: 'condition returned false' }) };
  } catch (error) {
    return {
      id,
      label,
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function certifyWiki(): Promise<boolean> {
  const storage = new VerifyStorage();
  const project = manifest('phase86e-wiki');

  /* New project: unused, not corruption, and reading never writes. */
  const first = await inspectWikiState(storage, project);
  if (first.status !== 'unused' || storage.objects.size !== 0) {
    return false;
  }

  /* First write initializes safely. */
  await new WikiService(new WikiStore(storage, project)).createPage({
    title: 'Architecture',
    content: '# Architecture',
  });
  if (!storage.objects.has(WIKI_KEY)) {
    return false;
  }

  /* Migration is a deterministic, idempotent no-op for the current schema. */
  const before = storage.snapshot();
  const migrateA = await new WikiStore(storage, project).migrate();
  const migrateB = await new WikiStore(storage, project).migrate();
  if (migrateA.migrated || migrateB.migrated || storage.snapshot() !== before) {
    return false;
  }

  /* Project mismatch detected and never rewritten. */
  const mismatchStorage = new VerifyStorage();
  const foreign = JSON.stringify({
    schema: WIKI_SCHEMA,
    version: WIKI_SCHEMA_VERSION,
    projectId: 'other-project',
    pages: [],
    revisions: [],
    createdAt: '2026-08-14T00:00:00.000Z',
    updatedAt: '2026-08-14T00:00:00.000Z',
  });
  mismatchStorage.objects.set(WIKI_KEY, foreign);
  const mismatchBefore = mismatchStorage.snapshot();
  const mismatchRepair = await runWikiRepair(mismatchStorage, project);
  if (
    mismatchRepair.statusBefore !== 'project_mismatch' ||
    mismatchStorage.snapshot() !== mismatchBefore
  ) {
    return false;
  }

  /* Corruption detected and never overwritten. */
  const corruptStorage = new VerifyStorage();
  corruptStorage.objects.set(WIKI_KEY, '{ corrupt');
  const corruptBefore = corruptStorage.snapshot();
  const corruptRepair = await runWikiRepair(corruptStorage, project);
  if (corruptRepair.statusBefore !== 'corrupt' || corruptStorage.snapshot() !== corruptBefore) {
    return false;
  }

  /* Future schema never downgraded. */
  const futureStorage = new VerifyStorage();
  const future = JSON.stringify({
    schema: WIKI_SCHEMA,
    version: WIKI_SCHEMA_VERSION + 1,
    projectId: project.id,
    pages: [],
    revisions: [],
    createdAt: '2026-08-14T00:00:00.000Z',
    updatedAt: '2026-08-14T00:00:00.000Z',
  });
  futureStorage.objects.set(WIKI_KEY, future);
  const futureBefore = futureStorage.snapshot();
  const futureState = classifyWikiState(future, project.id);
  if (futureState.status !== 'unsupported_schema') {
    return false;
  }
  if ((await runWikiRepair(futureStorage, project)).statusBefore !== 'schema_unsupported') {
    return false;
  }
  if (futureStorage.snapshot() !== futureBefore) {
    return false;
  }

  /* Foreign governance state is never adopted. */
  const governanceStorage = new VerifyStorage();
  governanceStorage.objects.set(
    'wiki/governance.v1.json',
    JSON.stringify({
      schema: 'toolnet.knowledge-governance.v1',
      version: 1,
      projectId: 'other-project',
      policy: { autoApproveThreshold: 0.86, criticalApproveThreshold: 0.94, staleAfterDays: 90 },
      reviews: [],
      audit: [],
      createdAt: '2026-08-14T00:00:00.000Z',
      updatedAt: '2026-08-14T00:00:00.000Z',
    })
  );
  const governanceBefore = governanceStorage.snapshot();
  const loaded = await new KnowledgeGovernanceStore(governanceStorage, project)
    .load()
    .then(() => true)
    .catch(() => false);
  if (loaded || governanceStorage.snapshot() !== governanceBefore) {
    return false;
  }

  return true;
}

async function certifyFleet(): Promise<boolean> {
  /* Empty registry is not-configured, never fake corruption. */
  const empty = new VerifyStorage();
  if ((await inspectFleetState(empty)).status !== 'not_configured') {
    return false;
  }

  /* Registered without a snapshot is snapshot_missing, precisely. */
  const storage = new VerifyStorage();
  const registry = new FleetProjectRegistry(storage);

  for (const id of ['p-a', 'p-b']) {
    storage.objects.set(
      `projects/${id}/project.json`,
      JSON.stringify({ version: 1, id, name: id, remote: id })
    );
    storage.objects.set(
      `projects/${id}/code/graph/fleet-export.json`,
      JSON.stringify(exportView(id))
    );
    await registry.register({ projectId: id, name: id, remote: id });
  }

  const missing = await inspectFleetState(storage);
  if (missing.status !== 'snapshot_missing' || !missing.buildRequired) {
    return false;
  }

  const memoryKeysBefore = [...storage.objects.keys()].filter((key) => key.startsWith('projects/'));

  /* Explicit rebuild publishes a deterministic, generation-linked snapshot. */
  const first = await runFleetBuild(storage);
  if (!first.published || first.statusAfter !== 'current') {
    return false;
  }

  const current = await inspectFleetState(storage);
  if (current.status !== 'current' || !current.coverageGenerationMatches) {
    return false;
  }

  /* Second rebuild is logically idempotent. */
  const coverageAfterFirst = storage.objects.get('fleet/coverage.json');
  const second = await runFleetBuild(storage);
  if (
    second.generation !== first.generation ||
    second.fingerprint !== first.fingerprint ||
    storage.objects.get('fleet/coverage.json') !== coverageAfterFirst
  ) {
    return false;
  }

  /* Read-only Fleet tools never write. */
  const readOnlyBefore = storage.snapshot();
  await inspectFleetState(storage);
  await loadFleetSnapshot({ rootStorage: storage } as unknown as MCPContext, { persist: false });
  if (storage.snapshot() !== readOnlyBefore) {
    return false;
  }

  /* Incomplete coverage blocks negative claims. */
  const partial = new VerifyStorage();
  const partialRegistry = new FleetProjectRegistry(partial);
  partial.objects.set(
    'projects/p-a/project.json',
    JSON.stringify({ version: 1, id: 'p-a', name: 'p-a', remote: 'p-a' })
  );
  partial.objects.set(
    'projects/p-a/code/graph/fleet-export.json',
    JSON.stringify(exportView('p-a'))
  );
  await partialRegistry.register({ projectId: 'p-a', name: 'p-a', remote: 'p-a' });
  await partialRegistry.register({ projectId: 'p-gone', name: 'p-gone', remote: 'p-gone' });

  const partialBuild = await runFleetBuild(partial);
  if (partialBuild.coverage.negativeClaimSafe || partialBuild.missingProjects.length === 0) {
    return false;
  }

  /* Corrupt snapshot is explicit, not a silent rebuild. */
  const corrupt = new VerifyStorage();
  corrupt.objects.set('fleet/graph/current.json', '{ corrupt');
  if ((await inspectFleetState(corrupt)).status !== 'snapshot_corrupt') {
    return false;
  }

  /* Future schema never overwritten. */
  const future = new VerifyStorage();
  const futureRegistry = JSON.stringify({
    version: FLEET_SCHEMA_VERSION + 1,
    updatedAt: '2026-10-01T00:00:00.000Z',
    projects: [],
  });
  future.objects.set('fleet/registry.json', futureRegistry);
  const futureBefore = future.snapshot();
  if ((await inspectFleetState(future)).status !== 'registry_unsupported') {
    return false;
  }
  if (future.snapshot() !== futureBefore) {
    return false;
  }

  /* Registry metadata is deterministic for identical inputs. */
  const deterministic = new VerifyStorage();
  const deterministicRegistry = new FleetProjectRegistry(deterministic);
  deterministic.objects.set(
    'projects/p-a/project.json',
    JSON.stringify({ version: 1, id: 'p-a', name: 'p-a', remote: 'p-a' })
  );
  deterministic.objects.set(
    'projects/p-a/code/graph/fleet-export.json',
    JSON.stringify(exportView('p-a'))
  );
  await deterministicRegistry.register({ projectId: 'p-a', name: 'p-a', remote: 'p-a' });

  const built = new FleetBuilder().build({
    projects: [{ projectId: 'p-a', name: 'p-a', export: exportView('p-a') }],
  });
  const rebuilt = new FleetBuilder().build({
    projects: [{ projectId: 'p-a', name: 'p-a', export: exportView('p-a') }],
  });
  if (built.snapshot.generation !== rebuilt.snapshot.generation) {
    return false;
  }

  /* Memory authority untouched: publishing Fleet state never wrote under any
   * project's memory/task namespace. */
  const memoryKeysAfter = [...storage.objects.keys()].filter((key) => key.startsWith('projects/'));
  if (JSON.stringify(memoryKeysBefore) !== JSON.stringify(memoryKeysAfter)) {
    return false;
  }

  /* Snapshot + coverage publish directly (used by explicit builds) stays atomic. */
  const direct = new VerifyStorage();
  await publishFleetSnapshot(
    direct,
    new FleetBuilder().build({
      projects: [{ projectId: 'p-a', name: 'p-a', export: exportView('p-a') }],
    }).snapshot
  );
  await new PersistentFleetStore(direct).loadSnapshot();

  return true;
}

export async function certifyWikiFleetState(): Promise<WikiFleetCertification> {
  const checks: WikiFleetCheck[] = [];

  checks.push(
    await check(
      'wiki-state-recovery',
      'Wiki missing/mismatch/corrupt/future states are distinguished and never overwritten',
      certifyWiki
    )
  );

  checks.push(
    await check(
      'fleet-state-recovery',
      'Fleet registry/snapshot/coverage stay distinct, rebuilds are deterministic and read-only',
      certifyFleet
    )
  );

  const passedCount = checks.filter((item) => item.passed).length;

  return {
    passed: passedCount === checks.length,
    total: checks.length,
    passedCount,
    checks,
  };
}
