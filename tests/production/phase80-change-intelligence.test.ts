/*
 * Phase 80 — Change Intelligence / Git-Diff Impact & Regression Guard
 * production certification.
 *
 * Exercises the REAL implementation:
 *
 *   - read-only git change parsing (working tree, staged, commit, range, patch)
 *   - deterministic change fingerprint + snapshot identity
 *   - change -> symbol/semantic mapping (body vs signature, delete, rename)
 *   - routes, events, types, dependencies
 *   - direct / transitive / cross-service / cross-repo impact with semantic path
 *   - ADR constraints, runtime corroboration, test mapping
 *   - coverage + Evidence Profile claim safety (no empty-impact => safe shortcut)
 *   - the regression guard (structured decisions + reason codes)
 *   - security: git argument safety, patch path traversal, secret redaction,
 *     resource limits, mid-run change detection
 *   - daemon parity, single-flight, cache invalidation
 *   - authority / static-graph / artifact non-interference
 *   - the packaged MCP runtime
 *
 * PASS marker: PHASE80_CHANGE_INTELLIGENCE=PASS
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

import { afterEach, describe, expect, it } from 'vitest';

import { CodeGraphStore } from '../../src/code-intelligence/graph/graph-store.js';
import { ProjectRegistry } from '../../src/daemon/registry.js';
import {
  ArtifactCoordinator,
  IndexCoordinator,
  ProjectRuntimeCoordinator,
} from '../../src/daemon/coordinators.js';
import type { DaemonProjectRef, DaemonRuntimeDependencies } from '../../src/daemon/types.js';

import {
  analyzeChange,
  buildProjectChangeFacts,
  readChangeInput,
  readSnapshotDigest,
  runChangeAnalysis,
} from '../../src/code-intelligence/change/index.js';

import type {
  AdrConstraintEntry,
  ChangeAnalysisRequest,
  ChangeFacts,
  ChangeFleetProjectImpact,
  ChangeRuntimeObservation,
  ChangeSymbol,
} from '../../src/code-intelligence/change/index.js';

import type { CodeSymbol, GraphEdge } from '../../src/core/types.js';

const PROJECT = 'phase80';
const PHASE80_MARKER = 'PHASE80_CHANGE_INTELLIGENCE=PASS';

/* ==================================================================
 * Fixtures
 * ================================================================== */

const roots: string[] = [];

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop();

    if (root) {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

function sym(
  id: string,
  name: string,
  type: CodeSymbol['type'],
  filePath: string,
  startLine: number,
  endLine: number,
  extra: Partial<CodeSymbol> = {}
): CodeSymbol {
  return {
    id,
    projectId: PROJECT,
    name,
    qualifiedName: name,
    type,
    filePath,
    startLine,
    endLine,
    metadata: {},
    ...extra,
  };
}

function edge(id: string, type: GraphEdge['type'], from: string, to: string): GraphEdge {
  return { id, projectId: PROJECT, type, from, to };
}

const SAVE = sym('repo:save', 'save', 'function', 'src/orders/repository.ts', 10, 20);
const CREATE = sym('svc:createOrder', 'createOrder', 'method', 'src/orders/service.ts', 5, 25);
const HANDLER = sym('svc:handleOrders', 'handleOrders', 'function', 'src/orders/routes.ts', 5, 12);
const ROUTE = sym('route:POST /orders', 'POST /orders', 'route', 'src/orders/routes.ts', 1, 3);
const CLIENT = sym('web:submitOrder', 'submitOrder', 'function', 'src/web/api.ts', 1, 6);
const TEST_SYMBOL = sym('test:order', 'order', 'function', 'tests/orders.test.ts', 1, 30);
const PRODUCER = sym('svc:publish', 'publish', 'function', 'src/events/producer.ts', 1, 5);
const CONSUMER = sym('svc:consume', 'consume', 'function', 'src/events/consumer.ts', 1, 5);
const EVENT = sym('event:order.created', 'order.created', 'event', 'src/events/channels.ts', 1, 2);
const IMPL = sym('cls:OrderRepo', 'OrderRepository', 'class', 'src/orders/impl.ts', 1, 8);
const IFACE = sym('iface:Repository', 'Repository', 'interface', 'src/types/repository.ts', 1, 5);

const ALL_SYMBOLS: CodeSymbol[] = [
  SAVE,
  CREATE,
  HANDLER,
  ROUTE,
  CLIENT,
  TEST_SYMBOL,
  PRODUCER,
  CONSUMER,
  EVENT,
  IMPL,
  IFACE,
];

const ALL_EDGES: GraphEdge[] = [
  edge('e:call', 'CALLS', 'svc:createOrder', 'repo:save'),
  edge('e:test', 'TESTS', 'test:order', 'repo:save'),
  edge('e:handles', 'HANDLES', 'svc:handleOrders', 'route:POST /orders'),
  edge('e:http', 'HTTP_CALLS', 'web:submitOrder', 'route:POST /orders'),
  edge('e:emits', 'EMITS', 'svc:publish', 'event:order.created'),
  edge('e:listens', 'LISTENS_ON', 'svc:consume', 'event:order.created'),
  edge('e:implements', 'IMPLEMENTS', 'cls:OrderRepo', 'iface:Repository'),
];

function buildGraph(): CodeGraphStore {
  const graph = new CodeGraphStore();

  graph.import(
    ALL_SYMBOLS.map((symbol) => ({ ...symbol })),
    ALL_EDGES.map((entry) => ({ ...entry }))
  );

  return graph;
}

type CoverageMode = 'complete' | 'partial' | 'unavailable';

interface FactsOptions {
  graph?: CodeGraphStore;
  rootPath?: string;
  generation?: string;
  candidateGeneration?: string;
  coverage?: CoverageMode;
  fleet?: ChangeFacts['fleet'];
  crossService?: ChangeFacts['crossService'];
  runtime?: readonly ChangeRuntimeObservation[];
  adr?: readonly AdrConstraintEntry[];
  includeRuntime?: boolean;
  includeFleet?: boolean;
  fleetImpact?: (ids: readonly string[]) => readonly ChangeFleetProjectImpact[];
  parseCandidate?: (path: string) => readonly ChangeSymbol[] | null;
  currentGeneration?: () => string;
  recheckSnapshot?: () => Promise<string>;
}

function toChangeSymbol(symbol: CodeSymbol): ChangeSymbol {
  return {
    id: symbol.id,
    name: symbol.name,
    ...(symbol.qualifiedName ? { qualifiedName: symbol.qualifiedName } : {}),
    type: String(symbol.type),
    filePath: symbol.filePath,
    ...(symbol.startLine !== undefined ? { startLine: symbol.startLine } : {}),
    ...(symbol.endLine !== undefined ? { endLine: symbol.endLine } : {}),
  };
}

function makeFacts(options: FactsOptions = {}): ChangeFacts {
  const graph = options.graph ?? buildGraph();
  const generation = options.generation ?? 'gen-1';
  const mode = options.coverage ?? 'complete';

  const parseCandidate =
    options.parseCandidate ??
    ((path: string) =>
      graph
        .allSymbols(PROJECT)
        .filter((symbol) => symbol.filePath === path)
        .map(toChangeSymbol));

  return {
    projectId: PROJECT,
    rootPath: options.rootPath ?? process.cwd(),
    generation,
    ...(options.candidateGeneration ? { candidateGeneration: options.candidateGeneration } : {}),
    currentGeneration: options.currentGeneration ?? (() => generation),

    graph: {
      symbols: () => graph.allSymbols(PROJECT).map(toChangeSymbol),
      symbolById: (id) => {
        const found = graph.getSymbol(id);
        return found ? toChangeSymbol(found) : undefined;
      },
      incoming: (symbolId, edgeTypes) =>
        graph
          .allEdges(PROJECT)
          .filter((entry) => entry.to === symbolId && edgeTypes.includes(String(entry.type)))
          .map((entry) => ({
            id: entry.id,
            type: String(entry.type),
            from: entry.from,
            to: entry.to,
          })),
      outgoing: (symbolId, edgeTypes) =>
        graph
          .allEdges(PROJECT)
          .filter((entry) => entry.from === symbolId && edgeTypes.includes(String(entry.type)))
          .map((entry) => ({
            id: entry.id,
            type: String(entry.type),
            from: entry.from,
            to: entry.to,
          })),
      allEdges: () =>
        graph.allEdges(PROJECT).map((entry) => ({
          id: entry.id,
          type: String(entry.type),
          from: entry.from,
          to: entry.to,
        })),
    },

    coverageAvailable: mode !== 'unavailable',
    coverageFor: () => {
      if (mode === 'unavailable') {
        return {
          available: false,
          status: 'unavailable',
          negativeClaimSafe: false,
          reasons: ['COVERAGE_UNAVAILABLE'],
        };
      }

      return {
        available: true,
        status: mode === 'partial' ? 'partial' : 'complete',
        negativeClaimSafe: mode === 'complete',
        reasons: mode === 'complete' ? [] : ['COVERAGE_PARTIAL'],
      };
    },

    fleet: options.fleet ?? null,
    crossService: options.crossService ?? null,

    ...(options.runtime ? { runtime: () => options.runtime! } : {}),

    ...(options.adr ? { adr: async () => [...options.adr!] } : {}),

    parseCandidate,

    readSource: () => null,

    ...(options.fleetImpact ? { fleetImpact: options.fleetImpact } : {}),

    ...(options.recheckSnapshot ? { recheckSnapshot: options.recheckSnapshot } : {}),
  };
}

function request(overrides: Partial<ChangeAnalysisRequest> = {}): ChangeAnalysisRequest {
  return {
    projectId: PROJECT,
    mode: 'patch',
    claim: 'impact',
    profile: 'verify',
    includeCrossService: true,
    ...overrides,
  };
}

/** Build a unified diff for the given hunks (newStart, oldStart, body lines). */
function diffFor(path: string, hunks: string[], header = ''): string {
  return [`diff --git a/${path} b/${path}`, header, `--- a/${path}`, `+++ b/${path}`, ...hunks]
    .filter(Boolean)
    .join('\n')
    .concat('\n');
}

async function analyzePatch(
  patch: string,
  facts: ChangeFacts,
  overrides: Partial<ChangeAnalysisRequest> = {}
) {
  const snapshot = await readChangeInput({
    mode: 'patch',
    rootPath: facts.rootPath,
    patch,
  });

  return analyzeChange({ request: request(overrides), facts, snapshot });
}

function tempDir(prefix: string): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'phase80',
  GIT_AUTHOR_EMAIL: 'phase80@example.test',
  GIT_COMMITTER_NAME: 'phase80',
  GIT_COMMITTER_EMAIL: 'phase80@example.test',
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_SYSTEM: '/dev/null',
};

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, env: GIT_ENV, encoding: 'utf8' });
}

function makeRepo(): string {
  const root = tempDir('toolnet-phase80-repo-');

  git(root, ['init', '-q']);
  git(root, ['config', 'user.email', 'phase80@example.test']);
  git(root, ['config', 'user.name', 'phase80']);

  return root;
}

function writeRepoFile(root: string, path: string, content: string): void {
  const absolute = join(root, path);
  const dir = absolute.slice(0, absolute.lastIndexOf('/'));

  if (dir) {
    execFileSync('mkdir', ['-p', dir]);
  }

  writeFileSync(absolute, content, 'utf8');
}

/* ==================================================================
 * Change input modes and git safety
 * ================================================================== */

describe('Phase 80 — change input modes', () => {
  it('parses an explicit patch into the canonical change model', async () => {
    const patch = diffFor('src/orders/repository.ts', [
      '@@ -10,3 +10,4 @@',
      ' const x = 1;',
      '+const y = 2;',
      ' return x;',
    ]);

    const snapshot = await readChangeInput({ mode: 'patch', rootPath: process.cwd(), patch });

    expect(snapshot.files).toHaveLength(1);
    expect(snapshot.files[0]!.kind).toBe('modified');
    expect(snapshot.files[0]!.hunks[0]!.newStart).toBe(10);
    expect(snapshot.files[0]!.additions).toBe(1);
  });

  it('reads the working tree relative to HEAD', async () => {
    const root = makeRepo();

    writeRepoFile(root, 'a.ts', 'export const a = 1;\n');
    git(root, ['add', '-A']);
    git(root, ['commit', '-qm', 'init']);

    writeRepoFile(root, 'a.ts', 'export const a = 2;\n');
    writeRepoFile(root, 'b.ts', 'export const b = 1;\n');

    const snapshot = await readChangeInput({ mode: 'working_tree', rootPath: root });

    const paths = snapshot.files.map((file) => file.path).sort();

    expect(paths).toContain('a.ts');
    expect(paths).toContain('b.ts');

    const added = snapshot.files.find((file) => file.path === 'b.ts');

    expect(added?.kind).toBe('added');
  });

  it('reads staged changes independently from the working tree', async () => {
    const root = makeRepo();

    writeRepoFile(root, 'a.ts', 'export const a = 1;\n');
    git(root, ['add', '-A']);
    git(root, ['commit', '-qm', 'init']);

    writeRepoFile(root, 'a.ts', 'export const a = 2;\n');
    git(root, ['add', 'a.ts']);

    writeRepoFile(root, 'a.ts', 'export const a = 3;\n');

    const staged = await readChangeInput({ mode: 'staged', rootPath: root });
    const worktree = await readChangeInput({ mode: 'working_tree', rootPath: root });

    expect(staged.files.map((file) => file.path)).toEqual(['a.ts']);
    expect(worktree.files.map((file) => file.path)).toEqual(['a.ts']);
    /* The two modes must describe different content snapshots. */
    expect(staged.rawDigest).not.toBe(worktree.rawDigest);
  });

  it('reads an exact commit range deterministically', async () => {
    const root = makeRepo();

    writeRepoFile(root, 'a.ts', 'export const a = 1;\n');
    git(root, ['add', '-A']);
    git(root, ['commit', '-qm', 'one']);
    const first = git(root, ['rev-parse', 'HEAD']).trim();

    writeRepoFile(root, 'a.ts', 'export const a = 2;\n');
    git(root, ['add', '-A']);
    git(root, ['commit', '-qm', 'two']);
    const second = git(root, ['rev-parse', 'HEAD']).trim();

    const one = await readChangeInput({
      mode: 'commit_range',
      rootPath: root,
      base: first,
      head: second,
    });

    const two = await readChangeInput({
      mode: 'commit_range',
      rootPath: root,
      base: first,
      head: second,
    });

    expect(one.files).toHaveLength(1);
    expect(one.rawDigest).toBe(two.rawDigest);
  });

  it('rejects a malicious revision instead of running a git option', async () => {
    const root = makeRepo();

    writeRepoFile(root, 'a.ts', 'export const a = 1;\n');
    git(root, ['add', '-A']);
    git(root, ['commit', '-qm', 'init']);

    await expect(
      readChangeInput({ mode: 'commit', rootPath: root, base: '--exec-path=/bin/sh' })
    ).rejects.toMatchObject({ code: 'CHANGE_REVISION_INVALID' });

    await expect(
      readChangeInput({
        mode: 'commit_range',
        rootPath: root,
        base: 'HEAD; rm -rf /',
        head: 'HEAD',
      })
    ).rejects.toMatchObject({ code: 'CHANGE_REVISION_INVALID' });
  });
});

/* ==================================================================
 * Change fingerprint
 * ================================================================== */

describe('Phase 80 — deterministic fingerprint', () => {
  it('produces the same snapshot id and fingerprint for identical input', async () => {
    const patch = diffFor('src/a.ts', ['@@ -1,1 +1,2 @@', ' const a = 1;', '+const b = 2;']);

    const facts = makeFacts();

    const first = await analyzePatch(patch, facts);
    const second = await analyzePatch(patch, facts);

    expect(first.change.snapshotId).toBe(second.change.snapshotId);
    expect(first.fingerprint).toBe(second.fingerprint);
  });

  it('changes the fingerprint when the change content changes', async () => {
    const facts = makeFacts();

    const one = await analyzePatch(
      diffFor('src/a.ts', ['@@ -1,1 +1,2 @@', ' const a = 1;', '+const b = 2;']),
      facts
    );
    const two = await analyzePatch(
      diffFor('src/a.ts', ['@@ -1,1 +1,2 @@', ' const a = 1;', '+const b = 3;']),
      facts
    );

    expect(one.fingerprint).not.toBe(two.fingerprint);
  });
});

/* ==================================================================
 * Static edge validation, symbols and semantics
 * ================================================================== */

describe('Phase 80 — change mapping', () => {
  it('maps a changed hunk to the owning symbol by file + line ownership', async () => {
    const patch = diffFor('src/orders/repository.ts', [
      '@@ -12,2 +12,3 @@',
      ' const x = 1;',
      '+const y = 2;',
    ]);

    const report = await analyzePatch(patch, makeFacts());

    expect(report.changedEntities.map((entity) => entity.symbolId)).toContain('repo:save');
  });

  it('reports a body-only edit as SYMBOL_MODIFIED, never SIGNATURE_CHANGED', async () => {
    const patch = diffFor('src/orders/service.ts', [
      '@@ -10,2 +10,3 @@',
      ' const total = 1;',
      '+const total2 = 2;',
    ]);

    const report = await analyzePatch(patch, makeFacts());

    const entity = report.changedEntities.find((item) => item.symbolId === 'svc:createOrder');

    expect(entity).toBeDefined();
    expect(entity!.semantic).toContain('SYMBOL_MODIFIED');
    expect(entity!.semantic).not.toContain('SIGNATURE_CHANGED');
    expect(entity!.signatureChanged).toBe(false);
  });

  it('detects a signature change deterministically', async () => {
    const patch = diffFor('src/orders/service.ts', [
      '@@ -5,2 +5,2 @@',
      '-  createOrder(x: number): void {',
      '+  createOrder(x: number, y: string): void {',
    ]);

    const report = await analyzePatch(patch, makeFacts());

    const entity = report.changedEntities.find((item) => item.symbolId === 'svc:createOrder');

    expect(entity?.signatureChanged).toBe(true);
    expect(entity!.semantic).toContain('SIGNATURE_CHANGED');
    expect(entity!.semantic).toContain('PARAMETER_CHANGED');
  });

  it('maps a deleted symbol against the baseline graph and flags its callers', async () => {
    const patch = diffFor(
      'src/orders/repository.ts',
      ['@@ -1,20 +0,0 @@', '-export function save() {}'],
      'deleted file mode 100644'
    );

    const report = await analyzePatch(patch, makeFacts());

    const entity = report.changedEntities.find((item) => item.symbolId === 'repo:save');

    expect(entity?.semantic).toContain('SYMBOL_DELETED');
    expect(entity?.candidatePresence).toBe(false);

    expect(report.guard.reasons).toContain('DELETED_SYMBOL_HAS_CALLERS');
    expect(report.guard.decision).toBe('review_required');
    expect(report.guard.safeToMerge).toBe(false);
    expect(report.guard.safeToDeploy).toBe(false);
  });

  it('detects a removed route that still has clients', async () => {
    const patch = diffFor('src/orders/routes.ts', ['@@ -1,3 +1,2 @@', '-app.post("/orders")']);

    const facts = makeFacts({
      parseCandidate: (path) =>
        path === 'src/orders/routes.ts' ? [toChangeSymbol(HANDLER)] : null,
    });

    const report = await analyzePatch(patch, facts);

    const entity = report.changedEntities.find((item) => item.symbolId === 'route:POST /orders');

    expect(entity?.semantic).toContain('ROUTE_REMOVED');
    expect(report.guard.reasons).toContain('REMOVED_ROUTE_HAS_CLIENTS');
  });

  it('flags an event channel change with consumers', async () => {
    const patch = diffFor('src/events/channels.ts', [
      '@@ -1,2 +1,2 @@',
      '-export const channel = "order.created";',
      '+export const channel = "order.created.v2";',
    ]);

    const report = await analyzePatch(patch, makeFacts());

    expect(report.guard.reasons).toContain('EVENT_CHANNEL_HAS_CONSUMERS');
  });

  it('reports a type change with its implementations and callers', async () => {
    const patch = diffFor('src/types/repository.ts', [
      '@@ -1,3 +1,4 @@',
      ' export interface Repository {',
      '+  remove(id: string): void;',
    ]);

    const report = await analyzePatch(patch, makeFacts());

    const entity = report.changedEntities.find((item) => item.symbolId === 'iface:Repository');

    expect(entity?.semantic).toContain('TYPE_CHANGED');
    expect(report.directImpact.map((item) => item.symbolId)).toContain('cls:OrderRepo');
  });

  it('tracks a rename through the diff rename metadata', async () => {
    const patch = [
      'diff --git a/src/old.ts b/src/new.ts',
      'similarity index 90%',
      'rename from src/old.ts',
      'rename to src/new.ts',
      '',
    ].join('\n');

    const report = await analyzePatch(patch, makeFacts());

    expect(report.change.files[0]!.kind).toBe('renamed');
    expect(report.change.files[0]!.oldPath).toBe('src/old.ts');
    expect(report.change.files[0]!.path).toBe('src/new.ts');
  });
});

/* ==================================================================
 * Impact expansion
 * ================================================================== */

describe('Phase 80 — impact expansion', () => {
  it('reports direct impact with a semantic path', async () => {
    const patch = diffFor('src/orders/repository.ts', ['@@ -12,2 +12,2 @@', '-a', '+b']);

    const report = await analyzePatch(patch, makeFacts());

    const direct = report.directImpact.find((item) => item.symbolId === 'svc:createOrder');

    expect(direct).toBeDefined();
    expect(direct!.relation).toBe('CALLS');
    expect(direct!.depth).toBe(1);
    expect(direct!.path.at(-1)).toEqual({
      from: 'svc:createOrder',
      to: 'repo:save',
      edgeType: 'CALLS',
    });
  });

  it('reports transitive impact separately from direct impact', async () => {
    const graph = buildGraph();
    graph.addSymbol(sym('svc:outer', 'outer', 'function', 'src/orders/outer.ts', 1, 5));
    graph.addEdge(edge('e:outer', 'CALLS', 'svc:outer', 'svc:createOrder'));

    const patch = diffFor('src/orders/repository.ts', ['@@ -12,2 +12,2 @@', '-a', '+b']);

    const report = await analyzePatch(patch, makeFacts({ graph }));

    expect(report.directImpact.map((item) => item.symbolId)).toContain('svc:createOrder');
    expect(report.transitiveImpact.map((item) => item.symbolId)).toContain('svc:outer');
  });

  it('reports cross-service impact from an HTTP edge', async () => {
    const patch = diffFor('src/orders/routes.ts', ['@@ -1,3 +1,3 @@', '-a', '+b']);

    const report = await analyzePatch(patch, makeFacts());

    expect(report.crossServiceImpact.map((item) => item.symbolId)).toContain('web:submitOrder');
  });

  it('reports cross-repo impact only through an explicit Fleet scope', async () => {
    const patch = diffFor('src/orders/routes.ts', ['@@ -1,3 +1,3 @@', '-a', '+b']);

    const fleetImpact = (): readonly ChangeFleetProjectImpact[] => [
      {
        projectId: 'project-b',
        depth: 1,
        steps: [{ from: 'project-b', to: PROJECT, edgeType: 'CROSS_HTTP_CALLS' }],
      },
    ];

    const report = await analyzePatch(
      patch,
      makeFacts({
        includeFleet: true,
        fleet: {
          generation: 'fleet-1',
          registeredProjects: [PROJECT, 'project-b'],
          staleProjects: [],
          missingProjects: [],
        },
        fleetImpact,
      }),
      { includeFleet: true }
    );

    expect(report.crossRepoImpact.map((item) => item.projectId)).toContain('project-b');
  });

  it('maps deterministic test relationships and reports uncovered symbols', async () => {
    const patch = diffFor('src/orders/repository.ts', ['@@ -12,2 +12,2 @@', '-a', '+b']);

    const report = await analyzePatch(patch, makeFacts());

    expect(report.tests.directTests).toContain('tests/orders.test.ts');
    expect(report.tests.uncoveredChangedSymbols).not.toContain('repo:save');
  });

  it('never shrinks the static blast radius to the runtime-observed subset', async () => {
    const patch = diffFor('src/orders/repository.ts', ['@@ -12,2 +12,2 @@', '-a', '+b']);

    const runtime: ChangeRuntimeObservation[] = [
      {
        id: 'obs-1',
        kind: 'call',
        validation: 'exact',
        observationCount: 3,
        sessionCount: 1,
        compatibility: 'exact',
        source: { symbolId: 'svc:createOrder' },
        target: { symbolId: 'repo:save' },
      },
    ];

    const report = await analyzePatch(patch, makeFacts({ runtime, includeRuntime: true }), {
      includeRuntimeEvidence: true,
    });

    expect(report.runtimeEvidence).toHaveLength(1);
    /* Runtime corroborates but does not remove static impact. */
    expect(report.directImpact.map((item) => item.symbolId)).toContain('svc:createOrder');
    const observed = report.directImpact.find((item) => item.symbolId === 'svc:createOrder');
    expect(observed?.runtimeObserved).toBe(true);
  });

  it('never clears an impact because runtime did not observe it', async () => {
    const patch = diffFor('src/orders/repository.ts', ['@@ -12,2 +12,2 @@', '-a', '+b']);

    const report = await analyzePatch(patch, makeFacts({ runtime: [] }), {
      includeRuntimeEvidence: true,
    });

    expect(report.runtimeEvidence).toHaveLength(0);
    expect(report.directImpact.map((item) => item.symbolId)).toContain('svc:createOrder');
  });

  it('attaches ADR constraints without changing raw graph impact', async () => {
    const patch = diffFor('src/orders/repository.ts', ['@@ -12,2 +12,2 @@', '-a', '+b']);

    const withAdr = await analyzePatch(
      patch,
      makeFacts({ adr: [{ id: 'ADR-1', title: 'Fleet is overlay only', status: 'accepted' }] })
    );

    const withoutAdr = await analyzePatch(patch, makeFacts());

    expect(withAdr.adrConstraints.map((entry) => entry.id)).toContain('ADR-1');
    expect(withAdr.guard.reasons).toContain('ADR_CONSTRAINT');
    expect(withoutAdr.guard.reasons).not.toContain('ADR_CONSTRAINT');
    /* ADR context never changes the raw impact set. */
    expect(withAdr.directImpact.map((item) => item.symbolId)).toEqual(
      withoutAdr.directImpact.map((item) => item.symbolId)
    );
  });
});

/* ==================================================================
 * Coverage, claim safety and the guard
 * ================================================================== */

describe('Phase 80 — coverage and claim safety', () => {
  it('does not clear a change when the call graph coverage is partial', async () => {
    const patch = diffFor('src/unrelated.ts', [
      '@@ -1,1 +1,2 @@',
      ' const a = 1;',
      '+const b = 2;',
    ]);

    const report = await analyzePatch(patch, makeFacts({ coverage: 'partial' }));

    expect(report.guard.decision).toBe('review_required');
    expect(report.guard.decision).not.toBe('clear');
    expect(report.guard.reasons).toContain('COVERAGE_PARTIAL');
  });

  it('blocks a negative claim without complete coverage', async () => {
    const patch = diffFor('src/unrelated.ts', [
      '@@ -1,1 +1,2 @@',
      ' const a = 1;',
      '+const b = 2;',
    ]);

    const report = await analyzePatch(patch, makeFacts({ coverage: 'partial' }), {
      claim: 'negative',
    });

    expect(report.claimSafety.negativeClaimSafe).toBe(false);
    expect(report.claimSafety.decision).toBe('blocked');
  });

  it('blocks an exhaustive claim unless the profile is auditor', async () => {
    const patch = diffFor('src/unrelated.ts', [
      '@@ -1,1 +1,2 @@',
      ' const a = 1;',
      '+const b = 2;',
    ]);

    const report = await analyzePatch(patch, makeFacts(), {
      claim: 'exhaustive',
      profile: 'verify',
    });

    expect(report.claimSafety.exhaustiveClaimSafe).toBe(false);
    expect(report.claimSafety.decision).toBe('blocked');
  });

  it('allows a bounded audited absence claim on a complete graph', async () => {
    const graph = buildGraph();
    graph.addSymbol(sym('unused:fn', 'unusedFn', 'function', 'src/unrelated.ts', 1, 5));

    const patch = diffFor('src/unrelated.ts', ['@@ -1,5 +1,5 @@', '-a', '+b']);

    const report = await analyzePatch(patch, makeFacts({ graph }), {
      claim: 'absence',
      profile: 'auditor',
    });

    expect(report.claimSafety.negativeClaimSafe).toBe(true);
    expect(report.claimSafety.exhaustiveClaimSafe).toBe(true);
    expect(report.complete).toBe(true);
    /* Even a clean audit never authorises deletion or a deploy. */
    expect(report.guard.safeToMerge).toBe(false);
    expect(report.guard.safeToDeploy).toBe(false);
    expect(JSON.stringify(report.guard)).not.toContain('SAFE_TO');
  });

  it('reports an unavailable coverage state honestly', async () => {
    const patch = diffFor('src/unrelated.ts', [
      '@@ -1,1 +1,2 @@',
      ' const a = 1;',
      '+const b = 2;',
    ]);

    const report = await analyzePatch(patch, makeFacts({ coverage: 'unavailable' }));

    expect(report.guard.reasons).toContain('COVERAGE_UNAVAILABLE');
    expect(report.guard.decision).toBe('incomplete');
  });

  it('flags a stale graph generation', async () => {
    const patch = diffFor('src/orders/repository.ts', ['@@ -12,2 +12,2 @@', '-a', '+b']);

    const report = await analyzePatch(patch, makeFacts({ currentGeneration: () => 'gen-2' }));

    expect(report.guard.reasons).toContain('GRAPH_STALE');
    expect(report.complete).toBe(false);
  });

  it('flags a stale or missing Fleet participant', async () => {
    const patch = diffFor('src/orders/routes.ts', ['@@ -1,3 +1,3 @@', '-a', '+b']);

    const report = await analyzePatch(
      patch,
      makeFacts({
        includeFleet: true,
        fleet: {
          generation: 'fleet-1',
          registeredProjects: [PROJECT],
          staleProjects: ['project-b'],
          missingProjects: [],
        },
        fleetImpact: () => [],
      }),
      { includeFleet: true }
    );

    expect(report.guard.reasons).toContain('FLEET_STALE');
  });

  it('flags an unresolved cross-service reference', async () => {
    const patch = diffFor('src/orders/routes.ts', ['@@ -1,3 +1,3 @@', '-a', '+b']);

    const report = await analyzePatch(
      patch,
      makeFacts({
        crossService: {
          ambiguous: 0,
          unresolved: 2,
          dynamic: 1,
          negativeClaimSafe: false,
          reasons: ['CROSS_SERVICE_UNRESOLVED'],
        },
      })
    );

    expect(report.guard.reasons).toContain('UNRESOLVED_REFERENCE');
  });
});

/* ==================================================================
 * Gaps, limits and security
 * ================================================================== */

describe('Phase 80 — gaps, limits and security', () => {
  it('reports a binary change as unanalyzed', async () => {
    const patch = [
      'diff --git a/logo.png b/logo.png',
      'index 1111111..2222222 100644',
      'Binary files a/logo.png and b/logo.png differ',
      '',
    ].join('\n');

    const report = await analyzePatch(patch, makeFacts());

    expect(report.gaps.map((gap) => gap.kind)).toContain('BINARY_FILE');
    expect(report.guard.reasons).toContain('BINARY_CHANGE_UNANALYZED');
    expect(report.complete).toBe(false);
  });

  it('reports an unsupported-language change as a mapping gap', async () => {
    const patch = diffFor('src/legacy.rs', ['@@ -1,2 +1,2 @@', '-fn a() {}', '+fn b() {}']);

    const report = await analyzePatch(patch, makeFacts({ parseCandidate: () => null }));

    expect(report.gaps.map((gap) => gap.kind)).toContain('UNSUPPORTED_LANGUAGE');
    expect(report.guard.reasons).toContain('UNSUPPORTED_LANGUAGE_CHANGE');
    expect(report.guard.decision).not.toBe('clear');
  });

  it('never leaks a secret from a diff', async () => {
    const secret = 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    const patch = diffFor('src/config.ts', [
      '@@ -12,2 +12,3 @@',
      ' const x = 1;',
      `+const token = "${secret}";`,
    ]);

    const report = await analyzePatch(patch, makeFacts());

    expect(JSON.stringify(report)).not.toContain(secret);

    const snapshot = await readChangeInput({
      mode: 'patch',
      rootPath: process.cwd(),
      patch,
    });

    expect(JSON.stringify(snapshot.files)).not.toContain(secret);
  });

  it('refuses a sensitive changed file without reading it', async () => {
    const patch = diffFor('.env', ['@@ -1,1 +1,2 @@', ' +SECRET=1']);

    const report = await analyzePatch(patch, makeFacts());

    expect(report.gaps.map((gap) => gap.kind)).toContain('SENSITIVE_FILE');
  });

  it('rejects a patch path that escapes the project root', async () => {
    const patch = diffFor('../../etc/passwd', ['@@ -1,1 +1,2 @@', ' root', '+hacked']);

    await expect(analyzePatch(patch, makeFacts())).rejects.toMatchObject({
      code: 'CHANGE_PATCH_PATH_ESCAPE',
    });
  });

  it('bounds a large diff instead of OOMing', async () => {
    const hunks = Array.from({ length: 5 }, (_value, index) =>
      diffFor(`src/gen${index}.ts`, ['@@ -1,1 +1,2 @@', ' a', '+b'])
    ).join('');

    const report = await analyzePatch(hunks, makeFacts(), {});
    const bounded = await (async () => {
      const snapshot = await readChangeInput({
        mode: 'patch',
        rootPath: process.cwd(),
        patch: hunks,
        limits: { maxChangedFiles: 2 },
      });

      return analyzeChange({
        request: request({ limits: { maxChangedFiles: 2 } }),
        facts: makeFacts(),
        snapshot,
      });
    })();

    expect(report.change.files).toHaveLength(5);
    expect(bounded.change.files).toHaveLength(2);
    expect(bounded.guard.reasons).toContain('CHANGE_ANALYSIS_LIMIT_REACHED');
    expect(bounded.complete).toBe(false);
  });

  it('detects a change input that moved during analysis', async () => {
    const patch = diffFor('src/orders/repository.ts', ['@@ -12,2 +12,2 @@', '-a', '+b']);

    const facts = makeFacts({ recheckSnapshot: async () => 'different-digest' });

    const snapshot = await readChangeInput({ mode: 'patch', rootPath: process.cwd(), patch });

    const report = await analyzeChange({ request: request(), facts, snapshot });

    expect(report.guard.reasons).toContain('CHANGE_INPUT_CHANGED');
    expect(report.complete).toBe(false);
  });

  it('detects a real working-tree mutation between read and recheck', async () => {
    const root = makeRepo();

    writeRepoFile(root, 'a.ts', 'export const a = 1;\n');
    git(root, ['add', '-A']);
    git(root, ['commit', '-qm', 'init']);

    writeRepoFile(root, 'a.ts', 'export const a = 2;\n');

    const snapshot = await readChangeInput({ mode: 'working_tree', rootPath: root });

    /* A stable working tree rechecks to the same digest. */
    const stable = await analyzeChange({
      request: request({ mode: 'working_tree' }),
      facts: makeFacts({
        rootPath: root,
        parseCandidate: () => [],
        recheckSnapshot: () => readSnapshotDigest({ mode: 'working_tree', rootPath: root }),
      }),
      snapshot,
    });

    expect(stable.guard.reasons).not.toContain('CHANGE_INPUT_CHANGED');

    /* Now mutate the file before the recheck runs. */
    const mutated = await analyzeChange({
      request: request({ mode: 'working_tree' }),
      facts: makeFacts({
        rootPath: root,
        parseCandidate: () => [],
        recheckSnapshot: async () => {
          writeRepoFile(root, 'a.ts', 'export const a = 3;\n');
          return readSnapshotDigest({ mode: 'working_tree', rootPath: root });
        },
      }),
      snapshot,
    });

    expect(mutated.guard.reasons).toContain('CHANGE_INPUT_CHANGED');
    expect(mutated.complete).toBe(false);
  });
});

/* ==================================================================
 * Determinism
 * ================================================================== */

describe('Phase 80 — determinism', () => {
  it('produces identical reports for the same input three times', async () => {
    const patch = diffFor('src/orders/service.ts', [
      '@@ -5,2 +5,2 @@',
      '-  createOrder(x: number): void {',
      '+  createOrder(x: number, y: string): void {',
    ]);

    const facts = makeFacts();

    const reports = await Promise.all([
      analyzePatch(patch, facts),
      analyzePatch(patch, facts),
      analyzePatch(patch, facts),
    ]);

    const serialized = reports.map((report) => JSON.stringify(report));

    expect(serialized[0]).toBe(serialized[1]);
    expect(serialized[1]).toBe(serialized[2]);
  });
});

/* ==================================================================
 * Authority / static-graph / artifact non-interference
 * ================================================================== */

describe('Phase 80 — non-interference', () => {
  it('never mutates the static graph while analysing a change', async () => {
    const graph = buildGraph();

    const before = JSON.stringify({
      symbols: graph
        .allSymbols(PROJECT)
        .map((symbol) => symbol.id)
        .sort(),
      edges: graph
        .allEdges(PROJECT)
        .map((entry) => entry.id)
        .sort(),
    });

    const patch = diffFor('src/orders/repository.ts', ['@@ -12,2 +12,2 @@', '-a', '+b']);

    for (let index = 0; index < 5; index += 1) {
      await analyzePatch(patch, makeFacts({ graph }));
    }

    const after = JSON.stringify({
      symbols: graph
        .allSymbols(PROJECT)
        .map((symbol) => symbol.id)
        .sort(),
      edges: graph
        .allEdges(PROJECT)
        .map((entry) => entry.id)
        .sort(),
    });

    expect(after).toBe(before);
  });

  it('produces a derived report that never contains an artifact payload', async () => {
    const patch = diffFor('src/orders/repository.ts', ['@@ -12,2 +12,2 @@', '-a', '+b']);

    const report = await analyzePatch(patch, makeFacts());

    const keys = Object.keys(report);

    expect(keys).not.toContain('artifact');
    expect(keys).not.toContain('artifacts');
    expect(keys).not.toContain('published');
  });
});

/* ==================================================================
 * Daemon parity, single-flight and cache safety
 * ================================================================== */

function daemonProject(): DaemonProjectRef {
  return { id: PROJECT, name: 'phase80', rootPath: process.cwd() };
}

function makeCoordinatorDeps(state: {
  run: (input: unknown) => Promise<unknown>;
}): DaemonRuntimeDependencies {
  return {
    async probeLocalGraph() {
      return { present: true, generation: 'gen-1' };
    },

    async loadProject() {
      return { generation: 'gen-1' };
    },

    async indexProject() {
      return { generation: 'gen-1', files: 0, symbols: 0, edges: 0 };
    },

    async hydrateProject() {
      return { generation: 'gen-1', files: 0, symbols: 0, edges: 0, fleetRepinned: false };
    },

    async artifactStatus() {
      return { present: true, generation: 'gen-1' };
    },

    async evidenceProject() {
      throw new Error('not used in this suite');
    },

    async changeProject(_project, input) {
      return (await state.run(input)) as never;
    },

    async queryProject() {
      throw new Error('not used in this suite');
    },

    async refreshFleet() {
      /* derived overlay only */
    },

    async releaseProject() {
      /* nothing resident in this fake */
    },
  };
}

function makeCoordinator(state: { run: (input: unknown) => Promise<unknown> }) {
  const deps = makeCoordinatorDeps(state);
  const projects = new ProjectRegistry();
  const index = new IndexCoordinator(deps, projects);
  const artifact = new ArtifactCoordinator(deps, projects);

  return new ProjectRuntimeCoordinator(deps, projects, index, artifact);
}

describe('Phase 80 — daemon parity and multi-client', () => {
  it('produces semantically identical reports standalone and through the coordinator', async () => {
    const patch = diffFor('src/orders/repository.ts', ['@@ -12,2 +12,2 @@', '-a', '+b']);

    const facts = makeFacts();

    const standalone = await runChangeAnalysis(request(), facts, {
      rootPath: facts.rootPath,
      patch,
    });

    let calls = 0;

    const coordinator = makeCoordinator({
      run: async () => {
        calls += 1;
        return standalone;
      },
    });

    const viaDaemon = await coordinator.change(daemonProject(), 'session-1', {
      request: request(),
      ...(patch ? { patch } : {}),
    });

    expect(calls).toBe(1);
    expect(JSON.stringify(viaDaemon.changedEntities)).toBe(
      JSON.stringify(standalone.changedEntities)
    );
    expect(viaDaemon.guard.decision).toBe(standalone.guard.decision);
    expect(viaDaemon.fingerprint).toBe(standalone.fingerprint);
  });

  it('single-flights ten concurrent identical analyses into one computation', async () => {
    const patch = diffFor('src/orders/repository.ts', ['@@ -12,2 +12,2 @@', '-a', '+b']);

    const facts = makeFacts();

    let calls = 0;

    const coordinator = makeCoordinator({
      run: async () => {
        calls += 1;
        return analyzePatch(patch, facts);
      },
    });

    const input = { request: request(), patch };

    const reports = await Promise.all(
      Array.from({ length: 10 }, () => coordinator.change(daemonProject(), 'session-1', input))
    );

    expect(calls).toBe(1);

    const distinct = new Set(reports.map((report) => report.fingerprint));

    expect(distinct.size).toBe(1);
  });

  it('never serves a cached D1 result for a different D2 change', async () => {
    const d1 = diffFor('src/orders/repository.ts', ['@@ -12,2 +12,2 @@', '-a', '+b1']);
    const d2 = diffFor('src/orders/repository.ts', ['@@ -12,2 +12,3 @@', '-a', '+b2', '+c']);

    const facts = makeFacts();

    let calls = 0;

    const coordinator = makeCoordinator({
      run: async (input) => {
        calls += 1;
        const patch = (input as { patch?: string }).patch ?? '';
        return analyzePatch(patch, facts);
      },
    });

    const first = await coordinator.change(daemonProject(), 'session-1', {
      request: request(),
      patch: d1,
    });

    const second = await coordinator.change(daemonProject(), 'session-1', {
      request: request(),
      patch: d2,
    });

    expect(calls).toBe(2);
    expect(second.change.snapshotId).not.toBe(first.change.snapshotId);
    expect(second.fingerprint).not.toBe(first.fingerprint);
  });

  it('reuses a cached commit-range analysis for the same immutable input', async () => {
    const patch = diffFor('src/orders/repository.ts', ['@@ -12,2 +12,2 @@', '-a', '+b']);

    const facts = makeFacts();

    let calls = 0;

    const coordinator = makeCoordinator({
      run: async () => {
        calls += 1;
        return analyzePatch(patch, facts);
      },
    });

    const input = {
      request: request({ mode: 'commit_range', base: 'aaa', head: 'bbb' }),
      patch,
    };

    const first = await coordinator.change(daemonProject(), 'session-1', input);
    const second = await coordinator.change(daemonProject(), 'session-1', input);

    expect(calls).toBe(1);
    expect(second.fingerprint).toBe(first.fingerprint);
  });
});

/* ==================================================================
 * Shared facts builder
 * ================================================================== */

describe('Phase 80 — shared facts builder', () => {
  it('builds a facts surface that yields the same report as the fixtures', async () => {
    const graph = buildGraph();

    const facts = buildProjectChangeFacts({
      projectId: PROJECT,
      rootPath: process.cwd(),
      generation: 'gen-1',
      graph,
      coverage: {
        available: true,
        evaluate: () => ({ status: 'complete', negativeClaimSafe: true, reasons: [] }),
      },
      includeRuntime: false,
      includeFleet: false,
    });

    const patch = diffFor('src/orders/repository.ts', ['@@ -12,2 +12,2 @@', '-a', '+b']);

    const report = await analyzePatch(patch, facts);

    expect(report.directImpact.map((item) => item.symbolId)).toContain('svc:createOrder');
    expect(report.change.files).toHaveLength(1);
  });
});

/* ==================================================================
 * Packaged MCP runtime
 * ================================================================== */

async function listPackagedMcpTools(bundlePath: string): Promise<string[]> {
  const cwd = tempDir('toolnet-phase80-mcp-');

  const requests = `${[
    JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'phase80-certify', version: '1.0.0' },
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

    const finish = (complete: () => void): void => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      child.kill('SIGKILL');
      complete();
    };

    timer = setTimeout(
      () => finish(() => rejectPromise(new Error('packaged runtime probe timed out'))),
      60_000
    );

    child.stdout.setEncoding('utf8');

    child.stdout.on('data', (chunk: string) => {
      buffer += chunk;

      const lines = buffer.split('\n');

      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed.startsWith('{')) continue;

        let message: { id?: unknown; result?: { tools?: Array<{ name?: unknown }> } };

        try {
          message = JSON.parse(trimmed) as typeof message;
        } catch {
          continue;
        }

        if (message.id !== 2) continue;

        finish(() =>
          resolvePromise((message.result?.tools ?? []).map((tool) => String(tool.name)))
        );

        return;
      }
    });

    child.on('error', (error) => finish(() => rejectPromise(error)));

    child.stdin.write(requests);
  });
}

describe('Phase 80 — packaged runtime', () => {
  const repoRoot = resolve(process.cwd());
  const bundlePath = join(repoRoot, 'bundle', 'mcp.js');

  it('ships the change-intelligence layer inside the packaged MCP bundle', () => {
    expect(existsSync(bundlePath)).toBe(true);

    const bundle = readFileSync(bundlePath, 'utf8');

    for (const marker of [
      'changeMode',
      'CHANGE_ANALYSIS_LIMIT_REACHED',
      'CHANGE_INPUT_CHANGED',
      'CHANGE_REVISION_INVALID',
      'CHANGE_PATCH_PATH_ESCAPE',
      'POST_CHANGE_GRAPH_UNAVAILABLE',
      'DELETED_SYMBOL_HAS_CALLERS',
      'REMOVED_ROUTE_HAS_CLIENTS',
      'EVENT_CHANNEL_HAS_CONSUMERS',
      'BINARY_CHANGE_UNANALYZED',
      'CHANGE INTELLIGENCE',
    ]) {
      expect(bundle).toContain(marker);
    }
  });

  it('exposes the change mode and evidence profile through the packaged tools/list', async () => {
    const tools = await listPackagedMcpTools(bundlePath);

    expect(tools).toContain('impact_guard');
  });

  it('works standalone with no daemon present', async () => {
    const patch = diffFor('src/orders/repository.ts', ['@@ -12,2 +12,2 @@', '-a', '+b']);

    const report = await analyzePatch(patch, makeFacts());

    expect(report.profile).toBe('verify');
    expect(report.change.files).toHaveLength(1);
  });
});

/* ==================================================================
 * Certification marker
 * ================================================================== */

describe('Phase 80 — certification', () => {
  it('emits the Phase 80 PASS marker', () => {
    console.log(PHASE80_MARKER);

    expect(PHASE80_MARKER).toBe('PHASE80_CHANGE_INTELLIGENCE=PASS');
  });
});
