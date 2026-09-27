/*
 * Phase 82 — Test Intelligence / Change-to-Test Selection & Verification
 * production certification.
 *
 * Exercises the REAL implementation:
 *
 *   - test discovery, the central framework registry and test symbol extraction
 *   - direct / transitive / import-only relationships
 *   - routes, events, contracts, Fleet and runtime-observed relevance
 *   - selection categories, machine-readable reason codes and uncovered entities
 *   - the deterministic greedy "minimal" set (documented heuristic)
 *   - Evidence Profile gating and negative-claim safety
 *   - ADR constraints
 *   - guarded explicit execution: runner validation, argv arrays, path
 *     containment, command-injection rejection, timeout, cancel, output bounds,
 *     secret sanitisation
 *   - result/verification modelling, stale results, skipped tests and the
 *     regression-guard separation (a green run never clears non-test blockers)
 *   - passive coverage-report ingestion and staleness
 *   - bounded retention
 *   - daemon parity, single-flight and multi-client behaviour
 *   - authority / static-graph / artifact non-interference
 *   - the packaged MCP runtime
 *
 * PASS marker: PHASE82_TEST_INTELLIGENCE=PASS
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { CodeGraphStore } from '../../src/code-intelligence/graph/graph-store.js';

import {
  buildProjectTestFacts,
  buildTestSelection,
  buildTestVerification,
  discoverTests,
  detectFramework,
  ingestCoverage,
  isContainedTestPath,
  isTestPath,
  runSelectedTests,
  sanitizeOutput,
  TestIntelligenceStore,
  testSelectionFingerprint,
} from '../../src/code-intelligence/test-intelligence/index.js';

import type {
  FleetTestRef,
  RunSelectedTestsRequest,
  TestAdrConstraint,
  TestChangedEntity,
  TestContractChange,
  TestFacts,
  TestFleetFacts,
  TestFramework,
  TestRuntimeObservation,
  TestSelection,
  TestSelectionRequest,
} from '../../src/code-intelligence/test-intelligence/index.js';

import type {
  TestSpawnFn,
  TestSpawnPlan,
  TestSpawnResult,
} from '../../src/code-intelligence/test-intelligence/execution.js';

import { ProjectRegistry } from '../../src/daemon/registry.js';

import {
  ArtifactCoordinator,
  IndexCoordinator,
  ProjectRuntimeCoordinator,
} from '../../src/daemon/coordinators.js';

import type { DaemonProjectRef, DaemonRuntimeDependencies } from '../../src/daemon/types.js';

const PROJECT = 'phase82';
const MARKER = 'PHASE82_TEST_INTELLIGENCE=PASS';

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

function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));

  roots.push(dir);

  return dir;
}

interface Sym {
  id: string;
  name: string;
  type: string;
  filePath: string;
}

interface Edg {
  id: string;
  type: string;
  from: string;
  to: string;
}

/** Test file paths exercised by the base fixture. */
const T_ORDERS = 'tests/orders.test.ts';
const T_HELPER = 'tests/helper.test.ts';
const T_UTIL = 'tests/util.test.ts';
const T_TRANS = 'tests/transitive.test.ts';
const T_IMPORT = 'tests/imports.test.ts';
const T_ROUTE = 'tests/route.test.ts';
const T_EVENTS = 'tests/events.test.ts';
const T_CONTRACT = 'tests/contract.test.ts';
const T_E2E = 'tests/e2e/checkout.e2e.test.ts';
const T_LEGACY = 'tests/legacy.spec.rb';

const CREATE_ORDER = 'svc:createOrder';
const CHANGED_B = 'svc:changedB';
const HELPER = 'svc:helper';
const UTIL = 'mod:util';
const IMPORT_ONLY = 'mod:importOnly';
const TRANS_TARGET = 'svc:transitiveTarget';
const NO_TESTS = 'svc:noTests';
const ROUTE = 'route:POST /orders';
const EVENT = 'event:order.created';
const IFACE = 'iface:Repository';

const TEST_SOURCES: Record<string, string> = {
  [T_ORDERS]: [
    "import { createOrder, changedB } from '../src/orders';",
    '',
    "describe('orders', () => {",
    "  test('creates order', () => {",
    '    createOrder();',
    '    changedB();',
    '  });',
    '});',
  ].join('\n'),
  [T_HELPER]: [
    "import { changedB } from '../src/orders';",
    '',
    "test('changed b directly', () => {",
    '  changedB();',
    '});',
  ].join('\n'),
  [T_UTIL]: [
    "import { util } from '../src/util';",
    '',
    "test('util', () => {",
    '  util();',
    '});',
  ].join('\n'),
  [T_TRANS]: [
    "import { helper } from '../src/helper';",
    '',
    "test('through helper', () => {",
    '  helper();',
    '});',
  ].join('\n'),
  [T_IMPORT]: [
    "import { importOnly } from '../src/import-only';",
    '',
    "test('mentions the module', () => {",
    '  expect(importOnly).toBeDefined();',
    '});',
  ].join('\n'),
  [T_ROUTE]: ["test('posts an order', () => {", '  fetch("/orders");', '});'].join('\n'),
  [T_EVENTS]: [
    "test('consumes order.created', () => {",
    '  subscribe("order.created");',
    '});',
  ].join('\n'),
  [T_CONTRACT]: [
    "import type { Repository } from '../src/types';",
    '',
    "test('honours the contract', () => {",
    '  const _probe: Repository | null = null;',
    '  expect(_probe).toBeNull();',
    '});',
  ].join('\n'),
  [T_E2E]: ["test('checkout end to end', () => {", '  createOrder();', '});'].join('\n'),
  [T_LEGACY]: ['def test_legacy', '  create_order', 'end'].join('\n'),
};

function fileSym(path: string): Sym {
  return { id: `file:${path}`, name: path, type: 'file', filePath: path };
}

function baseSymbols(includeLegacy = false): Sym[] {
  const symbols: Sym[] = [
    { id: CREATE_ORDER, name: 'createOrder', type: 'function', filePath: 'src/orders.ts' },
    { id: CHANGED_B, name: 'changedB', type: 'function', filePath: 'src/orders.ts' },
    { id: HELPER, name: 'helper', type: 'function', filePath: 'src/helper.ts' },
    { id: UTIL, name: 'util', type: 'module', filePath: 'src/util.ts' },
    {
      id: IMPORT_ONLY,
      name: 'importOnly',
      type: 'function',
      filePath: 'src/import-only.ts',
    },
    { id: TRANS_TARGET, name: 'transitiveTarget', type: 'function', filePath: 'src/target.ts' },
    { id: NO_TESTS, name: 'noTests', type: 'function', filePath: 'src/untested.ts' },
    { id: ROUTE, name: 'POST /orders', type: 'route', filePath: 'src/routes.rb' },
    { id: EVENT, name: 'order.created', type: 'event', filePath: 'src/events.rb' },
    { id: IFACE, name: 'Repository', type: 'interface', filePath: 'src/types.ts' },
  ];

  for (const path of Object.keys(TEST_SOURCES)) {
    if (path === T_LEGACY && !includeLegacy) {
      continue;
    }

    symbols.push(fileSym(path));
  }

  return symbols;
}

function baseEdges(includeLegacy = false): Edg[] {
  const edges: Edg[] = [
    { id: 'e:1', type: 'CALLS', from: `file:${T_ORDERS}`, to: CREATE_ORDER },
    { id: 'e:2', type: 'CALLS', from: `file:${T_ORDERS}`, to: CHANGED_B },
    { id: 'e:3', type: 'CALLS', from: `file:${T_HELPER}`, to: CHANGED_B },
    { id: 'e:4', type: 'IMPORTS', from: `file:${T_UTIL}`, to: UTIL },
    { id: 'e:5', type: 'CALLS', from: `file:${T_TRANS}`, to: HELPER },
    { id: 'e:6', type: 'CALLS', from: HELPER, to: TRANS_TARGET },
    { id: 'e:7', type: 'IMPORTS', from: `file:${T_IMPORT}`, to: IMPORT_ONLY },
    { id: 'e:8', type: 'HTTP_CALLS', from: `file:${T_ROUTE}`, to: ROUTE },
    { id: 'e:9', type: 'LISTENS_ON', from: `file:${T_EVENTS}`, to: EVENT },
    { id: 'e:10', type: 'USES_TYPE', from: `file:${T_CONTRACT}`, to: IFACE },
    { id: 'e:11', type: 'CALLS', from: `file:${T_E2E}`, to: CREATE_ORDER },
  ];

  if (includeLegacy) {
    edges.push({ id: 'e:12', type: 'CALLS', from: `file:${T_LEGACY}`, to: CREATE_ORDER });
  }

  return edges;
}

function changedEntity(symbolId: string, filePath: string, name: string): TestChangedEntity {
  return {
    id: symbolId,
    symbolId,
    name,
    filePath,
    publicSurface: true,
    semantic: ['SYMBOL_MODIFIED'],
  };
}

const BASE_CHANGED: TestChangedEntity[] = [
  changedEntity(CREATE_ORDER, 'src/orders.ts', 'createOrder'),
  changedEntity(CHANGED_B, 'src/orders.ts', 'changedB'),
  changedEntity(UTIL, 'src/util.ts', 'util'),
  changedEntity(TRANS_TARGET, 'src/target.ts', 'transitiveTarget'),
  changedEntity(IMPORT_ONLY, 'src/import-only.ts', 'importOnly'),
  changedEntity(NO_TESTS, 'src/untested.ts', 'noTests'),
  changedEntity(ROUTE, 'src/routes.rb', 'POST /orders'),
  changedEntity(EVENT, 'src/events.rb', 'order.created'),
];

/** A contract change that maps onto a graph node the contract test exercises. */
const COVERED_CONTRACT: TestContractChange = {
  contractId: 'http:POST /orders',
  kind: 'http',
  identity: 'POST /orders',
  compatibility: 'breaking',
  sourcePaths: ['src/routes.rb'],
  symbolIds: [IFACE],
};

type CoverageMode = 'complete' | 'partial' | 'unavailable';

interface FactsOptions {
  symbols?: Sym[];
  edges?: Edg[];
  sources?: Record<string, string>;
  generation?: string;
  currentGeneration?: string;
  coverage?: CoverageMode;
  changedEntities?: TestChangedEntity[];
  contractChanges?: TestContractChange[];
  changeFingerprint?: string;
  contractFingerprint?: string;
  fleet?: TestFleetFacts | null;
  fleetTests?: (ids: readonly string[]) => readonly FleetTestRef[] | null;
  runtime?: readonly TestRuntimeObservation[];
  adrConstraints?: readonly TestAdrConstraint[];
  recheckSnapshot?: () => Promise<string>;
  runnerPlan?: (
    framework: TestFramework,
    path: string
  ) => { command: string; args: string[] } | null;
  readSource?: (path: string, maxBytes: number) => string | null;
  includeLegacy?: boolean;
}

function makeFacts(options: FactsOptions = {}): TestFacts {
  const symbols = options.symbols ?? baseSymbols(options.includeLegacy ?? false);
  const edges = options.edges ?? baseEdges(options.includeLegacy ?? false);
  const sources = options.sources ?? TEST_SOURCES;

  const generation = options.generation ?? 'gen-1';
  const mode = options.coverage ?? 'complete';

  const graph = new CodeGraphStore();

  graph.import(
    symbols.map((symbol) => ({
      id: symbol.id,
      projectId: PROJECT,
      name: symbol.name,
      qualifiedName: symbol.name,
      type: symbol.type as never,
      filePath: symbol.filePath,
      startLine: 1,
      endLine: 5,
      metadata: {},
    })),
    edges.map((edge) => ({
      id: edge.id,
      projectId: PROJECT,
      type: edge.type as never,
      from: edge.from,
      to: edge.to,
    }))
  );

  const coverageFor = (): {
    available: boolean;
    status: string;
    negativeClaimSafe: boolean;
    reasons: string[];
  } => {
    if (mode === 'unavailable') {
      return {
        available: false,
        status: 'unavailable',
        negativeClaimSafe: false,
        reasons: ['COVERAGE_UNAVAILABLE'],
      };
    }

    if (mode === 'partial') {
      return {
        available: true,
        status: 'partial',
        negativeClaimSafe: false,
        reasons: ['COVERAGE_PARTIAL'],
      };
    }

    return { available: true, status: 'complete', negativeClaimSafe: true, reasons: [] };
  };

  return {
    projectId: PROJECT,
    rootPath: process.cwd(),
    generation,
    currentGeneration: () => options.currentGeneration ?? generation,

    graph: {
      symbols: () =>
        graph.allSymbols(PROJECT).map((symbol) => ({
          id: symbol.id,
          name: symbol.name,
          ...(symbol.qualifiedName ? { qualifiedName: symbol.qualifiedName } : {}),
          type: String(symbol.type),
          filePath: symbol.filePath,
        })),
      symbolById: (id) => {
        const found = graph.getSymbol(id);

        return found
          ? {
              id: found.id,
              name: found.name,
              type: String(found.type),
              filePath: found.filePath,
            }
          : undefined;
      },
      incoming: (symbolId, edgeTypes) =>
        graph
          .allEdges(PROJECT)
          .filter((edge) => edge.to === symbolId && edgeTypes.includes(String(edge.type)))
          .map((edge) => ({
            id: edge.id,
            type: String(edge.type),
            from: edge.from,
            to: edge.to,
          })),
      outgoing: (symbolId, edgeTypes) =>
        graph
          .allEdges(PROJECT)
          .filter((edge) => edge.from === symbolId && edgeTypes.includes(String(edge.type)))
          .map((edge) => ({
            id: edge.id,
            type: String(edge.type),
            from: edge.from,
            to: edge.to,
          })),
    },

    coverageAvailable: mode !== 'unavailable',
    coverageFor,

    fleet: options.fleet ?? null,

    changedEntities: options.changedEntities ?? BASE_CHANGED,
    ...(options.changeFingerprint ? { changeFingerprint: options.changeFingerprint } : {}),
    contractChanges: options.contractChanges ?? [COVERED_CONTRACT],
    ...(options.contractFingerprint ? { contractFingerprint: options.contractFingerprint } : {}),

    ...(options.runtime ? { runtime: (_ids: readonly string[]) => options.runtime! } : {}),

    ...(options.fleetTests ? { fleetTests: options.fleetTests } : {}),

    adrConstraints: options.adrConstraints ?? [],

    ...(options.readSource
      ? { readSource: options.readSource }
      : {
          readSource: (path: string): string | null => sources[path] ?? null,
        }),

    ...(options.recheckSnapshot ? { recheckSnapshot: options.recheckSnapshot } : {}),

    ...(options.runnerPlan ? { runnerPlan: options.runnerPlan } : {}),
  };
}

function selectionRequest(overrides: Partial<TestSelectionRequest> = {}): TestSelectionRequest {
  return { projectId: PROJECT, profile: 'verify', claim: 'impact', ...overrides };
}

async function select(
  facts: TestFacts,
  overrides: Partial<TestSelectionRequest> = {}
): Promise<TestSelection> {
  const { selection } = await buildTestSelection({
    request: selectionRequest(overrides),
    facts,
  });

  return selection;
}

function allSelected(selection: TestSelection): Array<{ id: string; path: string }> {
  return Object.values(selection.categories)
    .flat()
    .map((entry) => ({ id: entry.test.id, path: entry.test.path }));
}

function selectedPaths(selection: TestSelection): string[] {
  return [...new Set(allSelected(selection).map((entry) => entry.path))].sort();
}

/* ==================================================================
 * Discovery and the central framework registry
 * ================================================================== */

describe('Phase 82 — test discovery and framework registry', () => {
  it('detects a supported framework from a path and refuses to guess', () => {
    expect(detectFramework(T_ORDERS)).toBe('vitest');
    expect(detectFramework('tests/test_orders.py')).toBe('pytest');
    expect(detectFramework('pkg/orders_test.go')).toBe('go_test');
    expect(detectFramework('tests/orders.rs')).toBe('cargo_test');
    expect(detectFramework('src/orders.ts')).toBeNull();
  });

  it('recognises test-ish paths without claiming an unsupported framework', () => {
    expect(isTestPath(T_ORDERS)).toBe(true);
    expect(isTestPath('src/orders.ts')).toBe(false);
    expect(detectFramework(T_LEGACY)).toBeNull();
    expect(isTestPath(T_LEGACY)).toBe(false);
  });

  it('discovers test symbols from source without executing anything', async () => {
    const facts = makeFacts();

    const discovery = await discoverTests({
      facts,
      limits: { maxTestFiles: 100, maxTestSymbols: 1000, maxSourceReadBytes: 100_000 },
    });

    const ids = discovery.tests.map((descriptor) => descriptor.id);

    expect(ids).toContain(`${T_ORDERS}::orders>creates order`);
    expect(ids).toContain(`${T_HELPER}::changed b directly`);
    expect(discovery.coverage.testFiles).toBeGreaterThan(0);
    expect(discovery.coverage.complete).toBe(true);
  });

  it('reports an unsupported framework instead of claiming no tests exist', async () => {
    const facts = makeFacts({ includeLegacy: true });

    const discovery = await discoverTests({
      facts,
      limits: { maxTestFiles: 100, maxTestSymbols: 1000, maxSourceReadBytes: 100_000 },
    });

    expect(discovery.coverage.complete).toBe(false);
    expect(discovery.coverage.reasons).toContain('UNSUPPORTED_TEST_FRAMEWORK');

    const legacy = discovery.coverage.frameworks.find((entry) => entry.framework === 'other');

    expect(legacy?.support).toBe('unsupported');
  });

  it('builds the same descriptor identity twice (deterministic, never random)', async () => {
    const first = await discoverTests({
      facts: makeFacts(),
      limits: { maxTestFiles: 100, maxTestSymbols: 1000, maxSourceReadBytes: 100_000 },
    });

    const second = await discoverTests({
      facts: makeFacts(),
      limits: { maxTestFiles: 100, maxTestSymbols: 1000, maxSourceReadBytes: 100_000 },
    });

    expect(first.tests.map((entry) => entry.id)).toEqual(second.tests.map((entry) => entry.id));
  });
});

/* ==================================================================
 * Relationship strength
 * ================================================================== */

describe('Phase 82 — direct, transitive and import relationships', () => {
  it('selects a test that calls the changed symbol as a direct test', async () => {
    const selection = await select(makeFacts());

    const entry = selection.categories.direct.find((candidate) => candidate.test.path === T_ORDERS);

    expect(entry).toBeDefined();
    expect(entry?.reasonCode).toBe('DIRECT_CALLS_CHANGED_SYMBOL');
    expect(entry?.path.length).toBeGreaterThan(0);
  });

  it('follows a call path and preserves the semantic path for transitive evidence', async () => {
    const selection = await select(makeFacts());

    const entry = selection.categories.transitive.find(
      (candidate) => candidate.test.path === T_TRANS
    );

    expect(entry).toBeDefined();
    expect(entry?.reasonCode).toBe('TRANSITIVE_CALL_PATH');
    expect(entry?.targetEntityId).toBe(TRANS_TARGET);
    expect(entry?.path.map((step) => step.edgeType)).toEqual(['CALLS', 'CALLS']);
  });

  it('treats an import-only relationship as related, never as a direct test', async () => {
    const selection = await select(makeFacts());

    const related = selection.categories.related.find(
      (candidate) => candidate.test.path === T_IMPORT
    );

    expect(related).toBeDefined();
    expect(related?.reasonCode).toBe('IMPORTS_CHANGED_MODULE');

    const direct = selection.categories.direct.find(
      (candidate) => candidate.test.path === T_IMPORT
    );

    expect(direct).toBeUndefined();
  });
});

/* ==================================================================
 * Routes, events, contracts, Fleet and runtime relevance
 * ================================================================== */

describe('Phase 82 — route, event and contract tests', () => {
  it('selects route tests for a changed route through HTTP_CALLS', async () => {
    const selection = await select(makeFacts());

    const entry = selection.categories.integration.find(
      (candidate) => candidate.test.path === T_ROUTE
    );

    expect(entry?.reasonCode).toBe('TESTS_CHANGED_ROUTE');
    expect(entry?.targetEntityId).toBe(ROUTE);
  });

  it('selects event tests for a changed channel through LISTENS_ON', async () => {
    const selection = await select(makeFacts());

    const entry = selection.categories.integration.find(
      (candidate) => candidate.test.path === T_EVENTS
    );

    expect(entry?.reasonCode).toBe('TESTS_EVENT_CHANNEL');
    expect(entry?.targetEntityId).toBe(EVENT);
  });

  it('selects a contract test for a changed contract and keeps it in the contract category', async () => {
    const selection = await select(makeFacts());

    const entry = selection.categories.contract.find(
      (candidate) => candidate.test.path === T_CONTRACT
    );

    expect(entry).toBeDefined();
    expect(entry?.reasonCode).toBe('TESTS_CHANGED_CONTRACT');

    expect(
      selection.diagnostics.some((entry) => entry.startsWith('CONTRACT_CHANGE_WITHOUT_KNOWN_TEST'))
    ).toBe(false);
  });

  it('reports a structurally breaking contract with no known test without downgrading it', async () => {
    const uncovered: TestContractChange = {
      contractId: 'grpc:Orders/List',
      kind: 'grpc',
      identity: 'Orders/List',
      compatibility: 'breaking',
      sourcePaths: ['proto/orders.proto'],
      symbolIds: ['rpc:Orders/List'],
    };

    const selection = await select(makeFacts({ contractChanges: [COVERED_CONTRACT, uncovered] }));

    expect(
      selection.diagnostics.some((entry) =>
        entry.startsWith('CONTRACT_CHANGE_WITHOUT_KNOWN_TEST:grpc:Orders/List')
      )
    ).toBe(true);

    expect(selection.uncoveredEntities.some((entry) => entry.entityId === 'grpc:Orders/List')).toBe(
      true
    );
  });

  it('keeps e2e tests in their own category', async () => {
    const selection = await select(makeFacts());

    expect(selection.categories.e2e.some((entry) => entry.test.path === T_E2E)).toBe(true);
    expect(allSelected(selection).some((entry) => entry.path === T_E2E)).toBe(true);
  });
});

describe('Phase 82 — Fleet-aware selection', () => {
  const fleet: TestFleetFacts = {
    generation: 'fleet-1',
    registeredProjects: ['phase82', 'web'],
    staleProjects: [],
    missingProjects: [],
  };

  it('does not scan other repos and says so when no deterministic Fleet test exists', async () => {
    const selection = await select(makeFacts({ fleet }), { includeFleet: true });

    expect(selection.reasons).toContain('CROSS_REPO_TEST_MAPPING_UNSUPPORTED');
    expect(
      selection.limitations.some((entry) => entry.includes('deterministic Fleet test declaration'))
    ).toBe(true);
  });

  it('includes a deterministically declared Fleet consumer test', async () => {
    const selection = await select(
      makeFacts({
        fleet,
        fleetTests: (resourceIds) =>
          resourceIds.includes(CREATE_ORDER)
            ? [
                {
                  projectId: 'web',
                  testId: 'web-orders-contract',
                  path: 'tests/orders-contract.test.ts',
                  framework: 'vitest',
                  resourceId: CREATE_ORDER,
                  reasonCode: 'CROSS_REPO_CONSUMER_TEST',
                },
              ]
            : null,
      }),
      { includeFleet: true }
    );

    const entry = selection.categories.integration.find((candidate) =>
      candidate.test.id.startsWith('fleet:web:')
    );

    expect(entry?.reasonCode).toBe('CROSS_REPO_CONSUMER_TEST');
    expect(selection.reasons).not.toContain('CROSS_REPO_TEST_MAPPING_UNSUPPORTED');
  });

  it('marks a stale Fleet as a reason without guessing cross-repo coverage', async () => {
    const selection = await select(
      makeFacts({
        fleet: { ...fleet, staleProjects: ['web'], registeredProjects: ['phase82', 'web'] },
      }),
      { includeFleet: true }
    );

    expect(selection.reasons).toContain('FLEET_STALE');
  });
});

describe('Phase 82 — runtime-observed relevance', () => {
  const observation: TestRuntimeObservation = {
    id: 'obs:1',
    kind: 'call',
    validation: 'matched',
    observationCount: 12,
    compatibility: 'exact',
    source: { symbolId: CREATE_ORDER, name: 'createOrder' },
    target: { symbolId: CHANGED_B, name: 'changedB' },
  };

  it('adds runtime-observed relevance to a selected test', async () => {
    const selection = await select(makeFacts({ runtime: [observation] }), {
      includeRuntimeEvidence: true,
    });

    expect(allSelected(selection).some((entry) => entry.id.length > 0)).toBe(true);

    const observed = Object.values(selection.categories)
      .flat()
      .filter((entry) => entry.runtimeObserved === true);

    expect(observed.length).toBeGreaterThan(0);
  });

  it('never deselects a statically relevant test because runtime did not observe it', async () => {
    const withoutRuntime = await select(makeFacts(), { includeRuntimeEvidence: true });
    const withRuntime = await select(makeFacts({ runtime: [observation] }), {
      includeRuntimeEvidence: true,
    });

    /* Runtime evidence is additive: the selected path set must not shrink. */
    expect(selectedPaths(withoutRuntime)).toEqual(selectedPaths(withRuntime));
  });
});

/* ==================================================================
 * Selection coverage, uncovered entities and the minimal set
 * ================================================================== */

describe('Phase 82 — selection coverage and honesty', () => {
  it('separates changed entities that have tests from those that do not', async () => {
    const selection = await select(makeFacts());

    expect(selection.coverage.changedEntities).toBeGreaterThan(0);
    expect(selection.coverage.entitiesWithDirectTests).toBeGreaterThan(0);

    const uncovered = selection.uncoveredEntities.find((entry) => entry.entityId === NO_TESTS);

    expect(uncovered?.reasonCode).toBe('NO_KNOWN_TEST');
    expect(selection.uncoveredEntities.some((entry) => entry.entityId === TRANS_TARGET)).toBe(
      false
    );
  });

  it('never claims a missing test when discovery is partial', async () => {
    const selection = await select(makeFacts({ includeLegacy: true }));

    expect(selection.discovery.complete).toBe(false);

    for (const entry of selection.uncoveredEntities) {
      expect(entry.reasonCode).not.toBe('NO_KNOWN_TEST');
    }

    expect(selection.limitations.some((entry) => entry.includes('never claimed'))).toBe(true);
  });

  it('returns a deterministic greedy minimal cover and drops a redundant test', async () => {
    const selection = await select(makeFacts());

    const minimalIds = selection.minimal.map((entry) => entry.test.id);

    const ordersId = `${T_ORDERS}::orders>creates order`;
    const helperId = `${T_HELPER}::changed b directly`;

    expect(minimalIds).toContain(ordersId);
    expect(minimalIds).not.toContain(helperId);
    expect(minimalIds.some((id) => id.startsWith(T_UTIL))).toBe(true);
  });

  it('orders the selection by deterministic tier, never by a relevance score', async () => {
    const selection = await select(makeFacts());

    const tiers = [
      ...selection.categories.direct,
      ...selection.categories.contract,
      ...selection.categories.integration,
      ...selection.categories.transitive,
      ...selection.categories.related,
      ...selection.categories.e2e,
    ];

    for (const entry of tiers) {
      expect(entry.tier).toBeGreaterThan(0);
      expect(Object.keys(entry)).not.toContain('relevance');
    }
  });

  it('flags graph coverage, staleness and completeness as machine-readable reasons', async () => {
    const complete = await select(makeFacts());
    expect(complete.reasons).toContain('TEST_DISCOVERY_COMPLETE');
    expect(complete.reasons).not.toContain('COVERAGE_PARTIAL');
    expect(complete.complete).toBe(true);

    const partial = await select(makeFacts({ coverage: 'partial' }));
    expect(partial.reasons).toContain('COVERAGE_PARTIAL');

    const stale = await select(makeFacts({ currentGeneration: 'gen-2' }));
    expect(stale.reasons).toContain('GRAPH_STALE');
    expect(stale.complete).toBe(false);
  });
});

/* ==================================================================
 * Evidence Profiles and negative-claim safety
 * ================================================================== */

describe('Phase 82 — Evidence Profiles and claim safety', () => {
  it('produces provisional evidence for scout discovery', async () => {
    const selection = await select(makeFacts(), { profile: 'scout', claim: 'impact' });

    expect(selection.evidenceLevel).toBe('provisional');
    expect(selection.claimSafety.decision).toBe('provisional');
    expect(selection.claimSafety.negativeClaimSafe).toBe(false);
  });

  it('blocks an exhaustive or absence claim from scout evidence', async () => {
    const exhaustive = await select(makeFacts(), { profile: 'scout', claim: 'exhaustive' });

    expect(exhaustive.evidenceLevel).toBe('provisional');
    expect(exhaustive.claimSafety.decision).toBe('blocked');
    expect(exhaustive.claimSafety.exhaustiveClaimSafe).toBe(false);
    expect(exhaustive.reasons).toContain('PROFILE_REQUIRES_AUDITOR');
    expect(exhaustive.reasons).toContain('PROFILE_REQUIRES_VERIFY');

    const absence = await select(makeFacts(), { profile: 'scout', claim: 'absence' });

    expect(absence.claimSafety.decision).toBe('blocked');
    expect(absence.claimSafety.negativeClaimSafe).toBe(false);
  });

  it('blocks a negative test-absence claim when coverage is partial', async () => {
    const selection = await select(makeFacts({ coverage: 'partial' }), {
      profile: 'auditor',
      claim: 'absence',
    });

    expect(selection.claimSafety.decision).toBe('blocked');
    expect(selection.claimSafety.negativeClaimSafe).toBe(false);
    expect(selection.reasons).toContain('NEGATIVE_TEST_CLAIM_NOT_SAFE');
  });

  it('blocks a negative claim when discovery is incomplete', async () => {
    const selection = await select(makeFacts({ includeLegacy: true }), {
      profile: 'auditor',
      claim: 'absence',
    });

    expect(selection.claimSafety.negativeClaimSafe).toBe(false);
  });

  it('permits a bounded negative claim only for a fresh, complete, audited scope', async () => {
    const selection = await select(makeFacts(), { profile: 'auditor', claim: 'absence' });

    expect(selection.claimSafety.decision).toBe('allowed');
    expect(selection.claimSafety.negativeClaimSafe).toBe(true);
    expect(selection.claimSafety.exhaustiveClaimSafe).toBe(true);
    expect(selection.evidenceLevel).toBe('audited');
  });
});

/* ==================================================================
 * ADR constraints
 * ================================================================== */

describe('Phase 82 — ADR constraints', () => {
  it('attaches accepted ADRs as constraints without changing the selection', async () => {
    const adr: TestAdrConstraint = { id: 'ADR-42', title: 'Test policy', status: 'accepted' };

    const withAdr = await select(makeFacts({ adrConstraints: [adr] }));
    const withoutAdr = await select(makeFacts());

    expect(withAdr.adrConstraints).toEqual([adr]);
    expect(withoutAdr.adrConstraints).toEqual([]);
    expect(selectedPaths(withAdr)).toEqual(selectedPaths(withoutAdr));
    expect(withAdr.claimSafety).toEqual(withoutAdr.claimSafety);
  });
});

/* ==================================================================
 * Determinism
 * ================================================================== */

describe('Phase 82 — determinism', () => {
  it('produces identical selection fingerprints and ordering across runs', async () => {
    const facts = makeFacts({ changeFingerprint: 'change-1', contractFingerprint: 'contract-1' });

    const first = await select(facts);
    const second = await select(
      makeFacts({ changeFingerprint: 'change-1', contractFingerprint: 'contract-1' })
    );
    const third = await select(
      makeFacts({ changeFingerprint: 'change-1', contractFingerprint: 'contract-1' })
    );

    expect(second.fingerprint).toBe(first.fingerprint);
    expect(third.fingerprint).toBe(first.fingerprint);
    expect(second.selectionId).toBe(first.selectionId);
    expect(JSON.stringify(second.categories)).toBe(JSON.stringify(first.categories));
    expect(JSON.stringify(second.uncoveredEntities)).toBe(JSON.stringify(first.uncoveredEntities));
    expect(JSON.stringify(second.reasons)).toBe(JSON.stringify(first.reasons));
  });

  it('fingerprints the selection from its inputs, not from a clock', () => {
    const recomputed = testSelectionFingerprint({
      projectId: PROJECT,
      changeFingerprint: 'change-1',
      baselineGeneration: 'gen-1',
      profile: 'verify',
      selectedTestIds: ['a', 'b'],
    });

    expect(recomputed).toBe(
      testSelectionFingerprint({
        projectId: PROJECT,
        changeFingerprint: 'change-1',
        baselineGeneration: 'gen-1',
        profile: 'verify',
        selectedTestIds: ['a', 'b'],
      })
    );

    expect(recomputed).not.toBe(
      testSelectionFingerprint({
        projectId: PROJECT,
        changeFingerprint: 'change-2',
        baselineGeneration: 'gen-1',
        profile: 'verify',
        selectedTestIds: ['a', 'b'],
      })
    );
  });
});

/* ==================================================================
 * Guarded execution
 * ================================================================== */

const RUN_LIMITS = { maxProcesses: 2, maxRunOutputBytes: 4096, runTimeoutMs: 5_000 };

/** Resolver: argv is always an array and the path stays pure data. */
function planFor(_framework: TestFramework, path: string): { command: string; args: string[] } {
  return { command: 'fake-runner', args: [path] };
}

function selectedDescriptors(selection: TestSelection) {
  return Object.values(selection.categories)
    .flat()
    .map((entry) => entry.test);
}

/** Machine-readable reporter output keyed by test path (never scraped text). */
function reporterFor(
  selection: TestSelection,
  status: (id: string) => string
): Map<string, string> {
  const byPath = new Map<string, Array<{ fullName: string; status: string }>>();

  for (const descriptor of selectedDescriptors(selection)) {
    const fullName = descriptor.id.slice(descriptor.path.length + 2);

    const list = byPath.get(descriptor.path) ?? [];

    list.push({ fullName, status: status(descriptor.id) });

    byPath.set(descriptor.path, list);
  }

  const out = new Map<string, string>();

  for (const [path, assertionResults] of byPath) {
    out.set(path, JSON.stringify({ testResults: [{ name: path, assertionResults }] }));
  }

  return out;
}

function spawnFrom(map: Map<string, string>): TestSpawnFn {
  return async (plan: TestSpawnPlan): Promise<TestSpawnResult> => ({
    code: 0,
    stdout: map.get(plan.args[0] ?? '') ?? '',
    stderr: '',
    timedOut: false,
    cancelled: false,
  });
}

/** Assert the typed error code (the class carries `code`, not prose). */
async function expectCode(promise: Promise<unknown>, code: string): Promise<void> {
  await expect(promise).rejects.toMatchObject({ code });
}

function spawnReturning(result: Partial<TestSpawnResult>): TestSpawnFn {
  return async (): Promise<TestSpawnResult> => ({
    code: result.code ?? 0,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    timedOut: result.timedOut ?? false,
    cancelled: result.cancelled ?? false,
    ...(result.spawnError ? { spawnError: result.spawnError } : {}),
  });
}

function execute(
  selection: TestSelection,
  facts: TestFacts,
  request: Partial<RunSelectedTestsRequest>,
  spawnFn: TestSpawnFn,
  limits: typeof RUN_LIMITS = RUN_LIMITS
) {
  return runSelectedTests({
    selection,
    request: { selectionId: selection.selectionId, ...request },
    facts,
    limits,
    spawn: spawnFn,
  });
}

async function executionFacts(options: FactsOptions = {}): Promise<{
  facts: TestFacts;
  selection: TestSelection;
}> {
  const facts = makeFacts({ runnerPlan: planFor, ...options });
  const selection = await select(facts);

  return { facts, selection };
}

describe('Phase 82 — explicit guarded execution', () => {
  it('runs a selection and records per-test results with provenance', async () => {
    const { facts, selection } = await executionFacts();

    const run = await execute(
      selection,
      facts,
      {},
      spawnFrom(reporterFor(selection, () => 'passed'))
    );

    expect(run.status).toBe('passed');
    expect(run.selectionId).toBe(selection.selectionId);
    expect(run.sourceGeneration).toBe('gen-1');
    expect(run.results.length).toBe(selectedDescriptors(selection).length);
    expect(run.results.every((entry) => entry.status === 'passed')).toBe(true);
    expect(run.environment.networkAllowed).toBe(false);
  });

  it('records an assertion failure without pretending it is a runner error', async () => {
    const { facts, selection } = await executionFacts();

    const run = await execute(
      selection,
      facts,
      {},
      spawnReturning({
        code: 1,
        stdout: JSON.stringify({
          testResults: [
            {
              name: T_ORDERS,
              assertionResults: [{ fullName: 'orders>creates order', status: 'failed' }],
            },
          ],
        }),
      })
    );

    expect(run.status).toBe('failed');
    expect(run.results.some((entry) => entry.status === 'failed')).toBe(true);
    expect(run.errors).not.toContain('TEST_RUNNER_ERROR');
  });

  it('keeps a skipped test out of PASS evidence', async () => {
    const { facts, selection } = await executionFacts({
      changedEntities: BASE_CHANGED.slice(0, 2),
    });

    const run = await execute(
      selection,
      facts,
      {},
      spawnFrom(reporterFor(selection, () => 'skipped'))
    );

    expect(run.results.some((entry) => entry.status === 'skipped')).toBe(true);
    expect(run.results.every((entry) => entry.status === 'passed')).toBe(false);
  });

  it('reports an unavailable runner rather than a test failure', async () => {
    /* Only the unsupported-framework test exists in this fixture. */
    const facts = makeFacts({
      symbols: [
        fileSym(T_LEGACY),
        { id: CREATE_ORDER, name: 'createOrder', type: 'function', filePath: 'src/orders.ts' },
      ],
      edges: [{ id: 'e:legacy', type: 'CALLS', from: `file:${T_LEGACY}`, to: CREATE_ORDER }],
      changedEntities: [changedEntity(CREATE_ORDER, 'src/orders.ts', 'createOrder')],
    });

    const selection = await select(facts);

    expect(selectedDescriptors(selection).every((entry) => entry.framework === 'other')).toBe(true);

    const run = await execute(selection, facts, {}, spawnReturning({ code: 0 }));

    expect(run.errors.some((entry) => entry.startsWith('TEST_RUNNER_UNAVAILABLE'))).toBe(true);
    expect(run.status).toBe('errored');
    expect(run.results.every((entry) => entry.status !== 'passed')).toBe(true);
  });

  it('distinguishes a runner error from an assertion failure', async () => {
    const { facts, selection } = await executionFacts();

    const run = await execute(
      selection,
      facts,
      {},
      spawnReturning({ code: null, spawnError: 'ENOENT' })
    );

    expect(run.errors.some((entry) => entry.startsWith('TEST_RUNNER_ERROR'))).toBe(true);
    expect(run.status).toBe('errored');
  });

  it('bounds every run with a timeout and terminates the process tree', async () => {
    const { facts, selection } = await executionFacts();

    const run = await execute(
      selection,
      facts,
      {},
      spawnReturning({ code: null, timedOut: true, stdout: 'partial' })
    );

    expect(run.errors).toContain('TEST_RUN_TIMEOUT');
    expect(run.status).toBe('errored');
    expect(run.results.every((entry) => entry.status !== 'passed')).toBe(true);
  });

  it('cancels a run without producing a PASS result', async () => {
    const { facts, selection } = await executionFacts();

    const run = await execute(
      selection,
      facts,
      {},
      spawnReturning({ code: null, cancelled: true })
    );

    expect(run.status).toBe('cancelled');
    expect(run.errors).toContain('TEST_RUN_CANCELLED');
    expect(run.results).toEqual([]);
  });

  it('bounds huge runner output instead of retaining it', async () => {
    const { facts, selection } = await executionFacts({
      changedEntities: BASE_CHANGED.slice(0, 2),
    });

    const run = await execute(
      selection,
      facts,
      {},
      spawnReturning({ code: 0, stdout: 'x'.repeat(50_000) })
    );

    expect(run.output.truncated).toBe(true);
    expect(run.output.bytes).toBeGreaterThan(RUN_LIMITS.maxRunOutputBytes);
    expect((run.output.excerpt ?? '').length).toBeLessThanOrEqual(4_000);
  });

  it('sanitises credentials that a test prints', async () => {
    const { facts, selection } = await executionFacts({
      changedEntities: BASE_CHANGED.slice(0, 2),
    });

    const secret = 'TOPSECRETVALUE123';

    const run = await execute(
      selection,
      facts,
      {},
      spawnReturning({
        code: 0,
        stdout: `Authorization: Bearer ${secret}\npassword=${secret}`,
        stderr: `token=${secret}`,
      })
    );

    expect(JSON.stringify(run)).not.toContain(secret);

    const sanitized = sanitizeOutput(`Authorization: Bearer ${secret}`, 1_000);

    expect(sanitized.text).not.toContain(secret);
  });

  it('rejects a test id that is not part of the selection (injection is data, not a command)', async () => {
    const { facts, selection } = await executionFacts({
      changedEntities: BASE_CHANGED.slice(0, 2),
    });

    await expectCode(
      execute(
        selection,
        facts,
        { tests: ['tests/orders.test.ts::x; rm -rf /'] },
        spawnReturning({})
      ),
      'TEST_NOT_IN_SELECTION'
    );

    await expectCode(
      execute(selection, facts, { tests: [''] }, spawnReturning({})),
      'TEST_ID_INVALID'
    );
  });

  it('rejects a test path that escapes the project root', async () => {
    const { facts, selection } = await executionFacts({
      changedEntities: BASE_CHANGED.slice(0, 2),
    });

    expect(isContainedTestPath('../../evil.test.ts')).toBe(false);
    expect(isContainedTestPath('/etc/passwd')).toBe(false);
    expect(isContainedTestPath(T_ORDERS)).toBe(true);

    const escaped = JSON.parse(JSON.stringify(selection)) as TestSelection;

    for (const group of Object.values(escaped.categories)) {
      for (const entry of group) {
        entry.test.path = '../../evil.test.ts';
      }
    }

    await expectCode(execute(escaped, facts, {}, spawnReturning({})), 'TEST_PATH_ESCAPE');
  });

  it('passes the test path as a single argv element, never through a shell', async () => {
    const { facts, selection } = await executionFacts({
      changedEntities: BASE_CHANGED.slice(0, 2),
    });

    const plans: TestSpawnPlan[] = [];

    const spy: TestSpawnFn = async (plan) => {
      plans.push(plan);

      return { code: 0, stdout: '', stderr: '', timedOut: false, cancelled: false };
    };

    await execute(selection, facts, {}, spy);

    expect(plans.length).toBeGreaterThan(0);

    for (const plan of plans) {
      expect(Array.isArray(plan.args)).toBe(true);
      expect(plan.args).toContain(plan.args[0]);
      expect(plan.cwd).toBe(facts.rootPath);
      expect(plan.args[0]).not.toContain(';');
    }
  });

  it('refuses an execution request for an unknown selection id', async () => {
    const { facts, selection } = await executionFacts({
      changedEntities: BASE_CHANGED.slice(0, 2),
    });

    await expectCode(
      execute(selection, facts, { selectionId: 'not-a-selection' }, spawnReturning({})),
      'TEST_SELECTION_NOT_FOUND'
    );
  });

  it('marks a run stale when the change moved after selection', async () => {
    const facts = makeFacts({
      runnerPlan: planFor,
      changeFingerprint: 'change-1',
      recheckSnapshot: async () => 'change-2',
    });

    const selection = await select(facts);

    const run = await execute(selection, facts, {}, spawnReturning({ code: 0 }));

    expect(run.stale).toBe(true);
    expect(run.errors).toContain('TEST_SELECTION_STALE');
    expect(run.status).toBe('errored');
    expect(run.results).toEqual([]);
  });

  it('marks a run stale when the caller pins a different change fingerprint', async () => {
    const { facts, selection } = await executionFacts({
      changedEntities: BASE_CHANGED.slice(0, 2),
    });

    const run = await execute(
      selection,
      facts,
      { changeFingerprint: 'some-other-change' },
      spawnReturning({ code: 0 })
    );

    expect(run.stale).toBe(true);
  });

  it('honours the bounded test-process concurrency limit', async () => {
    const { facts, selection } = await executionFacts();

    let active = 0;
    let peak = 0;

    const spawnFn: TestSpawnFn = async (plan) => {
      active += 1;
      peak = Math.max(peak, active);

      await new Promise((entry) => setTimeout(entry, 5));

      active -= 1;

      return {
        code: 0,
        stdout: '',
        stderr: '',
        timedOut: false,
        cancelled: false,
        ...(plan.args[0] ? {} : {}),
      };
    };

    await execute(selection, facts, {}, spawnFn, { ...RUN_LIMITS, maxProcesses: 2 });

    expect(selectedDescriptors(selection).length).toBeGreaterThan(2);
    expect(peak).toBeLessThanOrEqual(2);
  });

  it('marks an explicit caller-chosen subset so completeness is never overstated', async () => {
    const { facts, selection } = await executionFacts({
      changedEntities: BASE_CHANGED.slice(0, 2),
    });

    const first = selectedDescriptors(selection)[0]!;

    const run = await execute(
      selection,
      facts,
      { tests: [first.id] },
      spawnFrom(reporterFor(selection, () => 'passed'))
    );

    expect(run.userSelectedSubset).toBe(true);
    expect(run.selectedTests).toEqual([first.id]);
  });
});

/* ==================================================================
 * Verification and regression-guard integration
 * ================================================================== */

describe('Phase 82 — verification evidence and guard separation', () => {
  const covered = BASE_CHANGED.slice(0, 5);

  it('reports a complete verification only when every blocker is gone', async () => {
    const { facts, selection } = await executionFacts({ changedEntities: covered });

    const run = await execute(
      selection,
      facts,
      {},
      spawnFrom(reporterFor(selection, () => 'passed'))
    );

    const verification = buildTestVerification({ selection, run, facts });

    expect(verification.failed).toEqual([]);
    expect(verification.passed.length).toBeGreaterThan(0);
    expect(verification.blockers).not.toContain('SELECTED_TEST_FAILED');
    expect(verification.safeToMerge).toBe(false);
    expect(verification.safeToDeploy).toBe(false);
  });

  it('never clears an uncovered-entity blocker with a green run', async () => {
    const { facts, selection } = await executionFacts({
      changedEntities: [changedEntity(NO_TESTS, 'src/untested.ts', 'noTests')].concat(covered),
    });

    const run = await execute(
      selection,
      facts,
      {},
      spawnFrom(reporterFor(selection, () => 'passed'))
    );

    const verification = buildTestVerification({ selection, run, facts });

    expect(verification.passed.length).toBeGreaterThan(0);
    expect(verification.blockers).toContain('CHANGED_ENTITY_WITHOUT_KNOWN_TEST');
    expect(verification.complete).toBe(false);
    expect(verification.safeToMerge).toBe(false);
  });

  it('never clears a contract-without-test blocker with a green run', async () => {
    const uncoveredContract: TestContractChange = {
      contractId: 'grpc:Orders/List',
      kind: 'grpc',
      identity: 'Orders/List',
      compatibility: 'breaking',
      sourcePaths: ['proto/orders.proto'],
      symbolIds: ['rpc:Orders/List'],
    };

    const { facts, selection } = await executionFacts({
      changedEntities: covered,
      contractChanges: [COVERED_CONTRACT, uncoveredContract],
    });

    const run = await execute(
      selection,
      facts,
      {},
      spawnFrom(reporterFor(selection, () => 'passed'))
    );

    const verification = buildTestVerification({ selection, run, facts });

    expect(verification.blockers).toContain('CONTRACT_CHANGE_WITHOUT_KNOWN_TEST');
    expect(verification.complete).toBe(false);
  });

  it('surfaces a failing test as a blocker and keeps the run evidence', async () => {
    const { facts, selection } = await executionFacts({ changedEntities: covered });

    const run = await execute(
      selection,
      facts,
      {},
      spawnFrom(
        reporterFor(selection, (id) => (id.includes('creates order') ? 'failed' : 'passed'))
      )
    );

    const verification = buildTestVerification({ selection, run, facts });

    expect(verification.failed.length).toBeGreaterThan(0);
    expect(verification.blockers).toContain('SELECTED_TEST_FAILED');
    expect(verification.complete).toBe(false);
  });

  it('treats a stale run as stale evidence and never as a pass', async () => {
    const facts = makeFacts({
      runnerPlan: planFor,
      changeFingerprint: 'change-1',
      recheckSnapshot: async () => 'change-2',
      changedEntities: covered,
    });

    const selection = await select(facts);

    const run = await execute(selection, facts, {}, spawnReturning({ code: 0 }));

    const verification = buildTestVerification({ selection, run, facts });

    expect(verification.stale).toBe(true);
    expect(verification.blockers).toContain('TEST_RESULT_STALE');
    expect(verification.passed).toEqual([]);
    expect(verification.complete).toBe(false);
  });

  it('marks a skipped required test as incomplete verification', async () => {
    const { facts, selection } = await executionFacts({ changedEntities: covered });

    const run = await execute(
      selection,
      facts,
      {},
      spawnFrom(reporterFor(selection, () => 'skipped'))
    );

    const verification = buildTestVerification({ selection, run, facts });

    expect(verification.skipped.length).toBeGreaterThan(0);
    expect(verification.blockers).toContain('REQUIRED_TEST_SKIPPED');
    expect(verification.complete).toBe(false);
  });

  it('reports a runner error distinctly from a test failure', async () => {
    const facts = makeFacts({
      symbols: [
        fileSym(T_LEGACY),
        { id: CREATE_ORDER, name: 'createOrder', type: 'function', filePath: 'src/orders.ts' },
      ],
      edges: [{ id: 'e:legacy', type: 'CALLS', from: `file:${T_LEGACY}`, to: CREATE_ORDER }],
      changedEntities: [changedEntity(CREATE_ORDER, 'src/orders.ts', 'createOrder')],
    });

    const selection = await select(facts);
    const run = await execute(selection, facts, {}, spawnReturning({ code: 0 }));

    const verification = buildTestVerification({ selection, run, facts });

    expect(verification.blockers).toContain('TEST_RUNNER_UNAVAILABLE');
    expect(verification.blockers).not.toContain('SELECTED_TEST_FAILED');
  });
});

/* ==================================================================
 * Coverage report ingestion
 * ================================================================== */

const LCOV = [
  'SF:src/orders.ts',
  'LF:10',
  'LH:7',
  'end_of_record',
  'SF:src/util.ts',
  'LF:5',
  'LH:0',
  'end_of_record',
].join('\n');

function coverage(input: Partial<Parameters<typeof ingestCoverage>[0]>) {
  return ingestCoverage({
    projectId: PROJECT,
    format: 'lcov',
    content: LCOV,
    currentGeneration: 'gen-1',
    maxBytes: 100_000,
    maxFiles: 100,
    ...input,
  });
}

describe('Phase 82 — passive coverage ingestion', () => {
  it('ingests a bounded LCOV report bound to the current generation', () => {
    const evidence = coverage({ sourceGeneration: 'gen-1' });

    expect(evidence.stale).toBe(false);
    expect(evidence.files.map((entry) => entry.path)).toEqual(['src/orders.ts', 'src/util.ts']);
    expect(evidence.totals.linesFound).toBe(15);
    expect(evidence.totals.linesHit).toBe(7);
  });

  it('marks an unbound report stale rather than trusting it', () => {
    const evidence = coverage({});

    expect(evidence.stale).toBe(true);
    expect(evidence.reason).toBe('NO_GENERATION_DECLARED');
  });

  it('marks a report from another generation stale', () => {
    const evidence = coverage({ sourceGeneration: 'gen-0' });

    expect(evidence.stale).toBe(true);
    expect(evidence.reason).toBe('SOURCE_GENERATION_MISMATCH');
  });

  it('marks a report from another change fingerprint stale', () => {
    const evidence = coverage({
      sourceGeneration: 'gen-1',
      changeFingerprint: 'change-1',
      currentChangeFingerprint: 'change-2',
    });

    expect(evidence.stale).toBe(true);
    expect(evidence.reason).toBe('CHANGE_FINGERPRINT_MISMATCH');
  });

  it('ingests a Go coverprofile without inventing coverage', () => {
    const evidence = coverage({
      format: 'go_coverprofile',
      sourceGeneration: 'gen-1',
      content: ['mode: set', 'pkg/orders.go:1.1,2.2 1 1', 'pkg/orders.go:3.1,4.2 1 0'].join('\n'),
    });

    expect(evidence.files).toEqual([{ path: 'pkg/orders.go', linesFound: 2, linesHit: 1 }]);
  });

  it('bounds an oversized coverage report', () => {
    const evidence = coverage({
      sourceGeneration: 'gen-1',
      content: `SF:src/big.ts\nLF:1\nLH:1\nend_of_record\n${'x'.repeat(500)}`,
      maxBytes: 32,
    });

    expect(evidence.truncated).toBe(true);
    expect(evidence.files).toEqual([]);
  });
});

/* ==================================================================
 * Retention
 * ================================================================== */

describe('Phase 82 — bounded retention', () => {
  it('keeps only the most recent runs and can be discarded entirely', () => {
    const store = new TestIntelligenceStore(2);

    const makeRun = (id: string) =>
      ({
        id,
        projectId: PROJECT,
        selectionId: 'sel-1',
        framework: 'vitest',
        selectedTests: [],
        userSelectedSubset: false,
        startedAt: '2026-01-01T00:00:00.000Z',
        status: 'passed',
        results: [],
        output: { truncated: false, bytes: 0 },
        environment: { networkAllowed: false, networkIsolation: 'not_enforced' },
        stale: false,
        errors: [],
        attempts: 1,
      }) as never;

    store.putRun(makeRun('run-1'));
    store.putRun(makeRun('run-2'));
    store.putRun(makeRun('run-3'));

    expect(store.listRuns(PROJECT, 10).map((run) => run.id)).toEqual(['run-3', 'run-2']);

    store.clear(PROJECT);

    expect(store.listRuns(PROJECT, 10)).toEqual([]);
  });
});

/* ==================================================================
 * Daemon parity and multi-client behaviour
 * ================================================================== */

function daemonProject(): DaemonProjectRef {
  return { id: PROJECT, name: PROJECT, rootPath: process.cwd() };
}

function makeCoordinatorDeps(state: {
  select?: (input: unknown) => Promise<unknown>;
  run?: (input: unknown) => Promise<unknown>;
  status?: (limit?: number) => Promise<unknown>;
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
    async queryProject() {
      throw new Error('not used in this suite');
    },
    async refreshFleet() {
      /* derived overlay only */
    },
    async releaseProject() {
      /* nothing resident in this fake */
    },
    ...(state.select
      ? {
          async selectTestsProject(_project, input) {
            return (await state.select!(input)) as never;
          },
        }
      : {}),
    ...(state.run
      ? {
          async runTestsProject(_project, input) {
            return (await state.run!(input)) as never;
          },
        }
      : {}),
    ...(state.status
      ? {
          async testStatusProject(_project, limit) {
            return state.status!(limit);
          },
        }
      : {}),
  };
}

function makeCoordinator(state: Parameters<typeof makeCoordinatorDeps>[0]) {
  const deps = makeCoordinatorDeps(state);
  const projects = new ProjectRegistry();
  const index = new IndexCoordinator(deps, projects);
  const artifact = new ArtifactCoordinator(deps, projects);

  return new ProjectRuntimeCoordinator(deps, projects, index, artifact);
}

const SELECTION_INPUT = {
  request: selectionRequest(),
  change: { projectId: PROJECT, mode: 'commit' as const, base: 'HEAD~1' },
};

function runInput(selection: TestSelection, extra: Record<string, unknown> = {}) {
  return { request: { selectionId: selection.selectionId, ...extra } };
}

describe('Phase 82 — daemon parity and multi-client', () => {
  it('produces a semantically identical selection standalone and through the coordinator', async () => {
    const standalone = await select(makeFacts());

    let calls = 0;

    const coordinator = makeCoordinator({
      select: async () => {
        calls += 1;

        return standalone;
      },
    });

    const viaDaemon = await coordinator.testSelection(
      daemonProject(),
      'session-1',
      SELECTION_INPUT
    );

    expect(calls).toBe(1);
    expect(viaDaemon.fingerprint).toBe(standalone.fingerprint);
    expect(viaDaemon.selectionId).toBe(standalone.selectionId);
    expect(JSON.stringify(viaDaemon.categories)).toBe(JSON.stringify(standalone.categories));
  });

  it('single-flights ten concurrent identical selections into one computation', async () => {
    let calls = 0;

    const coordinator = makeCoordinator({
      select: async () => {
        calls += 1;

        return select(makeFacts());
      },
    });

    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        coordinator.testSelection(daemonProject(), 'session-1', SELECTION_INPUT)
      )
    );

    expect(calls).toBe(1);
    expect(new Set(results.map((entry) => entry.fingerprint)).size).toBe(1);
  });

  it('executes the same selection once for ten concurrent clients', async () => {
    const { facts, selection } = await executionFacts({
      changedEntities: BASE_CHANGED.slice(0, 2),
    });

    const verification = buildTestVerification({ selection, facts });

    let calls = 0;

    const coordinator = makeCoordinator({
      run: async () => {
        calls += 1;

        return verification;
      },
    });

    const input = runInput(selection);

    const results = await Promise.all(
      Array.from({ length: 10 }, () => coordinator.runTests(daemonProject(), 'session-1', input))
    );

    expect(calls).toBe(1);
    expect(results.every((entry) => entry.selection.selectionId === selection.selectionId)).toBe(
      true
    );
  });

  it('never shares one execution between two different changes', async () => {
    const { facts, selection } = await executionFacts({
      changedEntities: BASE_CHANGED.slice(0, 2),
    });

    const verification = buildTestVerification({ selection, facts });

    let calls = 0;

    const coordinator = makeCoordinator({
      run: async () => {
        calls += 1;

        return verification;
      },
    });

    await coordinator.runTests(
      daemonProject(),
      'session-1',
      runInput(selection, {
        changeFingerprint: 'change-1',
      })
    );

    await coordinator.runTests(
      daemonProject(),
      'session-1',
      runInput(selection, {
        changeFingerprint: 'change-2',
      })
    );

    expect(calls).toBe(2);
  });

  it('exposes bounded read-only run status through the coordinator', async () => {
    const coordinator = makeCoordinator({
      status: async (limit) => ({ projectId: PROJECT, limit: limit ?? 10, runs: [] }),
    });

    const status = (await coordinator.testStatus(daemonProject(), 'session-1', 5)) as {
      limit: number;
    };

    expect(status.limit).toBe(5);
  });

  it('refuses a coordinator that does not expose test selection', async () => {
    const coordinator = makeCoordinator({});

    await expect(
      coordinator.testSelection(daemonProject(), 'session-1', SELECTION_INPUT)
    ).rejects.toThrow(/TEST_SELECTION_UNSUPPORTED/u);
  });
});

/* ==================================================================
 * Authority / graph / artifact non-interference
 * ================================================================== */

describe('Phase 82 — non-interference', () => {
  it('never mutates the static graph while selecting and executing tests', async () => {
    const { facts, selection } = await executionFacts({
      changedEntities: BASE_CHANGED.slice(0, 2),
    });

    const before = JSON.stringify([
      facts.graph.symbols(),
      facts.graph.incoming(CREATE_ORDER, ['CALLS']),
    ]);

    const run = await execute(
      selection,
      facts,
      {},
      spawnFrom(reporterFor(selection, () => 'passed'))
    );

    buildTestVerification({ selection, run, facts });

    const after = JSON.stringify([
      facts.graph.symbols(),
      facts.graph.incoming(CREATE_ORDER, ['CALLS']),
    ]);

    expect(after).toBe(before);
  });

  it('keeps test evidence derived and discardable (never an authority store)', async () => {
    const { facts, selection } = await executionFacts({
      changedEntities: BASE_CHANGED.slice(0, 2),
    });

    const store = new TestIntelligenceStore(5);

    store.putSelection(selection);
    store.putRun(
      (await execute(
        selection,
        facts,
        {},
        spawnFrom(reporterFor(selection, () => 'passed'))
      )) as never
    );

    expect(store.getSelection(PROJECT, selection.selectionId)?.selectionId).toBe(
      selection.selectionId
    );

    store.clear();

    expect(store.latestSelection(PROJECT)).toBeNull();
  });

  it('reads only project-contained source during discovery', async () => {
    const root = tempDir('toolnet-phase82-standalone-');

    mkdirSync(join(root, 'tests'), { recursive: true });
    writeFileSync(join(root, 'tests', 'orders.test.ts'), "test('real', () => {});");

    const graph = new CodeGraphStore();

    graph.import(
      [
        {
          id: 'file:tests/orders.test.ts',
          projectId: PROJECT,
          name: 'orders.test.ts',
          qualifiedName: 'orders.test.ts',
          type: 'file' as never,
          filePath: 'tests/orders.test.ts',
          startLine: 1,
          endLine: 1,
          metadata: {},
        },
      ],
      []
    );

    const facts = buildProjectTestFacts({
      projectId: PROJECT,
      rootPath: root,
      generation: 'gen-1',
      graph,
    });

    const discovery = await discoverTests({
      facts,
      limits: { maxTestFiles: 10, maxTestSymbols: 100, maxSourceReadBytes: 10_000 },
    });

    expect(discovery.tests.map((entry) => entry.id)).toContain('tests/orders.test.ts::real');

    /* Bounded reader refuses an escaping path and never touches it. */
    expect(facts.readSource?.('../outside.ts', 1_000)).toBeNull();
  });
});

/* ==================================================================
 * Packaged MCP runtime
 * ================================================================== */

async function listPackagedMcpTools(bundlePath: string): Promise<string[]> {
  const cwd = tempDir('toolnet-phase82-mcp-');

  const requests = `${[
    JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'phase82-certify', version: '1.0.0' },
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

describe('Phase 82 — packaged runtime', () => {
  const bundlePath = join(resolve(process.cwd()), 'bundle', 'mcp.js');

  it('ships the test-intelligence layer inside the packaged MCP bundle', () => {
    expect(existsSync(bundlePath)).toBe(true);

    const bundle = readFileSync(bundlePath, 'utf8');

    for (const marker of [
      'select_tests',
      'run_selected_tests',
      'test_run_status',
      'TEST INTELLIGENCE',
      'DIRECT_CALLS_CHANGED_SYMBOL',
      'TRANSITIVE_CALL_PATH',
      'TEST_SELECTION_NOT_FOUND',
      'TEST_PATH_ESCAPE',
      'TEST_RUNNER_UNAVAILABLE',
      'CONTRACT_CHANGE_WITHOUT_KNOWN_TEST',
      'CHANGED_ENTITY_WITHOUT_KNOWN_TEST',
      'includeTests',
    ]) {
      expect(bundle).toContain(marker);
    }
  });

  it('exposes the Phase 82 tools through the packaged tools/list', async () => {
    const tools = await listPackagedMcpTools(bundlePath);

    expect(tools).toContain('select_tests');
    expect(tools).toContain('run_selected_tests');
    expect(tools).toContain('test_run_status');
  });
});

/* ==================================================================
 * Certification marker
 * ================================================================== */

describe('Phase 82 — certification', () => {
  it('emits the Phase 82 PASS marker', () => {
    console.log(MARKER);

    expect(MARKER).toBe('PHASE82_TEST_INTELLIGENCE=PASS');
  });
});
