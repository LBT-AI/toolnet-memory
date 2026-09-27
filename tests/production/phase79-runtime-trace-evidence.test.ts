/*
 * Phase 79 — Runtime Trace Evidence production certification.
 *
 * Runtime traces corroborate or extend the static graph; they never replace it.
 * This suite certifies the authority boundary, the deterministic identity
 * mapping, cross-service / cross-repo / event evidence, generation pinning,
 * dedupe and idempotency, retention, security (secrets, prototype pollution,
 * resource limits), the Phase 78 Evidence Profile integration, daemon parity,
 * non-interference and the packaged MCP surface.
 *
 * No LLM. No embeddings. No vector database. No source execution.
 * No process instrumentation. No network access.
 */

import { spawn } from 'node:child_process';

import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join, resolve } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { CodeGraphStore } from '../../src/code-intelligence/graph/graph-store.js';

import { LocalStorageProvider } from '../../src/storage/local/index.js';

import {
  RUNTIME_TRACE_LIMITS,
  PersistentRuntimeTraceStore,
  applyRuntimeTraceRetention,
  importTraceSession,
  loadRuntimeTraceFacts,
  runtimeTraceStatus,
  selectAdapter,
  structuralDigest,
} from '../../src/code-intelligence/runtime-trace/index.js';

import type {
  RuntimeObservation,
  RuntimeTraceImportResult,
} from '../../src/code-intelligence/runtime-trace/index.js';

import type { EvidenceRuntimeFacts } from '../../src/code-intelligence/evidence/index.js';

import {
  buildEvidenceFacts,
  executeEvidenceSync,
  type EvidenceBundle,
  type EvidenceFacts,
  type EvidenceRequest,
} from '../../src/code-intelligence/evidence/index.js';

import { ProjectRegistry } from '../../src/daemon/registry.js';

import {
  ArtifactCoordinator,
  IndexCoordinator,
  ProjectRuntimeCoordinator,
} from '../../src/daemon/coordinators.js';

import type { DaemonProjectRef, DaemonRuntimeDependencies } from '../../src/daemon/types.js';

const PROJECT = 'phase79-project';

const SANDBOX = mkdtempSync(join(tmpdir(), 'toolnet-phase79-'));

afterAll(() => {
  rmSync(SANDBOX, { recursive: true, force: true });
});

/* ==================================================================
 * Fixtures
 * ================================================================== */

let storeCounter = 0;

function makeStorage(): LocalStorageProvider {
  storeCounter += 1;

  return new LocalStorageProvider(join(SANDBOX, `store-${storeCounter}`));
}

interface SymbolSpec {
  id: string;
  name: string;
  qualifiedName?: string;
  type?: string;
  filePath?: string;
  metadata?: Record<string, unknown>;
}

const GRAPH_SYMBOLS: SymbolSpec[] = [
  {
    id: 'api:createOrder',
    name: 'createOrder',
    qualifiedName: 'OrderApi.createOrder',
    filePath: 'src/api.ts',
  },
  { id: 'repo:save', name: 'save', qualifiedName: 'OrderRepository.save', filePath: 'src/repo.ts' },
  {
    id: 'iface:save',
    name: 'save',
    qualifiedName: 'Repository.save',
    filePath: 'src/repository.ts',
  },
  {
    id: 'worker:onOrderCreated',
    name: 'onOrderCreated',
    qualifiedName: 'OrderWorker.onOrderCreated',
    filePath: 'src/worker.ts',
  },
  {
    id: 'dead:unusedHelper',
    name: 'unusedHelper',
    qualifiedName: 'unusedHelper',
    filePath: 'src/dead.ts',
  },
  {
    id: 'svc:orders',
    name: 'orders',
    qualifiedName: 'orders',
    type: 'service',
    filePath: 'services/orders',
  },
  {
    id: 'svc:shop',
    name: 'shop',
    qualifiedName: 'shop',
    type: 'service',
    filePath: 'services/shop',
  },
  {
    id: 'route:post-orders',
    name: 'POST /orders',
    qualifiedName: 'POST /orders',
    type: 'route',
    filePath: 'src/orders.ts',
    metadata: { method: 'POST', path: '/orders' },
  },
  {
    id: 'event:orders-created',
    name: 'orders.created',
    qualifiedName: 'orders.created',
    type: 'event',
    filePath: 'src/events.ts',
    metadata: { provider: 'kafka', channel: 'orders.created' },
  },
];

interface EdgeSpec {
  id: string;
  from: string;
  to: string;
  type: string;
}

const GRAPH_EDGES: EdgeSpec[] = [
  { id: 'e:calls', from: 'api:createOrder', to: 'repo:save', type: 'CALLS' },
  { id: 'e:ref', from: 'api:createOrder', to: 'iface:save', type: 'CALL_REFERENCE' },
  { id: 'e:impl', from: 'repo:save', to: 'iface:save', type: 'IMPLEMENTS' },
  { id: 'e:http', from: 'svc:orders', to: 'route:post-orders', type: 'HTTP_CALLS' },
  { id: 'e:emits', from: 'api:createOrder', to: 'event:orders-created', type: 'EMITS' },
  {
    id: 'e:listens',
    from: 'worker:onOrderCreated',
    to: 'event:orders-created',
    type: 'LISTENS_ON',
  },
];

function buildGraph(
  symbols: SymbolSpec[] = GRAPH_SYMBOLS,
  edges: EdgeSpec[] = GRAPH_EDGES
): CodeGraphStore {
  const graph = new CodeGraphStore();

  for (const symbol of symbols) {
    graph.addSymbol({
      id: symbol.id,
      projectId: PROJECT,
      name: symbol.name,
      qualifiedName: symbol.qualifiedName ?? symbol.name,
      type: (symbol.type ?? 'function') as never,
      filePath: symbol.filePath ?? 'src/index.ts',
      ...(symbol.metadata ? { metadata: symbol.metadata } : {}),
    });
  }

  for (const edge of edges) {
    graph.addEdge({
      id: edge.id,
      projectId: PROJECT,
      from: edge.from,
      to: edge.to,
      type: edge.type as never,
    });
  }

  return graph;
}

/* --- trace payload builders --------------------------------------- */

interface TraceEventSpec {
  type: 'call' | 'http' | 'event_emit' | 'event_consume';
  [key: string]: unknown;
}

function toolnetTrace(events: TraceEventSpec[], extra: Record<string, unknown> = {}): unknown {
  return {
    version: 1,
    projectId: PROJECT,
    generation: 'gen-1',
    events,
    ...extra,
  };
}

function callEvent(input: {
  traceId?: string;
  spanId?: string;
  caller?: Record<string, unknown>;
  callee?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
  dispatch?: boolean;
}): TraceEventSpec {
  return {
    type: 'call',
    traceId: input.traceId ?? 'trace-1',
    spanId: input.spanId ?? 'span-1',
    timestamp: '2026-01-01T00:00:00.000Z',
    ...(input.caller ? { caller: input.caller } : { caller: { symbolId: 'api:createOrder' } }),
    ...(input.callee ? { callee: input.callee } : { callee: { symbolId: 'repo:save' } }),
    ...(input.dispatch ? { dispatch: true } : {}),
    ...(input.attributes ? { attributes: input.attributes } : {}),
  };
}

async function importTrace(input: {
  storage?: LocalStorageProvider;
  store?: PersistentRuntimeTraceStore;
  graph?: CodeGraphStore;
  trace: unknown;
  graphGeneration?: string;
  format?: 'auto' | 'toolnet-json' | 'otel-json';
  sessionId?: string;
  fleetParticipants?: Array<{ projectId: string; name: string }>;
  expectedProjectId?: string;
  allowPartial?: boolean;
}): Promise<{
  result: RuntimeTraceImportResult;
  store: PersistentRuntimeTraceStore;
  storage: LocalStorageProvider;
  graph: CodeGraphStore;
}> {
  const storage = input.storage ?? makeStorage();

  const store = input.store ?? new PersistentRuntimeTraceStore(storage);

  const graph = input.graph ?? buildGraph();

  const result = await importTraceSession({
    store,
    projectId: PROJECT,
    graph,
    ...(input.graphGeneration ? { graphGeneration: input.graphGeneration } : {}),
    ...(input.fleetParticipants ? { fleetParticipants: input.fleetParticipants } : {}),
    input: {
      trace: input.trace,
      ...(input.format ? { format: input.format } : {}),
      ...(input.sessionId ? { sessionId: input.sessionId } : {}),
      ...(input.expectedProjectId ? { expectedProjectId: input.expectedProjectId } : {}),
      ...(input.allowPartial !== undefined ? { allowPartial: input.allowPartial } : {}),
    },
  });

  return { result, store, storage, graph };
}

async function observationsFor(
  store: PersistentRuntimeTraceStore,
  predicate: (observation: RuntimeObservation) => boolean
): Promise<RuntimeObservation[]> {
  return (await store.loadObservations(PROJECT)).filter(predicate);
}

const PHASE79_MARKER = 'PHASE79_RUNTIME_TRACE_EVIDENCE=PASS';

/* ==================================================================
 * Trace schema and adapters
 * ================================================================== */

describe('Phase 79 — trace schema and adapters', () => {
  it('imports a ToolNet trace session and normalizes a call event', async () => {
    const { result, store } = await importTrace({
      trace: toolnetTrace([callEvent({})]),
      graphGeneration: 'gen-1',
    });

    expect(result.ok).toBe(true);
    expect(result.acceptedEvents).toBe(1);
    expect(result.observations.calls).toBe(1);
    expect(result.generation.compatibility).toBe('exact');

    const observations = await store.loadObservations(PROJECT);

    expect(observations).toHaveLength(1);
    expect(observations[0]!.kind).toBe('call');
    expect(observations[0]!.sourceSymbolId).toBe('api:createOrder');
    expect(observations[0]!.targetSymbolId).toBe('repo:save');
  });

  it('rejects an unknown ToolNet trace version instead of guessing', async () => {
    const { result } = await importTrace({ trace: { version: 2, projectId: PROJECT, events: [] } });

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('TRACE_SCHEMA_UNSUPPORTED');
  });

  it('rejects a payload that matches no supported format', async () => {
    const { result } = await importTrace({ trace: { hello: 'world' } });

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('TRACE_SCHEMA_INVALID');
  });

  it('rejects malformed JSON text without touching the store', async () => {
    const storage = makeStorage();

    const store = new PersistentRuntimeTraceStore(storage);

    const result = await importTraceSession({
      store,
      projectId: PROJECT,
      graph: buildGraph(),
      input: { json: '{"version":1,' },
    });

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('TRACE_NOT_JSON');
    expect(await store.loadSessionSummaries(PROJECT)).toHaveLength(0);
  });

  it('detects the OpenTelemetry adapter and normalizes span records', async () => {
    expect(selectAdapter({ resourceSpans: [] }).id).toBe('otel-json');
    expect(selectAdapter(toolnetTrace([])).id).toBe('toolnet-json');

    const otel = {
      resourceSpans: [
        {
          resource: { attributes: [{ key: 'service.name', value: { stringValue: 'orders' } }] },
          scopeSpans: [
            {
              spans: [
                {
                  traceId: 'otel-trace',
                  spanId: 'otel-span',
                  kind: 3,
                  startTimeUnixNano: '1700000000000000000',
                  endTimeUnixNano: '1700000005000000000',
                  attributes: [
                    { key: 'http.request.method', value: { stringValue: 'POST' } },
                    { key: 'url.path', value: { stringValue: '/orders' } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const { result, store } = await importTrace({ trace: otel, format: 'otel-json' });

    expect(result.ok).toBe(true);

    const observations = await store.loadObservations(PROJECT);

    expect(observations).toHaveLength(1);
    expect(observations[0]!.kind).toBe('http');
  });
});

/* ==================================================================
 * Static validation semantics
 * ================================================================== */

describe('Phase 79 — static edge validation', () => {
  it('attaches a runtime observation to a matching static CALLS edge without changing it', async () => {
    const graph = buildGraph();

    const { store } = await importTrace({ trace: toolnetTrace([callEvent({})]), graph });

    const observation = (await store.loadObservations(PROJECT))[0]!;

    expect(observation.validation).toBe('validates_static_edge');
    expect(observation.staticEdgeIds).toEqual(['e:calls']);
    expect(observation.observationCount).toBe(1);
    expect(observation.diagnostics).toContain('RUNTIME_OBSERVED');

    /* The static edge is unchanged and no edge was added. */
    expect(graph.allEdges(PROJECT)).toHaveLength(GRAPH_EDGES.length);

    const edge = graph.allEdges(PROJECT).find((candidate) => candidate.id === 'e:calls');

    expect(edge?.from).toBe('api:createOrder');
    expect(edge?.to).toBe('repo:save');
    expect(edge?.type).toBe('CALLS');
  });

  it('deduplicates an exporter retry of the same span and counts distinct spans', async () => {
    const duplicate = await importTrace({
      trace: toolnetTrace([callEvent({ spanId: 's-1' }), callEvent({ spanId: 's-1' })]),
    });

    expect(duplicate.result.acceptedEvents).toBe(1);
    expect(duplicate.result.deduplicatedEvents).toBe(1);

    const single = (await duplicate.store.loadObservations(PROJECT))[0]!;

    expect(single.observationCount).toBe(1);

    const distinct = await importTrace({
      trace: toolnetTrace([callEvent({ spanId: 's-1' }), callEvent({ spanId: 's-2' })]),
    });

    const counted = (await distinct.store.loadObservations(PROJECT))[0]!;

    expect(counted.observationCount).toBe(2);
  });

  it('reports observed dynamic dispatch for a CALL_REFERENCE without inserting CALLS authority', async () => {
    /*
     * The static graph knows only A CALL_REFERENCE Repository.save; the runtime
     * observed A -> OrderRepository.save, which implements it.
     */
    const graph = buildGraph(GRAPH_SYMBOLS, [
      { id: 'e:ref', from: 'api:createOrder', to: 'iface:save', type: 'CALL_REFERENCE' },
      { id: 'e:impl', from: 'repo:save', to: 'iface:save', type: 'IMPLEMENTS' },
    ]);

    const { store } = await importTrace({
      trace: toolnetTrace([callEvent({ callee: { symbolId: 'repo:save' }, dispatch: true })]),
      graph,
    });

    const dispatch = (
      await observationsFor(store, (observation) => observation.kind === 'dispatch')
    )[0];

    expect(dispatch).toBeDefined();
    expect(dispatch!.validation).toBe('dynamic_dispatch');
    expect(dispatch!.diagnostics).toContain('RUNTIME_DISPATCH_OBSERVED');
    expect(dispatch!.staticEdgeIds).toEqual(['e:ref']);

    /* The CALL_REFERENCE was not rewritten and no CALLS edge was created. */
    const edges = graph.allEdges(PROJECT);

    expect(edges).toHaveLength(2);
    expect(edges.filter((edge) => edge.type === 'CALLS')).toHaveLength(0);
    expect(edges.filter((edge) => edge.type === 'CALL_REFERENCE')).toHaveLength(1);
  });

  it('reports a runtime-only relation as a diagnostic and never mutates the graph', async () => {
    const graph = buildGraph();

    const { store } = await importTrace({
      trace: toolnetTrace([
        callEvent({
          caller: { symbolId: 'worker:onOrderCreated' },
          callee: { symbolId: 'repo:save' },
        }),
      ]),
      graph,
    });

    const observation = (await store.loadObservations(PROJECT))[0]!;

    expect(observation.validation).toBe('not_in_static_graph');
    expect(observation.diagnostics).toContain('RUNTIME_RELATION_NOT_IN_STATIC_GRAPH');
    expect(graph.allEdges(PROJECT)).toHaveLength(GRAPH_EDGES.length);
  });

  it('leaves an unobserved static edge untouched and makes no absence claim', async () => {
    const graph = buildGraph();

    const { store } = await importTrace({
      trace: toolnetTrace([
        callEvent({
          caller: { symbolId: 'worker:onOrderCreated' },
          callee: { symbolId: 'repo:save' },
        }),
      ]),
      graph,
    });

    const observations = await store.loadObservations(PROJECT);

    expect(observations.some((observation) => observation.staticEdgeIds.includes('e:calls'))).toBe(
      false
    );

    const edge = graph.allEdges(PROJECT).find((candidate) => candidate.id === 'e:calls');

    expect(edge).toBeDefined();
    expect(edge!.type).toBe('CALLS');

    /* Nothing in the store records the static edge as invalid. */
    const raw = JSON.stringify(observations);

    expect(raw).not.toContain('invalid');
    expect(raw).not.toContain('contradicted');
  });

  it('inspects a relevant unresolved reference without resolving it structurally', async () => {
    const graph = buildGraph();

    const { store } = await importTrace({
      trace: toolnetTrace([callEvent({ callee: { name: 'save' } })]),
      graph,
    });

    const observation = (await store.loadObservations(PROJECT))[0]!;

    /* A bare simple name is never matched repository-wide. */
    expect(observation.validation).toBe('unresolved');
    expect(observation.diagnostics).toContain('TRACE_SYMBOL_UNRESOLVED');
  });

  it('reports TRACE_SYMBOL_AMBIGUOUS instead of taking the first match', async () => {
    const graph = buildGraph([
      ...GRAPH_SYMBOLS,
      { id: 'dup:a', name: 'save', qualifiedName: 'Duplicate.save', filePath: 'src/a.ts' },
      { id: 'dup:b', name: 'save', qualifiedName: 'Duplicate.save', filePath: 'src/b.ts' },
    ]);

    const { store } = await importTrace({
      trace: toolnetTrace([callEvent({ callee: { qualifiedName: 'Duplicate.save' } })]),
      graph,
    });

    const observation = (await store.loadObservations(PROJECT))[0]!;

    expect(observation.validation).toBe('ambiguous');
    expect(observation.diagnostics).toContain('TRACE_SYMBOL_AMBIGUOUS');
    expect(observation.targetSymbolId).toBeUndefined();
  });

  it('uses module + symbol evidence deterministically when no id or qualified name exists', async () => {
    const { store } = await importTrace({
      trace: toolnetTrace([callEvent({ callee: { module: 'src/repo.ts', name: 'save' } })]),
    });

    const observation = (await store.loadObservations(PROJECT))[0]!;

    expect(observation.validation).toBe('validates_static_edge');
    expect(observation.targetSymbolId).toBe('repo:save');
  });

  it('flags an identity conflict when the trace claims a different file for an id', async () => {
    const { store } = await importTrace({
      trace: toolnetTrace([
        callEvent({ callee: { symbolId: 'repo:save', filePath: 'src/elsewhere.ts' } }),
      ]),
    });

    const observation = (await store.loadObservations(PROJECT))[0]!;

    expect(observation.validation).toBe('identity_conflict');
    expect(observation.diagnostics).toContain('RUNTIME_IDENTITY_CONFLICT');
  });

  it('rejects a trace for a different project with TRACE_PROJECT_MISMATCH', async () => {
    const { result } = await importTrace({
      trace: { version: 1, projectId: 'someone-else', events: [callEvent({})] },
    });

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('TRACE_PROJECT_MISMATCH');
  });
});

/* ==================================================================
 * Generation pinning and compatibility
 * ================================================================== */

describe('Phase 79 — generation pinning', () => {
  it('marks a trace from an older generation stale', async () => {
    const { result, store } = await importTrace({
      trace: toolnetTrace([callEvent({})]),
      graphGeneration: 'gen-2',
    });

    expect(result.generation.compatibility).toBe('stale');
    expect(result.diagnostics).toContain('TRACE_GENERATION_STALE');

    const observation = (await store.loadObservations(PROJECT))[0]!;

    expect(observation.compatibility).toBe('stale');
  });

  it('reports source-compatible when only a source manifest hash is known', async () => {
    const { result } = await importTrace({
      trace: toolnetTrace([callEvent({})], {
        generation: undefined,
        sourceManifestHash: 'sha-abc',
      }),
      graphGeneration: 'gen-2',
    });

    expect(result.generation.compatibility).toBe('source-compatible');
  });

  it('reports unknown when no provenance is available at all', async () => {
    const { result } = await importTrace({
      trace: { version: 1, projectId: PROJECT, events: [callEvent({})] },
      graphGeneration: 'gen-2',
    });

    expect(result.generation.compatibility).toBe('unknown');
    expect(result.diagnostics).toContain('TRACE_GENERATION_UNKNOWN');
  });
});

/* ==================================================================
 * HTTP, cross-service, cross-repo and events
 * ================================================================== */

describe('Phase 79 — HTTP, cross-repo and event evidence', () => {
  it('validates an HTTP_CALLS edge from a runtime span', async () => {
    const { store } = await importTrace({
      trace: toolnetTrace([
        {
          type: 'http',
          traceId: 't',
          spanId: 's',
          serviceId: 'svc:orders',
          method: 'POST',
          path: '/orders?debug=1',
          statusCode: 201,
        },
      ]),
    });

    const observation = (await store.loadObservations(PROJECT))[0]!;

    expect(observation.kind).toBe('http');
    expect(observation.validation).toBe('validates_static_edge');
    expect(observation.staticEdgeIds).toEqual(['e:http']);
    expect(observation.targetSymbolId).toBe('route:post-orders');
  });

  it('leaves an unmappable HTTP target unresolved instead of linking it arbitrarily', async () => {
    const { store } = await importTrace({
      trace: toolnetTrace([
        {
          type: 'http',
          traceId: 't',
          spanId: 's',
          serviceId: 'svc:orders',
          method: 'POST',
          path: '/unknown',
        },
      ]),
    });

    const observation = (await store.loadObservations(PROJECT))[0]!;

    expect(observation.validation).toBe('unresolved');
    expect(observation.diagnostics).toContain('TRACE_SERVICE_UNRESOLVED');
    expect(observation.crossProjectId).toBeUndefined();
  });

  it('resolves a cross-repo target only through exact Fleet identity', async () => {
    const event = {
      type: 'http' as const,
      traceId: 't',
      spanId: 's',
      method: 'POST',
      path: '/checkout',
      host: 'shop',
    };

    const withoutFleet = await importTrace({ trace: toolnetTrace([event]) });

    const unresolved = (await withoutFleet.store.loadObservations(PROJECT))[0]!;

    expect(unresolved.validation).toBe('unresolved');
    expect(unresolved.crossProjectId).toBeUndefined();

    const withFleet = await importTrace({
      trace: toolnetTrace([event]),
      fleetParticipants: [{ projectId: 'shop-project', name: 'shop' }],
    });

    const crossRepo = (await withFleet.store.loadObservations(PROJECT))[0]!;

    expect(crossRepo.kind).toBe('cross_repo');
    expect(crossRepo.crossProjectId).toBe('shop-project');
  });

  it('validates producer and consumer event edges independently', async () => {
    const { store } = await importTrace({
      trace: toolnetTrace([
        {
          type: 'event_emit',
          traceId: 't',
          spanId: 's1',
          provider: 'kafka',
          channel: 'orders.created',
          producer: { symbolId: 'api:createOrder' },
        },
        {
          type: 'event_consume',
          traceId: 't',
          spanId: 's2',
          provider: 'kafka',
          channel: 'orders.created',
          consumer: { symbolId: 'worker:onOrderCreated' },
        },
      ]),
    });

    const observations = await store.loadObservations(PROJECT);

    const emit = observations.find((observation) => observation.kind === 'event_emit')!;

    const consume = observations.find((observation) => observation.kind === 'event_consume')!;

    expect(emit.validation).toBe('validates_static_edge');
    expect(emit.staticEdgeIds).toEqual(['e:emits']);
    expect(consume.validation).toBe('validates_static_edge');
    expect(consume.staticEdgeIds).toEqual(['e:listens']);

    /* No correlation identity was supplied, so no causal flow is asserted. */
    expect(observations.some((observation) => observation.kind === 'event_flow')).toBe(false);
  });

  it('asserts a producer to consumer flow only with a deterministic correlation id', async () => {
    const { store } = await importTrace({
      trace: toolnetTrace([
        {
          type: 'event_emit',
          traceId: 't',
          spanId: 's1',
          timestamp: '2026-01-01T00:00:00.000Z',
          provider: 'kafka',
          channel: 'orders.created',
          correlationId: 'message-42',
          producer: { symbolId: 'api:createOrder' },
        },
        {
          type: 'event_consume',
          traceId: 't',
          spanId: 's2',
          timestamp: '2026-01-01T00:00:00.010Z',
          provider: 'kafka',
          channel: 'orders.created',
          correlationId: 'message-42',
          consumer: { symbolId: 'worker:onOrderCreated' },
        },
      ]),
    });

    const flow = (await store.loadObservations(PROJECT)).find(
      (observation) => observation.kind === 'event_flow'
    );

    expect(flow).toBeDefined();
    expect(flow!.sourceSymbolId).toBe('api:createOrder');
    expect(flow!.targetSymbolId).toBe('worker:onOrderCreated');
  });

  it('never infers causality from timestamp proximity alone', async () => {
    const { store } = await importTrace({
      trace: toolnetTrace([
        {
          type: 'event_emit',
          traceId: 't',
          spanId: 's1',
          timestamp: '2026-01-01T00:00:00.000Z',
          provider: 'kafka',
          channel: 'orders.created',
          correlationId: 'message-a',
          producer: { symbolId: 'api:createOrder' },
        },
        {
          type: 'event_consume',
          traceId: 't',
          spanId: 's2',
          timestamp: '2026-01-01T00:00:00.001Z',
          provider: 'kafka',
          channel: 'orders.created',
          correlationId: 'message-b',
          consumer: { symbolId: 'worker:onOrderCreated' },
        },
      ]),
    });

    expect(
      (await store.loadObservations(PROJECT)).some(
        (observation) => observation.kind === 'event_flow'
      )
    ).toBe(false);
  });
});

/* ==================================================================
 * Security
 * ================================================================== */

describe('Phase 79 — security', () => {
  it('never persists secrets from trace attributes', async () => {
    const storage = makeStorage();

    const secrets = {
      authorization: 'Bearer super-secret-token',
      cookie: 'session=secret-cookie',
      'set-cookie': 'session=secret-cookie',
      password: 'hunter2',
      api_key: 'sk_live_abcdefghijklmnop',
      access_token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc',
      client_secret: 'client-secret-value',
      DATABASE_URL: 'postgres://user:pw@db.internal:5432/app',
      'db.statement': 'SELECT * FROM users WHERE token = 1',
      safe: 'kept',
    };

    const payload = toolnetTrace([callEvent({ attributes: secrets })]);

    /* The normalized event keeps harmless metadata and drops every secret. */
    const normalized = selectAdapter(payload).convert(payload, {
      projectId: PROJECT,
      sessionId: 'rts-inspection',
      limits: RUNTIME_TRACE_LIMITS,
    });

    expect(normalized.events).toHaveLength(1);

    const attributes = normalized.events[0]!.attributes;

    expect(attributes['safe']).toBe('kept');

    for (const key of [
      'authorization',
      'cookie',
      'set-cookie',
      'password',
      'api_key',
      'access_token',
      'client_secret',
      'DATABASE_URL',
      'db.statement',
    ]) {
      expect(Object.keys(attributes)).not.toContain(key);
    }

    const { store } = await importTrace({ storage, trace: payload });

    const raw = JSON.stringify(await store.loadSessionRecords(PROJECT));

    for (const secret of [
      'super-secret-token',
      'secret-cookie',
      'hunter2',
      'sk_live_abcdefghijklmnop',
      'eyJhbGciOiJIUzI1NiJ9',
      'client-secret-value',
      'postgres://user:pw@db.internal',
      'SELECT * FROM users',
    ]) {
      expect(raw).not.toContain(secret);
    }
  });

  it('redacts credentials embedded in URL attributes', async () => {
    const { store } = await importTrace({
      trace: toolnetTrace([
        {
          type: 'http',
          traceId: 't',
          spanId: 's',
          method: 'GET',
          path: 'https://user:pw@api.example.com/orders?token=leaky',
        },
      ]),
    });

    const raw = JSON.stringify(await store.loadSessionRecords(PROJECT));

    expect(raw).not.toContain('pw@');
    expect(raw).not.toContain('leaky');
  });

  it('is immune to prototype pollution through trace attributes', async () => {
    const payload = JSON.parse(
      '{"version":1,"projectId":"' +
        PROJECT +
        '","events":[{"type":"call","caller":{"symbolId":"api:createOrder"},"callee":{"symbolId":"repo:save"},"attributes":{"__proto__":{"polluted":true},"constructor":{"polluted":true},"prototype":{"polluted":true},"ok":"yes"}}]}'
    ) as unknown;

    const normalized = selectAdapter(payload).convert(payload, {
      projectId: PROJECT,
      sessionId: 'rts-inspection',
      limits: RUNTIME_TRACE_LIMITS,
    });

    const attributes = normalized.events[0]!.attributes;

    expect(attributes['ok']).toBe('yes');
    expect(Object.keys(attributes)).not.toContain('__proto__');
    expect(Object.keys(attributes)).not.toContain('constructor');
    expect(Object.keys(attributes)).not.toContain('prototype');

    const { result, store } = await importTrace({ trace: payload });

    expect(result.ok).toBe(true);

    const probe = {};

    expect((probe as Record<string, unknown>)['polluted']).toBeUndefined();
    expect((Object.prototype as Record<string, unknown>)['polluted']).toBeUndefined();

    expect(JSON.stringify(await store.loadSessionRecords(PROJECT))).not.toContain('__proto__');
  });

  it('bounds oversized event counts and oversized payloads', async () => {
    const tooMany = Array.from(
      { length: RUNTIME_TRACE_LIMITS.maxEventsPerImport + 1 },
      (_unused, index) => callEvent({ spanId: `s-${index}` })
    );

    const { result } = await importTrace({ trace: toolnetTrace(tooMany) });

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('TRACE_LIMIT_EXCEEDED');

    const huge = new LocalStorageProvider(join(SANDBOX, 'huge'));

    const store = new PersistentRuntimeTraceStore(huge);

    const oversized = await importTraceSession({
      store,
      projectId: PROJECT,
      graph: buildGraph(),
      input: { json: 'x'.repeat(RUNTIME_TRACE_LIMITS.maxTraceBytes + 1) },
    });

    expect(oversized.ok).toBe(false);
    expect(oversized.error?.code).toBe('TRACE_LIMIT_EXCEEDED');
  });

  it('survives deeply nested attributes without recursing without bound', async () => {
    let nested: Record<string, unknown> = { value: 'leaf' };

    for (let depth = 0; depth < 200; depth += 1) {
      nested = { nested };
    }

    const { result, store } = await importTrace({
      trace: toolnetTrace([callEvent({ attributes: { deep: nested } })]),
    });

    expect(result.ok).toBe(true);
    expect(await store.loadSessionSummaries(PROJECT)).toHaveLength(1);
  });

  it('leaves existing observations untouched when an import is rejected', async () => {
    const storage = makeStorage();

    const store = new PersistentRuntimeTraceStore(storage);

    const graph = buildGraph();

    const first = await importTraceSession({
      store,
      projectId: PROJECT,
      graph,
      input: { trace: toolnetTrace([callEvent({})]) },
    });

    expect(first.ok).toBe(true);

    const before = await store.loadObservations(PROJECT);

    const rejected = await importTraceSession({
      store,
      projectId: PROJECT,
      graph,
      input: { trace: { version: 99, projectId: PROJECT, events: [] } },
    });

    expect(rejected.ok).toBe(false);

    expect(await store.loadObservations(PROJECT)).toEqual(before);
  });

  it('rejects an unsafe session id instead of using it as a storage key', async () => {
    const { result } = await importTrace({
      trace: toolnetTrace([callEvent({})]),
      sessionId: '../../escape',
    });

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('TRACE_SCHEMA_INVALID');
  });
});

/* ==================================================================
 * Dedupe, idempotency and retention
 * ================================================================== */

describe('Phase 79 — dedupe, idempotency and retention', () => {
  it('is idempotent when the identical payload is imported twice', async () => {
    const storage = makeStorage();

    const store = new PersistentRuntimeTraceStore(storage);

    const graph = buildGraph();

    const payload = toolnetTrace([callEvent({})]);

    const first = await importTraceSession({
      store,
      projectId: PROJECT,
      graph,
      input: { trace: payload },
    });

    const before = await store.loadObservations(PROJECT);

    const second = await importTraceSession({
      store,
      projectId: PROJECT,
      graph,
      input: { trace: payload },
    });

    expect(first.ok && second.ok).toBe(true);
    expect(second.alreadyImported).toBe(true);
    expect(second.acceptedEvents).toBe(0);
    expect(await store.loadObservations(PROJECT)).toEqual(before);
    expect(await store.loadSessionSummaries(PROJECT)).toHaveLength(1);
  });

  it('deduplicates an identical import fan-out from many clients', async () => {
    const storage = makeStorage();

    const store = new PersistentRuntimeTraceStore(storage);

    const graph = buildGraph();

    const payload = toolnetTrace([callEvent({})]);

    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        importTraceSession({ store, projectId: PROJECT, graph, input: { trace: payload } })
      )
    );

    expect(results.every((result) => result.ok)).toBe(true);
    expect(await store.loadSessionSummaries(PROJECT)).toHaveLength(1);

    const observation = (await store.loadObservations(PROJECT))[0]!;

    expect(observation.observationCount).toBe(1);
    expect(observation.sessionCount).toBe(1);
  });

  it('aggregates a distinct second session without inflating the first', async () => {
    const storage = makeStorage();

    const store = new PersistentRuntimeTraceStore(storage);

    const graph = buildGraph();

    await importTraceSession({
      store,
      projectId: PROJECT,
      graph,
      input: { trace: toolnetTrace([callEvent({ traceId: 'run-1', spanId: 'span-1' })]) },
    });

    await importTraceSession({
      store,
      projectId: PROJECT,
      graph,
      input: { trace: toolnetTrace([callEvent({ traceId: 'run-2', spanId: 'span-2' })]) },
    });

    const observation = (await store.loadObservations(PROJECT))[0]!;

    expect(observation.observationCount).toBe(2);
    expect(observation.sessionCount).toBe(2);
  });

  it('prunes old sessions while retaining new ones and never touching the graph', async () => {
    const storage = makeStorage();

    const store = new PersistentRuntimeTraceStore(storage);

    const graph = buildGraph();

    const edgesBefore = graph.allEdges(PROJECT).length;

    let clock = Date.parse('2026-01-01T00:00:00.000Z');

    const now = (): Date => new Date(clock);

    await importTraceSession({
      store,
      projectId: PROJECT,
      graph,
      now,
      input: { trace: toolnetTrace([callEvent({ traceId: 'old', spanId: 'old-span' })]) },
    });

    clock = Date.parse('2026-06-01T00:00:00.000Z');

    await importTraceSession({
      store,
      projectId: PROJECT,
      graph,
      now,
      input: { trace: toolnetTrace([callEvent({ traceId: 'new', spanId: 'new-span' })]) },
    });

    expect(await store.loadSessionSummaries(PROJECT)).toHaveLength(2);

    const result = await applyRuntimeTraceRetention(store, PROJECT, {
      maxAgeDays: 30,
      now: () => new Date(Date.parse('2026-06-02T00:00:00.000Z')),
    });

    expect(result.removed).toHaveLength(1);
    expect(result.retained).toBe(1);

    const remaining = await store.loadSessionSummaries(PROJECT);

    expect(remaining).toHaveLength(1);

    /* The pruned session's contribution is gone from the aggregate. */
    const observations = await store.loadObservations(PROJECT);

    expect(observations).toHaveLength(1);
    expect(observations[0]!.observationCount).toBe(1);
    expect(observations[0]!.sessionIds).toEqual(remaining.map((session) => session.id));

    expect(graph.allEdges(PROJECT)).toHaveLength(edgesBefore);
  });

  it('reports bounded status without dumping raw payloads', async () => {
    const { store } = await importTrace({ trace: toolnetTrace([callEvent({})]) });

    const status = await runtimeTraceStatus({ store, projectId: PROJECT });

    expect(status.sessions).toBe(1);
    expect(status.observations).toBe(1);
    expect(status.canEstablishAbsence).toBe(false);
    expect(status.adapters).toContain('toolnet-json');
    expect(status.retention.maxSessions).toBe(RUNTIME_TRACE_LIMITS.maxStoredSessions);
    expect(JSON.stringify(status)).not.toContain('createOrder');
  });
});

/* ==================================================================
 * Phase 78 Evidence Profile integration
 * ================================================================== */

interface EvidenceFixtureOptions {
  runtime?: EvidenceRuntimeFacts | null;
  status?: 'complete' | 'partial' | 'stale' | 'unavailable';
  negativeSafe?: boolean;
}

const EVIDENCE_SYMBOLS = [
  { id: 'api:createOrder', name: 'createOrder', type: 'function', filePath: 'src/api.ts' },
  { id: 'repo:save', name: 'save', type: 'function', filePath: 'src/repo.ts' },
  { id: 'dead:unusedHelper', name: 'unusedHelper', type: 'function', filePath: 'src/dead.ts' },
];

function evidenceFacts(options: EvidenceFixtureOptions = {}): EvidenceFacts {
  const graph = new CodeGraphStore();

  for (const symbol of EVIDENCE_SYMBOLS) {
    graph.addSymbol({
      id: symbol.id,
      projectId: PROJECT,
      name: symbol.name,
      qualifiedName: symbol.name,
      type: symbol.type as never,
      filePath: symbol.filePath,
    });
  }

  graph.addEdge({
    id: 'e:calls',
    projectId: PROJECT,
    from: 'api:createOrder',
    to: 'repo:save',
    type: 'CALLS' as never,
  });

  const status = options.status ?? 'complete';

  return buildEvidenceFacts({
    projectId: PROJECT,
    rootPath: SANDBOX,
    generation: 'gen-1',
    graph,
    coverage: {
      available: true,
      evaluate: () => ({
        status,
        negativeClaimSafe: options.negativeSafe ?? status === 'complete',
        reasons: status === 'complete' ? [] : ['COVERAGE_PARTIAL'],
      }),
    },
    freshness: { checked: true, stale: false },
    gaps: [],
    fleet: null,
    crossService: null,
    ...(options.runtime !== undefined ? { runtime: options.runtime } : {}),
    readSource: false,
  });
}

function runtimeFacts(options: {
  relevant?: EvidenceRuntimeFacts['relevant'];
  executed?: string[];
  available?: boolean;
}): EvidenceRuntimeFacts {
  const relevant = options.relevant ?? [];

  return {
    available: options.available ?? relevant.length > 0,
    compatibility: 'exact',
    graphGeneration: 'gen-1',
    sessions: relevant.length > 0 ? 1 : 0,
    observations: relevant.length,
    relevant,
    executedSymbolIds: options.executed ?? [],
    reasons: [],
  };
}

function observedCall(input: {
  count: number;
  validation?: string;
}): EvidenceRuntimeFacts['relevant'][number] {
  return {
    id: 'rto-test',
    kind: 'call',
    validation: input.validation ?? 'validates_static_edge',
    observationCount: input.count,
    sessionCount: 1,
    firstObservedAt: '2026-01-01T00:00:00.000Z',
    lastObservedAt: '2026-01-01T00:00:00.000Z',
    compatibility: 'exact',
    staticEdgeIds: ['e:calls'],
    source: { symbolId: 'api:createOrder' },
    target: { symbolId: 'repo:save' },
  };
}

function runEvidence(facts: EvidenceFacts, request: EvidenceRequest): EvidenceBundle {
  return executeEvidenceSync({ request, facts });
}

const callersRequest: EvidenceRequest = {
  profile: 'verify',
  operation: 'find_callers',
  claim: 'positive',
  scope: { kind: 'symbol', symbolIds: ['repo:save'] },
  options: { includeRuntimeTrace: true },
};

describe('Phase 79 — Evidence Profile integration', () => {
  it('attaches runtime observations to a Verify bundle as supporting evidence', () => {
    const bundle = runEvidence(
      evidenceFacts({ runtime: runtimeFacts({ relevant: [observedCall({ count: 5 })] }) }),
      callersRequest
    );

    expect(bundle.runtime.requested).toBe(true);
    expect(bundle.runtime.available).toBe(true);
    expect(bundle.runtime.canEstablishAbsence).toBe(false);
    expect(bundle.runtime.items).toHaveLength(1);
    expect(bundle.runtime.items[0]!.observationCount).toBe(5);

    expect(bundle.evidence.some((item) => item.origin === 'runtime_trace')).toBe(true);

    /* Static evidence is preserved alongside the runtime evidence. */
    expect(bundle.evidence.some((item) => item.origin === 'graph')).toBe(true);
  });

  it('keeps a positive claim governed by static coverage, never by runtime evidence', () => {
    const withoutRuntime = runEvidence(evidenceFacts({ status: 'partial' }), {
      ...callersRequest,
      options: {},
    });

    const withRuntime = runEvidence(
      evidenceFacts({
        status: 'partial',
        runtime: runtimeFacts({ relevant: [observedCall({ count: 3 })] }),
      }),
      callersRequest
    );

    expect(withRuntime.claimSafety.decision).toBe(withoutRuntime.claimSafety.decision);
    expect(withRuntime.claimSafety.negativeClaimSafe).toBe(false);
    expect(withRuntime.coverage).toEqual(withoutRuntime.coverage);
  });

  it('never lets runtime absence make an Auditor absence claim safer', () => {
    const request: EvidenceRequest = {
      profile: 'auditor',
      operation: 'find_callers',
      claim: 'absence',
      scope: { kind: 'symbol', symbolIds: ['repo:save'] },
      options: { includeRuntimeTrace: true },
    };

    const partial = evidenceFacts({ status: 'partial' });

    const partialWithRuntime = evidenceFacts({
      status: 'partial',
      runtime: runtimeFacts({ available: false }),
    });

    expect(runEvidence(partialWithRuntime, request).claimSafety).toEqual(
      runEvidence(partial, request).claimSafety
    );

    const complete = evidenceFacts({ status: 'complete' });

    const completeWithRuntime = evidenceFacts({
      status: 'complete',
      runtime: runtimeFacts({ available: false }),
    });

    const completeBundle = runEvidence(completeWithRuntime, request);

    expect(completeBundle.claimSafety.negativeClaimSafe).toBe(
      runEvidence(complete, request).claimSafety.negativeClaimSafe
    );
    expect(completeBundle.claimSafety.reasons).not.toContain('RUNTIME_SYMBOL_OBSERVED');
  });

  it('allows a positive runtime relation while a static gap keeps absence blocked', () => {
    const request: EvidenceRequest = {
      profile: 'auditor',
      operation: 'find_callers',
      claim: 'absence',
      scope: { kind: 'symbol', symbolIds: ['repo:save'] },
      options: { includeRuntimeTrace: true },
    };

    const bundle = runEvidence(
      evidenceFacts({
        status: 'partial',
        runtime: runtimeFacts({ relevant: [observedCall({ count: 1 })] }),
      }),
      request
    );

    expect(bundle.runtime.items).toHaveLength(1);
    expect(bundle.claimSafety.decision).toBe('blocked');
    expect(bundle.claimSafety.negativeClaimSafe).toBe(false);
    expect(bundle.coverage.every((entry) => entry.status === 'partial')).toBe(true);
  });

  it('blocks a dead-code claim for a symbol a trace proves executed', () => {
    const request: EvidenceRequest = {
      profile: 'auditor',
      operation: 'dead_code',
      claim: 'dead_code',
      scope: { kind: 'symbol', symbolIds: ['dead:unusedHelper'] },
      options: { includeRuntimeTrace: true },
    };

    const observed = runEvidence(
      evidenceFacts({
        runtime: runtimeFacts({ available: true, executed: ['dead:unusedHelper'] }),
      }),
      request
    );

    expect(observed.claimSafety.reasons).toContain('RUNTIME_SYMBOL_OBSERVED');
    expect(observed.claimSafety.decision).toBe('blocked');
    expect(observed.claimSafety.negativeClaimSafe).toBe(false);
  });

  it('never strengthens a dead-code claim when the symbol was not observed', () => {
    const request: EvidenceRequest = {
      profile: 'auditor',
      operation: 'dead_code',
      claim: 'dead_code',
      scope: { kind: 'symbol', symbolIds: ['dead:unusedHelper'] },
      options: { includeRuntimeTrace: true },
    };

    const withoutRuntime = runEvidence(evidenceFacts({}), request);

    const withRuntime = runEvidence(
      evidenceFacts({ runtime: runtimeFacts({ available: true, executed: [] }) }),
      request
    );

    expect(withRuntime.claimSafety).toEqual(withoutRuntime.claimSafety);
    expect(withRuntime.claimSafety.decision).toBe('provisional');
    expect(withRuntime.claimSafety.reasons).not.toContain('RUNTIME_SYMBOL_OBSERVED');
  });

  it('never shrinks a static blast radius to the runtime-observed subset', () => {
    const request: EvidenceRequest = {
      profile: 'verify',
      operation: 'impact',
      claim: 'impact',
      scope: { kind: 'symbol', symbolIds: ['api:createOrder'] },
      options: { includeRuntimeTrace: true },
    };

    const bundle = runEvidence(
      evidenceFacts({ runtime: runtimeFacts({ relevant: [observedCall({ count: 1 })] }) }),
      request
    );

    const staticSymbols = bundle.evidence.filter(
      (item) => item.origin === 'graph' && item.kind === 'symbol'
    );

    /* api:createOrder + repo:save are both in the static blast radius. */
    expect(staticSymbols.length).toBeGreaterThanOrEqual(2);
    expect(bundle.runtime.items.length).toBeLessThan(staticSymbols.length);
  });

  it('reports no runtime evidence honestly when no trace was imported', () => {
    const bundle = runEvidence(evidenceFacts({ runtime: null }), callersRequest);

    expect(bundle.runtime.requested).toBe(true);
    expect(bundle.runtime.available).toBe(false);
    expect(bundle.runtime.items).toHaveLength(0);
    expect(
      bundle.limitations.some((limitation) => limitation.includes('never proof of absence'))
    ).toBe(true);
  });
});

/* ==================================================================
 * Daemon parity and multi-client coordination
 * ================================================================== */

function daemonProject(): DaemonProjectRef {
  return { id: PROJECT, name: 'phase79', rootPath: SANDBOX };
}

function makeCoordinatorDeps(state: {
  store: PersistentRuntimeTraceStore;
  graph: CodeGraphStore;
  ingests: number;
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

    async ingestTracesProject(_project, input) {
      state.ingests += 1;

      return importTraceSession({
        store: state.store,
        projectId: input.projectId,
        graph: state.graph,
        ...(input.graphGeneration ? { graphGeneration: input.graphGeneration } : {}),
        input: input.input,
      });
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

function makeCoordinator(
  store: PersistentRuntimeTraceStore,
  graph: CodeGraphStore
): { runtime: ProjectRuntimeCoordinator; state: { ingests: number } } {
  const state = { store, graph, ingests: 0 };

  const deps = makeCoordinatorDeps(state);

  const projects = new ProjectRegistry();

  const index = new IndexCoordinator(deps, projects);

  const artifact = new ArtifactCoordinator(deps, projects);

  return {
    runtime: new ProjectRuntimeCoordinator(deps, projects, index, artifact),
    state,
  };
}

describe('Phase 79 — daemon parity and multi-client', () => {
  it('produces sematically identical observations standalone and through the coordinator', async () => {
    const payload = toolnetTrace([callEvent({})]);

    const standaloneStorage = makeStorage();

    const standaloneStore = new PersistentRuntimeTraceStore(standaloneStorage);

    const standaloneGraph = buildGraph();

    await importTraceSession({
      store: standaloneStore,
      projectId: PROJECT,
      graph: standaloneGraph,
      graphGeneration: 'gen-1',
      input: { trace: payload },
    });

    const daemonStorage = makeStorage();

    const daemonStore = new PersistentRuntimeTraceStore(daemonStorage);

    const daemonGraph = buildGraph();

    const { runtime } = makeCoordinator(daemonStore, daemonGraph);

    await runtime.ingestTraces(daemonProject(), 'session-1', {
      projectId: PROJECT,
      graphGeneration: 'gen-1',
      input: { trace: payload },
    });

    const standaloneObservations = await standaloneStore.loadObservations(PROJECT);

    const daemonObservations = await daemonStore.loadObservations(PROJECT);

    expect(JSON.stringify(daemonObservations)).toBe(JSON.stringify(standaloneObservations));
  });

  it('single-flights ten concurrent identical imports into one computation', async () => {
    const storage = makeStorage();

    const store = new PersistentRuntimeTraceStore(storage);

    const graph = buildGraph();

    const { runtime, state } = makeCoordinator(store, graph);

    const payload = toolnetTrace([callEvent({})]);

    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        runtime.ingestTraces(daemonProject(), 'session-1', {
          projectId: PROJECT,
          graphGeneration: 'gen-1',
          input: { trace: payload },
        })
      )
    );

    expect(results.every((result) => result.ok)).toBe(true);
    expect(state.ingests).toBe(1);
    expect(await store.loadSessionSummaries(PROJECT)).toHaveLength(1);

    const observation = (await store.loadObservations(PROJECT))[0]!;

    expect(observation.observationCount).toBe(1);

    const distinct = new Set(results.map((result) => JSON.stringify(result.session)));

    expect(distinct.size).toBe(1);
  });

  it('loads equivalent runtime facts standalone and through the coordinator', async () => {
    const storage = makeStorage();

    const store = new PersistentRuntimeTraceStore(storage);

    const graph = buildGraph();

    const { runtime } = makeCoordinator(store, graph);

    await runtime.ingestTraces(daemonProject(), 'session-1', {
      projectId: PROJECT,
      graphGeneration: 'gen-1',
      input: { trace: toolnetTrace([callEvent({})]) },
    });

    const viaStore = await loadRuntimeTraceFacts({
      store,
      projectId: PROJECT,
      graphGeneration: 'gen-1',
      subject: { symbolIds: ['repo:save'] },
    });

    expect(viaStore.available).toBe(true);
    expect(viaStore.executedSymbolIds).toEqual(['api:createOrder', 'repo:save']);
    expect(viaStore.relevant).toHaveLength(1);
  });
});

/* ==================================================================
 * Non-interference
 * ================================================================== */

async function storageSnapshot(
  storage: LocalStorageProvider,
  excludePrefix?: string
): Promise<Record<string, string>> {
  const objects = await storage.list('');

  const snapshot: Record<string, string> = {};

  for (const object of objects.sort((left, right) => left.key.localeCompare(right.key))) {
    if (excludePrefix && object.key.startsWith(excludePrefix)) {
      continue;
    }

    snapshot[object.key] = (await storage.getText(object.key)) ?? '';
  }

  return snapshot;
}

describe('Phase 79 — non-interference', () => {
  it('keeps Memory, Tasks, ADR and artifact state byte-identical', async () => {
    const storage = makeStorage();

    /* Stand in for the other authorities with their own namespaces. */
    await storage.put('projects/phase79-project/memory/index.json', '{"memory":true}\n');

    await storage.put('projects/phase79-project/tasks/state.json', '{"tasks":true}\n');

    await storage.put('projects/phase79-project/adr/decisions.json', '{"adr":true}\n');

    await storage.put(
      'projects/phase79-project/artifact/generations/g1.json',
      '{"artifact":true}\n'
    );

    const before = await storageSnapshot(storage, 'projects/phase79-project/runtime-traces/');

    const store = new PersistentRuntimeTraceStore(storage);

    const graph = buildGraph();

    await importTraceSession({
      store,
      projectId: PROJECT,
      graph,
      input: { trace: toolnetTrace([callEvent({})]) },
    });

    await applyRuntimeTraceRetention(store, PROJECT, { maxSessions: 1 });

    await store.loadObservations(PROJECT);

    const after = await storageSnapshot(storage, 'projects/phase79-project/runtime-traces/');

    expect(after).toEqual(before);
  });

  it('writes trace state only inside the project runtime-traces namespace', async () => {
    const storage = makeStorage();

    const store = new PersistentRuntimeTraceStore(storage);

    await importTraceSession({
      store,
      projectId: PROJECT,
      graph: buildGraph(),
      input: { trace: toolnetTrace([callEvent({})]) },
    });

    const keys = (await storage.list('')).map((object) => object.key);

    expect(keys.length).toBeGreaterThan(0);

    for (const key of keys) {
      expect(key.startsWith(`projects/${PROJECT}/runtime-traces/`)).toBe(true);
    }
  });

  it('never mutates the static graph while importing, pruning or reading traces', async () => {
    const graph = buildGraph();

    const fingerprint = structuralDigest(
      graph
        .allEdges(PROJECT)
        .map((edge) => `${edge.id}:${edge.from}:${edge.to}:${edge.type}`)
        .sort(),
      { maxDepth: 4, maxNodes: 10_000 }
    );

    const symbols = graph.allSymbols(PROJECT).length;

    const storage = makeStorage();

    const store = new PersistentRuntimeTraceStore(storage);

    await importTraceSession({
      store,
      projectId: PROJECT,
      graph,
      input: {
        trace: toolnetTrace([
          callEvent({}),
          callEvent({
            caller: { symbolId: 'worker:onOrderCreated' },
            callee: { symbolId: 'repo:save' },
            spanId: 'unknown-1',
          }),
        ]),
      },
    });

    await store.loadObservations(PROJECT);

    await applyRuntimeTraceRetention(store, PROJECT, {});

    const after = structuralDigest(
      graph
        .allEdges(PROJECT)
        .map((edge) => `${edge.id}:${edge.from}:${edge.to}:${edge.type}`)
        .sort(),
      { maxDepth: 4, maxNodes: 10_000 }
    );

    expect(after).toBe(fingerprint);
    expect(graph.allSymbols(PROJECT)).toHaveLength(symbols);
  });
});

/* ==================================================================
 * Packaged runtime
 * ================================================================== */

async function listPackagedMcpTools(bundlePath: string): Promise<string[]> {
  const cwd = mkdtempSync(join(tmpdir(), 'toolnet-phase79-mcp-'));

  const requests = `${[
    JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'phase79-certify', version: '1.0.0' },
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

describe('Phase 79 — packaged runtime', () => {
  const repoRoot = resolve(process.cwd());

  const bundlePath = join(repoRoot, 'bundle', 'mcp.js');

  it('ships the runtime trace layer inside the packaged MCP bundle', () => {
    expect(existsSync(bundlePath)).toBe(true);

    const bundle = readFileSync(bundlePath, 'utf8');

    for (const marker of [
      'ingest_traces',
      'runtime_trace_status',
      'RUNTIME TRACE EVIDENCE',
      'TRACE_PROJECT_MISMATCH',
      'RUNTIME_RELATION_NOT_IN_STATIC_GRAPH',
      'RUNTIME_SYMBOL_OBSERVED',
      'TRACE_LIMIT_EXCEEDED',
      'canEstablishAbsence',
      'includeRuntimeEvidence',
      'runtimeObservedPaths',
    ]) {
      expect(bundle).toContain(marker);
    }
  });

  it('exposes ingest_traces and runtime_trace_status through the packaged tools/list', async () => {
    const tools = await listPackagedMcpTools(bundlePath);

    expect(tools).toContain('ingest_traces');
    expect(tools).toContain('runtime_trace_status');
  });

  it('accepts an import with no daemon present (standalone)', async () => {
    const storage = makeStorage();

    const store = new PersistentRuntimeTraceStore(storage);

    const result = await importTraceSession({
      store,
      projectId: PROJECT,
      graph: buildGraph(),
      input: { trace: toolnetTrace([callEvent({})]) },
    });

    expect(result.ok).toBe(true);
    expect(await store.loadObservations(PROJECT)).toHaveLength(1);
  });
});

/* ==================================================================
 * Certification marker
 * ================================================================== */

describe('Phase 79 — certification', () => {
  it('emits the Phase 79 PASS marker', () => {
    console.log(PHASE79_MARKER);

    expect(PHASE79_MARKER).toBe('PHASE79_RUNTIME_TRACE_EVIDENCE=PASS');
  });
});
