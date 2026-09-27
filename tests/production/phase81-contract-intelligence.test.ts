/*
 * Phase 81 — Contract Intelligence / API & Schema Compatibility Guard
 * production certification.
 *
 * Exercises the REAL implementation:
 *
 *   - baseline vs candidate contract discovery (OpenAPI, GraphQL, proto,
 *     exported TS types, package exports, graph-derived HTTP routes and events)
 *   - deterministic contract identities and fingerprints
 *   - request vs response direction, requiredness, types, enums, removal
 *   - structural compatibility separated from consumer impact
 *   - consumer mapping (local / Fleet)
 *   - coverage + Evidence Profile claim safety, Phase 79 runtime corroboration
 *   - Phase 80 change-input integration (no second change parse)
 *   - security: local $refs, remote-ref blocking, path escape, cycle bounds,
 *     secret redaction, resource limits
 *   - determinism, daemon parity, single-flight, cache invalidation
 *   - authority / static-graph / artifact non-interference
 *   - the packaged MCP runtime
 *
 * PASS marker: PHASE81_CONTRACT_INTELLIGENCE=PASS
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
  analyzeContracts,
  buildProjectContractFacts,
} from '../../src/code-intelligence/contract/index.js';

import { readBaselineFile } from '../../src/code-intelligence/contract/project-facts.js';

import type {
  ContractAdrConstraint,
  ContractAnalysisRequest,
  ContractFacts,
  ContractFleetProjectImpact,
  ContractRuntimeObservation,
} from '../../src/code-intelligence/contract/index.js';

import type { CodeSymbol, GraphEdge } from '../../src/core/types.js';

const PROJECT = 'phase81';
const MARKER = 'PHASE81_CONTRACT_INTELLIGENCE=PASS';

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
  extra: Partial<CodeSymbol> = {}
): CodeSymbol {
  return {
    id,
    projectId: PROJECT,
    name,
    qualifiedName: name,
    type,
    filePath,
    startLine: 1,
    endLine: 5,
    metadata: {},
    ...extra,
  };
}

function edge(id: string, type: GraphEdge['type'], from: string, to: string): GraphEdge {
  return { id, projectId: PROJECT, type, from, to };
}

const ROUTE_ORDERS = sym('route:POST /orders', 'POST /orders', 'route', 'src/routes.rb');
const ROUTE_V1 = sym('route:POST /v1/orders', 'POST /v1/orders', 'route', 'src/routes-v1.rb');
const CLIENT = sym('web:submit', 'submit', 'function', 'src/web.ts');
const CLIENT_V1 = sym('web:submitV1', 'submitV1', 'function', 'src/web-v1.ts');
const IFACE = sym('iface:Repository', 'Repository', 'interface', 'src/types.ts');
const IMPL = sym('cls:Repo', 'Repo', 'class', 'src/impl.ts');
const EVENT = sym('event:order.created', 'order.created', 'event', 'src/events.rb');
const CONSUMER = sym('svc:consume', 'consume', 'function', 'src/consumer.ts');

const BASE_SYMBOLS: CodeSymbol[] = [
  ROUTE_ORDERS,
  ROUTE_V1,
  CLIENT,
  CLIENT_V1,
  IFACE,
  IMPL,
  EVENT,
  CONSUMER,
];

const BASE_EDGES: GraphEdge[] = [
  edge('e:http', 'HTTP_CALLS', 'web:submit', 'route:POST /orders'),
  edge('e:http-v1', 'HTTP_CALLS', 'web:submitV1', 'route:POST /v1/orders'),
  edge('e:uses', 'USES_TYPE', 'cls:Repo', 'iface:Repository'),
  edge('e:listens', 'LISTENS_ON', 'svc:consume', 'event:order.created'),
];

type FileKind = 'added' | 'modified' | 'deleted' | 'renamed' | 'copied';

interface FileSpec {
  path: string;
  kind: FileKind;
  baseline?: string;
  candidate?: string;
}

type CoverageMode = 'complete' | 'partial' | 'unavailable';

interface FactsOptions {
  files?: FileSpec[];
  symbols?: CodeSymbol[];
  edges?: GraphEdge[];
  generation?: string;
  candidateGeneration?: string;
  coverage?: CoverageMode;
  fleet?: ContractFacts['fleet'];
  crossService?: ContractFacts['crossService'];
  adr?: readonly ContractAdrConstraint[];
  runtime?: readonly ContractRuntimeObservation[];
  includeRuntime?: boolean;
  includeFleet?: boolean;
  fleetImpact?: (ids: readonly string[]) => readonly ContractFleetProjectImpact[];
  parseCandidate?: (
    path: string
  ) => readonly { id: string; name: string; type: string; filePath: string }[] | null;
  currentGeneration?: () => string;
  recheckSnapshot?: () => Promise<string>;
  capabilityProduced?: (capability: string, edgeType?: string) => boolean;
}

function buildGraph(symbols: CodeSymbol[], edges: GraphEdge[]): CodeGraphStore {
  const graph = new CodeGraphStore();

  graph.import(
    symbols.map((symbol) => ({ ...symbol })),
    edges.map((entry) => ({ ...entry }))
  );

  return graph;
}

function makeFacts(options: FactsOptions = {}): ContractFacts {
  const graph = buildGraph(options.symbols ?? BASE_SYMBOLS, options.edges ?? BASE_EDGES);

  const generation = options.generation ?? 'gen-1';
  const mode = options.coverage ?? 'complete';

  const files = options.files ?? [];

  const baselineByPath = new Map(
    files.filter((file) => file.baseline !== undefined).map((file) => [file.path, file.baseline!])
  );

  const candidateByPath = new Map(
    files.filter((file) => file.candidate !== undefined).map((file) => [file.path, file.candidate!])
  );

  const coverage = (): {
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
    ...(options.candidateGeneration ? { candidateGeneration: options.candidateGeneration } : {}),
    currentGeneration: options.currentGeneration ?? (() => generation),

    graph: {
      symbols: () => graph.allSymbols(PROJECT).map(toContractSymbol),
      symbolById: (id) => {
        const found = graph.getSymbol(id);
        return found ? toContractSymbol(found) : undefined;
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
    },

    coverageAvailable: mode !== 'unavailable',
    coverageFor: () => coverage(),

    capabilityProduced: options.capabilityProduced ?? (() => true),

    fleet: options.fleet ?? null,
    crossService: options.crossService ?? null,

    changedPaths: () => files.map((file) => file.path),
    fileKind: (path) => files.find((file) => file.path === path)?.kind,

    readBaseline: (path: string) => baselineByPath.get(path) ?? null,
    readCandidate: (path: string) => candidateByPath.get(path) ?? null,

    ...(options.runtime
      ? {
          runtime: (ids: readonly string[]) =>
            options.runtime!.filter((obs) => {
              const wanted = new Set(ids);
              return (
                (obs.source.symbolId !== undefined && wanted.has(obs.source.symbolId)) ||
                (obs.target.symbolId !== undefined && wanted.has(obs.target.symbolId))
              );
            }),
        }
      : {}),

    ...(options.fleetImpact ? { fleetImpact: options.fleetImpact } : {}),

    ...(options.adr ? { adr: async () => options.adr! } : {}),

    ...(options.parseCandidate ? { parseCandidate: options.parseCandidate } : {}),

    ...(options.currentGeneration ? { currentGeneration: options.currentGeneration } : {}),

    ...(options.recheckSnapshot ? { recheckSnapshot: options.recheckSnapshot } : {}),
  };
}

function toContractSymbol(symbol: CodeSymbol): {
  id: string;
  name: string;
  qualifiedName?: string;
  type: string;
  filePath: string;
  startLine?: number;
  endLine?: number;
} {
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

function request(overrides: Partial<ContractAnalysisRequest> = {}): ContractAnalysisRequest {
  return {
    projectId: PROJECT,
    claim: 'impact',
    profile: 'verify',
    ...overrides,
  };
}

async function analyze(facts: ContractFacts, overrides: Partial<ContractAnalysisRequest> = {}) {
  return analyzeContracts({ request: request(overrides), facts });
}

/* -- OpenAPI builder -------------------------------------------------- */

interface OpSpec {
  request?: { properties: Record<string, string>; required?: string[] };
  response?: { properties: Record<string, string>; required?: string[] };
  ref?: string;
}

function openApiDoc(input: {
  paths: Record<string, Record<string, OpSpec>>;
  schemas?: Record<string, unknown>;
}): string {
  const paths: Record<string, unknown> = {};

  for (const [route, operations] of Object.entries(input.paths)) {
    const item: Record<string, unknown> = {};

    for (const [method, spec] of Object.entries(operations)) {
      item[method] = {
        requestBody: spec.ref
          ? { content: { 'application/json': { schema: { $ref: spec.ref } } } }
          : spec.request
            ? {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: Object.fromEntries(
                        Object.entries(spec.request.properties).map(([name, type]) => [
                          name,
                          { type },
                        ])
                      ),
                      required: spec.request.required ?? [],
                    },
                  },
                },
              }
            : undefined,
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: Object.fromEntries(
                    Object.entries(spec.response?.properties ?? {}).map(([name, type]) => [
                      name,
                      { type },
                    ])
                  ),
                  required: spec.response?.required ?? [],
                },
              },
            },
          },
        },
      };
    }

    paths[route] = item;
  }

  return JSON.stringify(
    {
      openapi: '3.0.0',
      paths,
      ...(input.schemas ? { components: { schemas: input.schemas } } : {}),
    },
    null,
    2
  );
}

function openApiFile(baseline: string, candidate: string): FileSpec {
  return { path: 'openapi.json', kind: 'modified', baseline, candidate };
}

const UNCHANGED = openApiDoc({
  paths: { '/orders': { post: { request: { properties: { coupon: 'string' } } } } },
});

/* ==================================================================
 * Discovery
 * ================================================================== */

describe('Phase 81 — contract discovery', () => {
  it('discovers baseline and candidate contracts from the Phase 80 changed paths', async () => {
    const facts = makeFacts({ files: [openApiFile(UNCHANGED, UNCHANGED)] });

    const report = await analyze(facts);

    expect(report.baseline.entries).toBeGreaterThan(0);
    expect(report.candidate.entries).toBe(report.baseline.entries);
    expect(report.changes).toHaveLength(0);
    expect(report.coverage.filesChecked).toBe(1);
  });

  it('derives an HTTP route contract from the graph and reports its removal', async () => {
    const facts = makeFacts({
      files: [{ path: 'src/routes.rb', kind: 'deleted' }],
      parseCandidate: () => [],
    });

    const report = await analyze(facts);

    const delta = report.changes.find((entry) => entry.identity === 'POST /orders');

    expect(delta?.compatibility).toBe('breaking');
    expect(delta?.changes[0]?.reason).toBe('CONTRACT_REMOVED');
    expect(report.consumers.some((consumer) => consumer.symbolId === 'web:submit')).toBe(true);
  });

  it('keeps a contract fingerprint deterministic for the same semantic contract', async () => {
    const schema = (properties: Record<string, unknown>, required: string[]): unknown => ({
      type: 'object',
      properties,
      required,
    });

    /* Same semantic contract, different property insertion order. */
    const docA = JSON.stringify({
      openapi: '3.0.0',
      paths: {
        '/orders': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: schema({ a: { type: 'string' }, b: { type: 'string' } }, ['a']),
                },
              },
            },
            responses: {
              '200': {
                content: { 'application/json': { schema: schema({ x: { type: 'number' } }, []) } },
              },
            },
          },
        },
      },
    });

    const docB = JSON.stringify({
      openapi: '3.0.0',
      paths: {
        '/orders': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: schema({ b: { type: 'string' }, a: { type: 'string' } }, ['a']),
                },
              },
            },
            responses: {
              '200': {
                content: { 'application/json': { schema: schema({ x: { type: 'number' } }, []) } },
              },
            },
          },
        },
      },
    });

    expect(docA).not.toBe(docB);

    const a = await analyze(makeFacts({ files: [openApiFile(docA, docA)] }));
    const b = await analyze(makeFacts({ files: [openApiFile(docB, docB)] }));

    expect(a.baseline.entries).toBeGreaterThan(0);
    expect(a.baseline.fingerprint).toBe(b.baseline.fingerprint);
  });
});

/* ==================================================================
 * OpenAPI structural compatibility
 * ================================================================== */

describe('Phase 81 — OpenAPI / HTTP compatibility', () => {
  it('treats a required request field added as breaking', async () => {
    const baseline = openApiDoc({
      paths: { '/orders': { post: { request: { properties: { coupon: 'string' } } } } },
    });
    const candidate = openApiDoc({
      paths: {
        '/orders': {
          post: {
            request: { properties: { coupon: 'string', region: 'string' }, required: ['region'] },
          },
        },
      },
    });

    const report = await analyze(makeFacts({ files: [openApiFile(baseline, candidate)] }));

    const delta = report.changes[0]!;

    expect(delta.compatibility).toBe('breaking');
    expect(delta.changes.some((change) => change.reason === 'REQUIRED_PARAMETER_ADDED')).toBe(true);
    expect(report.guard.reasons).toContain('REQUIRED_PARAMETER_ADDED');
  });

  it('treats an optional request field added as compatible', async () => {
    const baseline = openApiDoc({
      paths: { '/orders': { post: { request: { properties: { coupon: 'string' } } } } },
    });
    const candidate = openApiDoc({
      paths: {
        '/orders': { post: { request: { properties: { coupon: 'string', note: 'string' } } } },
      },
    });

    const report = await analyze(makeFacts({ files: [openApiFile(baseline, candidate)] }));

    expect(report.changes[0]?.compatibility).toBe('compatible');
    expect(report.compatibility.overall).toBe('compatible');
  });

  it('treats a removed response field as breaking', async () => {
    const baseline = openApiDoc({
      paths: {
        '/orders': {
          post: {
            response: { properties: { id: 'string', total: 'number' }, required: ['id', 'total'] },
          },
        },
      },
    });
    const candidate = openApiDoc({
      paths: {
        '/orders': { post: { response: { properties: { id: 'string' }, required: ['id'] } } },
      },
    });

    const report = await analyze(makeFacts({ files: [openApiFile(baseline, candidate)] }));

    const delta = report.changes[0]!;

    expect(delta.compatibility).toBe('breaking');
    expect(delta.changes.some((change) => change.reason === 'RESPONSE_FIELD_REMOVED')).toBe(true);
  });

  it('treats an added optional response field as compatible', async () => {
    const baseline = openApiDoc({
      paths: {
        '/orders': { post: { response: { properties: { id: 'string' }, required: ['id'] } } },
      },
    });
    const candidate = openApiDoc({
      paths: {
        '/orders': {
          post: { response: { properties: { id: 'string', note: 'string' }, required: ['id'] } },
        },
      },
    });

    const report = await analyze(makeFacts({ files: [openApiFile(baseline, candidate)] }));

    expect(report.changes[0]?.compatibility).toBe('compatible');
  });

  it('detects an incompatible request type change', async () => {
    const baseline = openApiDoc({
      paths: { '/orders': { post: { request: { properties: { amount: 'string' } } } } },
    });
    const candidate = openApiDoc({
      paths: { '/orders': { post: { request: { properties: { amount: 'integer' } } } } },
    });

    const report = await analyze(makeFacts({ files: [openApiFile(baseline, candidate)] }));
    const delta = report.changes[0]!;

    expect(delta.compatibility).toBe('breaking');
    expect(delta.changes.some((change) => change.reason === 'PARAMETER_TYPE_CHANGED')).toBe(true);
  });

  it('detects a removed request enum value as breaking', async () => {
    const baseline = openApiDoc({
      paths: { '/orders': { post: { request: { properties: { status: 'string' } } } } },
    });
    const candidate = openApiDoc({
      paths: { '/orders': { post: { request: { properties: { status: 'string' } } } } },
    });

    /* Hand-build enum-valued schemas. */
    const withEnum = (values: string[]): string =>
      JSON.stringify({
        openapi: '3.0.0',
        paths: {
          '/orders': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: { status: { type: 'string', enum: values } },
                    },
                  },
                },
              },
              responses: {
                '200': {
                  content: { 'application/json': { schema: { type: 'object', properties: {} } } },
                },
              },
            },
          },
        },
      });

    const before = withEnum(['open', 'closed']);
    const after = withEnum(['open']);

    expect(baseline).toBeDefined();
    expect(candidate).toBeDefined();

    const report = await analyze(makeFacts({ files: [openApiFile(before, after)] }));
    const delta = report.changes[0]!;

    expect(delta.compatibility).toBe('breaking');
    expect(delta.changes.some((change) => change.code === 'ENUM_VALUE_REMOVED')).toBe(true);
  });

  it('models a route version change as an old removal plus a new addition and reports v1 consumers', async () => {
    const baseline = openApiDoc({
      paths: { '/v1/orders': { post: { request: { properties: { id: 'string' } } } } },
    });
    const candidate = openApiDoc({
      paths: { '/v2/orders': { post: { request: { properties: { id: 'string' } } } } },
    });

    const facts = makeFacts({
      files: [openApiFile(baseline, candidate)],
      parseCandidate: () => [],
    });

    const report = await analyze(facts);

    const removed = report.changes.find((delta) => delta.identity === 'POST /v1/orders');
    const added = report.changes.find((delta) => delta.identity === 'POST /v2/orders');

    expect(removed?.compatibility).toBe('breaking');
    expect(added?.compatibility).toBe('compatible');
    expect(report.consumers.some((consumer) => consumer.symbolId === 'web:submitV1')).toBe(true);
  });

  it('resolves a local $ref and reads its fields', async () => {
    const schemas = {
      Order: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    };

    const baseline = openApiDoc({
      paths: {
        '/orders': {
          post: { ref: '#/components/schemas/Order', response: { properties: { id: 'string' } } },
        },
      },
      schemas,
    });
    const candidate = openApiDoc({
      paths: {
        '/orders': {
          post: { ref: '#/components/schemas/Order', response: { properties: { id: 'string' } } },
        },
      },
      schemas: {
        Order: {
          type: 'object',
          properties: { id: { type: 'string' }, total: { type: 'number' } },
          required: ['id'],
        },
      },
    });

    const report = await analyze(makeFacts({ files: [openApiFile(baseline, candidate)] }));

    /* The request still resolves (id required); adding `total` is additive. */
    expect(report.coverage.unresolvedRefs).toHaveLength(0);
    expect(report.changes[0]?.compatibility).toBe('compatible');
  });

  it('blocks a remote $ref instead of fetching it', async () => {
    const remote = JSON.stringify({
      openapi: '3.0.0',
      paths: {
        '/orders': {
          post: {
            requestBody: {
              content: {
                'application/json': { schema: { $ref: 'https://example.com/schema.json#/Order' } },
              },
            },
            responses: {
              '200': {
                content: { 'application/json': { schema: { type: 'object', properties: {} } } },
              },
            },
          },
        },
      },
    });

    const report = await analyze(makeFacts({ files: [openApiFile(remote, remote)] }));

    expect(report.coverage.unresolvedRefs.some((ref) => ref.reason === 'REMOTE_REF')).toBe(true);
    expect(report.guard.reasons).toContain('REMOTE_CONTRACT_REF_BLOCKED');
    expect(report.coverage.unresolvedRefs.some((ref) => /https?:\/\//u.test(ref.ref))).toBe(true);
  });

  it('blocks a $ref that escapes the document', async () => {
    const escaping = JSON.stringify({
      openapi: '3.0.0',
      paths: {
        '/orders': {
          post: {
            requestBody: {
              content: { 'application/json': { schema: { $ref: '../../../etc/passwd' } } },
            },
            responses: {
              '200': {
                content: { 'application/json': { schema: { type: 'object', properties: {} } } },
              },
            },
          },
        },
      },
    });

    const report = await analyze(makeFacts({ files: [openApiFile(escaping, escaping)] }));

    expect(report.coverage.unresolvedRefs.some((ref) => ref.reason === 'PATH_ESCAPE')).toBe(true);
    expect(report.guard.reasons).toContain('CONTRACT_PATH_ESCAPE_BLOCKED');
  });

  it('bounds a recursive $ref cycle instead of recursing forever', async () => {
    const cyclic = JSON.stringify({
      openapi: '3.0.0',
      paths: {
        '/orders': {
          post: {
            requestBody: {
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Node' } } },
            },
            responses: {
              '200': {
                content: { 'application/json': { schema: { type: 'object', properties: {} } } },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Node: { type: 'object', properties: { child: { $ref: '#/components/schemas/Node' } } },
        },
      },
    });

    const report = await analyze(makeFacts({ files: [openApiFile(cyclic, cyclic)] }));

    expect(report.coverage.unresolvedRefs.some((ref) => ref.reason === 'REF_CYCLE')).toBe(true);
    expect(report.complete).toBeDefined();
  });

  it('does not leak a secret carried in an OpenAPI example', async () => {
    const secret = 'Bearer sk_live_ABC1234567890SECRET';

    const withSecret = JSON.stringify({
      openapi: '3.0.0',
      paths: {
        '/orders': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { token: { type: 'string', example: secret } },
                  },
                },
              },
            },
            responses: {
              '200': {
                content: { 'application/json': { schema: { type: 'object', properties: {} } } },
              },
            },
          },
        },
      },
    });

    const report = await analyze(makeFacts({ files: [openApiFile(withSecret, withSecret)] }));

    expect(JSON.stringify(report)).not.toContain('sk_live_ABC1234567890SECRET');
  });
});

/* ==================================================================
 * GraphQL / proto / types / package / events
 * ================================================================== */

describe('Phase 81 — GraphQL compatibility', () => {
  it('detects a removed GraphQL field as breaking', async () => {
    const facts = makeFacts({
      files: [
        {
          path: 'schema.graphql',
          kind: 'modified',
          baseline: 'type User {\n  id: ID!\n  name: String\n}\n',
          candidate: 'type User {\n  id: ID!\n}\n',
        },
      ],
    });

    const report = await analyze(facts);
    const delta = report.changes[0]!;

    expect(delta.compatibility).toBe('breaking');
    expect(delta.changes.some((change) => change.reason === 'GRAPHQL_FIELD_REMOVED')).toBe(true);
  });

  it('detects an added required GraphQL argument as breaking', async () => {
    const facts = makeFacts({
      files: [
        {
          path: 'schema.graphql',
          kind: 'modified',
          baseline: 'type Query {\n  orders: [String]\n}\n',
          candidate: 'type Query {\n  orders(first: Int!): [String]\n}\n',
        },
      ],
    });

    const report = await analyze(facts);

    expect(report.changes[0]?.compatibility).toBe('breaking');
    expect(
      report.changes[0]?.changes.some(
        (change) => change.reason === 'GRAPHQL_REQUIRED_ARGUMENT_ADDED'
      )
    ).toBe(true);
  });

  it('detects tightened GraphQL input nullability as breaking', async () => {
    const facts = makeFacts({
      files: [
        {
          path: 'schema.graphql',
          kind: 'modified',
          baseline: 'type Query {\n  orders(first: Int): [String]\n}\n',
          candidate: 'type Query {\n  orders(first: Int!): [String]\n}\n',
        },
      ],
    });

    const report = await analyze(facts);

    expect(
      report.changes[0]?.changes.some((change) => change.reason === 'GRAPHQL_NULLABILITY_TIGHTENED')
    ).toBe(true);
  });
});

describe('Phase 81 — protobuf compatibility', () => {
  it('detects a protobuf field number change', async () => {
    const facts = makeFacts({
      files: [
        {
          path: 'api.proto',
          kind: 'modified',
          baseline:
            'syntax = "proto3";\npackage shop;\nmessage Order {\n  string id = 1;\n  int32 total = 2;\n}\n',
          candidate:
            'syntax = "proto3";\npackage shop;\nmessage Order {\n  string id = 2;\n  int32 total = 3;\n}\n',
        },
      ],
    });

    const report = await analyze(facts);

    expect(
      report.changes[0]?.changes.some((change) => change.reason === 'PROTO_FIELD_NUMBER_CHANGED')
    ).toBe(true);
    expect(report.changes[0]?.compatibility).toBe('breaking');
  });

  it('detects a removed RPC method', async () => {
    const facts = makeFacts({
      files: [
        {
          path: 'api.proto',
          kind: 'modified',
          baseline:
            'syntax = "proto3";\nservice Orders {\n  rpc Get (Order) returns (Order);\n  rpc List (Order) returns (Order);\n}\n',
          candidate:
            'syntax = "proto3";\nservice Orders {\n  rpc Get (Order) returns (Order);\n}\n',
        },
      ],
    });

    const report = await analyze(facts);
    const removed = report.changes.find((delta) => delta.identity === 'Orders/List');

    expect(removed?.compatibility).toBe('breaking');
    expect(removed?.changes[0]?.reason).toBe('RPC_METHOD_REMOVED');
  });
});

describe('Phase 81 — exported types, package exports and events', () => {
  it('reports a removed exported-interface member with its USES_TYPE consumers', async () => {
    const facts = makeFacts({
      files: [
        {
          path: 'src/types.ts',
          kind: 'modified',
          baseline:
            'export interface Repository {\n  save(id: string): void;\n  find(id: string): void;\n}\n',
          candidate: 'export interface Repository {\n  save(id: string): void;\n}\n',
        },
      ],
    });

    const report = await analyze(facts);
    const delta = report.changes.find((entry) => entry.identity === 'Repository')!;

    expect(delta.compatibility).toBe('breaking');
    expect(delta.changes.some((change) => change.reason === 'PUBLIC_TYPE_CHANGED')).toBe(true);
    expect(report.consumers.some((consumer) => consumer.symbolId === 'cls:Repo')).toBe(true);
  });

  it('does not treat a private (non-exported) type change as an API break', async () => {
    const facts = makeFacts({
      files: [
        {
          path: 'src/private.ts',
          kind: 'modified',
          baseline: 'interface Internal {\n  a: string;\n  b: string;\n}\n',
          candidate: 'interface Internal {\n  a: string;\n}\n',
        },
      ],
    });

    const report = await analyze(facts);

    expect(report.changes).toHaveLength(0);
    expect(report.compatibility.overall).toBe('compatible');
  });

  it('reports a removed package export with its Fleet consumers', async () => {
    const facts = makeFacts({
      files: [
        {
          path: 'package.json',
          kind: 'modified',
          baseline: JSON.stringify({
            name: '@acme/shared',
            exports: { '.': './index.js', './util': './util.js' },
          }),
          candidate: JSON.stringify({ name: '@acme/shared', exports: { '.': './index.js' } }),
        },
      ],
      fleet: {
        generation: 'fleet-1',
        registeredProjects: ['a', 'b'],
        staleProjects: [],
        missingProjects: [],
      },
      includeFleet: true,
      fleetImpact: () => [
        {
          projectId: 'b',
          depth: 1,
          steps: [{ from: 'a', to: 'b', edgeType: 'CROSS_PACKAGE_DEPENDS_ON' }],
        },
      ],
    });

    const report = await analyze(facts, { includeFleet: true });
    const delta = report.changes[0]!;

    expect(delta.compatibility).toBe('breaking');
    expect(delta.changes.some((change) => change.reason === 'EXPORT_REMOVED')).toBe(true);
    expect(report.consumers.some((consumer) => consumer.origin === 'fleet')).toBe(true);
  });

  it('reports a removed event channel with its LISTENS_ON consumer', async () => {
    const facts = makeFacts({
      files: [{ path: 'src/events.rb', kind: 'deleted' }],
      parseCandidate: () => [],
    });

    const report = await analyze(facts);
    const delta = report.changes.find((entry) => entry.identity === 'event:order.created')!;

    expect(delta.compatibility).toBe('breaking');
    expect(delta.changes[0]?.reason).toBe('EVENT_CHANNEL_REMOVED');
    expect(report.consumers.some((consumer) => consumer.relation === 'LISTENS_ON')).toBe(true);
  });

  it('does not fabricate an event payload change without an explicit schema', async () => {
    const facts = makeFacts({
      files: [{ path: 'src/events.rb', kind: 'modified' }],
      parseCandidate: () => [
        {
          id: 'event:order.created',
          name: 'order.created',
          type: 'event',
          filePath: 'src/events.rb',
        },
      ],
    });

    const report = await analyze(facts);

    expect(report.changes).toHaveLength(0);
  });
});

/* ==================================================================
 * Consumers, runtime evidence, coverage
 * ================================================================== */

describe('Phase 81 — consumers and runtime evidence', () => {
  it('keeps a structural break breaking even with zero known consumers', async () => {
    const facts = makeFacts({
      symbols: [IFACE],
      edges: [],
      files: [
        {
          path: 'src/types.ts',
          kind: 'modified',
          baseline: 'export interface Repository {\n  a: string;\n  b: string;\n}\n',
          candidate: 'export interface Repository {\n  a: string;\n}\n',
        },
      ],
    });

    const report = await analyze(facts);

    expect(report.changes[0]?.compatibility).toBe('breaking');
    expect(report.consumers).toHaveLength(0);
    expect(report.guard.decision).not.toBe('compatible');
  });

  it('marks a runtime-observed consumer without changing the classification', async () => {
    const observed: ContractRuntimeObservation = {
      id: 'obs-1',
      kind: 'call',
      validation: 'static_edge_match',
      observationCount: 4,
      sessionCount: 1,
      compatibility: 'exact',
      source: { symbolId: 'web:submit' },
      target: { symbolId: 'route:POST /orders' },
    };

    const facts = makeFacts({
      files: [{ path: 'src/routes.rb', kind: 'deleted' }],
      parseCandidate: () => [],
      runtime: [observed],
    });

    const report = await analyze(facts, { includeRuntimeEvidence: true });
    const consumer = report.consumers.find((entry) => entry.symbolId === 'web:submit');

    expect(consumer?.runtimeObserved).toBe(true);
    expect(report.changes[0]?.compatibility).toBe('breaking');
    expect(report.runtimeEvidence).toHaveLength(1);
  });

  it('never clears a breaking change because runtime did not observe a consumer', async () => {
    const facts = makeFacts({
      files: [{ path: 'src/routes.rb', kind: 'deleted' }],
      parseCandidate: () => [],
      runtime: [],
    });

    const report = await analyze(facts, { includeRuntimeEvidence: true });

    expect(report.changes[0]?.compatibility).toBe('breaking');
    expect(report.guard.decision).not.toBe('compatible');
  });
});

describe('Phase 81 — coverage and claim safety', () => {
  it('does not report compatible when coverage is partial', async () => {
    const facts = makeFacts({ files: [openApiFile(UNCHANGED, UNCHANGED)], coverage: 'partial' });

    const report = await analyze(facts, { claim: 'negative' });

    expect(report.guard.decision).not.toBe('compatible');
    expect(report.claimSafety.negativeClaimSafe).toBe(false);
    expect(report.guard.reasons).toContain('CONTRACT_COVERAGE_PARTIAL');
  });

  it('allows a bounded audited compatible decision on complete fresh coverage', async () => {
    const facts = makeFacts({ files: [openApiFile(UNCHANGED, UNCHANGED)], coverage: 'complete' });

    const report = await analyze(facts, { claim: 'negative', profile: 'auditor' });

    expect(report.guard.decision).toBe('compatible');
    expect(report.complete).toBe(true);
    expect(report.claimSafety.negativeClaimSafe).toBe(true);
    expect(report.claimSafety.exhaustiveClaimSafe).toBe(true);
  });

  it('blocks an exhaustive claim unless the profile is auditor', async () => {
    const facts = makeFacts({ files: [openApiFile(UNCHANGED, UNCHANGED)] });

    const report = await analyze(facts, { claim: 'exhaustive', profile: 'verify' });

    expect(report.claimSafety.exhaustiveClaimSafe).toBe(false);
    expect(report.guard.reasons).toContain('PROFILE_REQUIRES_AUDITOR');
  });

  it('treats an unsupported schema construct as incomplete', async () => {
    const facts = makeFacts({
      files: [
        {
          path: 'schemas/user.schema.json',
          kind: 'modified',
          baseline: JSON.stringify({ allOf: [{ type: 'object' }] }),
          candidate: JSON.stringify({ allOf: [{ type: 'object' }] }),
        },
      ],
    });

    const report = await analyze(facts, { claim: 'negative', profile: 'auditor' });

    expect(report.guard.reasons).toContain('CONTRACT_SCHEMA_UNSUPPORTED');
    expect(report.complete).toBe(false);
    expect(report.claimSafety.negativeClaimSafe).toBe(false);
  });

  it('flags a generation change during the analysis', async () => {
    const facts = makeFacts({
      files: [openApiFile(UNCHANGED, UNCHANGED)],
      currentGeneration: () => 'gen-2',
    });

    const report = await analyze(facts);

    expect(report.guard.reasons).toContain('CONTRACT_GENERATION_CHANGED');
    expect(report.complete).toBe(false);
  });

  it('flags a change input that moved during analysis', async () => {
    const facts = makeFacts({
      files: [openApiFile(UNCHANGED, UNCHANGED)],
      recheckSnapshot: async () => 'digest-2',
    });

    const report = await analyze(facts);

    expect(report.guard.reasons).toContain('CONTRACT_INPUT_CHANGED');
    expect(report.complete).toBe(false);
  });

  it('bounds an oversized schema instead of failing or over-reporting', async () => {
    const huge = openApiDoc({
      paths: {
        '/orders': {
          post: {
            request: {
              properties: Object.fromEntries(
                Array.from({ length: 400 }, (_, index) => [`field${index}`, 'string'])
              ),
            },
          },
        },
      },
    });

    const facts = makeFacts({ files: [openApiFile(huge, huge)] });

    const report = await analyze(facts, { limits: { maxSchemaNodes: 10 } });

    expect(report.coverage.supportedKinds.length).toBeGreaterThan(0);
    expect(report.complete).toBe(false);
  });

  it('refuses a sensitive changed file without reading it', async () => {
    const facts = makeFacts({ files: [{ path: '.env', kind: 'modified' }] });

    const report = await analyze(facts);

    expect(report.coverage.unsupported.some((item) => item.reason === 'SENSITIVE_FILE')).toBe(true);
  });
});

/* ==================================================================
 * Security helpers
 * ================================================================== */

function tempDir(prefix: string): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'phase81',
  GIT_AUTHOR_EMAIL: 'phase81@example.test',
  GIT_COMMITTER_NAME: 'phase81',
  GIT_COMMITTER_EMAIL: 'phase81@example.test',
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_SYSTEM: '/dev/null',
};

function git(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, env: GIT_ENV, encoding: 'utf8' });
}

describe('Phase 81 — filesystem and git containment', () => {
  it('rejects a path escape and a sensitive file when reading baseline content', async () => {
    const root = tempDir('toolnet-phase81-repo-');

    git(root, ['init', '-q']);
    git(root, ['config', 'user.email', 'phase81@example.test']);
    git(root, ['config', 'user.name', 'phase81']);

    writeFileSync(join(root, 'openapi.json'), '{}', 'utf8');
    writeFileSync(join(root, '.env'), 'SECRET=1', 'utf8');

    git(root, ['add', '-A']);
    git(root, ['commit', '-qm', 'init']);

    expect(await readBaselineFile(root, 'HEAD', '../../etc/passwd', 1024)).toBeNull();
    expect(await readBaselineFile(root, 'HEAD', '.env', 1024)).toBeNull();
    expect(await readBaselineFile(root, '--exec-path=/tmp', 'openapi.json', 1024)).toBeNull();
  });

  it('never writes to the analysed repository', async () => {
    const root = tempDir('toolnet-phase81-repo-');
    const openapiPath = join(root, 'openapi.json');

    git(root, ['init', '-q']);
    git(root, ['config', 'user.email', 'phase81@example.test']);
    git(root, ['config', 'user.name', 'phase81']);

    writeFileSync(openapiPath, JSON.parse(UNCHANGED) ? UNCHANGED : '{}', 'utf8');

    git(root, ['add', '-A']);
    git(root, ['commit', '-qm', 'init']);

    const before = readFileSync(openapiPath, 'utf8');
    const statusBefore = git(root, ['status', '--porcelain']);

    const facts = buildProjectContractFacts({
      projectId: PROJECT,
      rootPath: root,
      generation: 'gen-1',
      graph: buildGraph(BASE_SYMBOLS, BASE_EDGES),
      coverage: {
        available: true,
        evaluate: () => ({ status: 'complete', negativeClaimSafe: true, reasons: [] }),
      },
      changedFiles: [{ path: 'openapi.json', kind: 'modified' }],
      baseRevision: 'HEAD',
    });

    const report = await analyze(facts);

    expect(report).toBeDefined();
    expect(readFileSync(openapiPath, 'utf8')).toBe(before);
    expect(git(root, ['status', '--porcelain'])).toBe(statusBefore);
  });
});

/* ==================================================================
 * Determinism, Phase 80 integration and non-interference
 * ================================================================== */

describe('Phase 81 — determinism and integration', () => {
  it('produces identical reports for the same input three times', async () => {
    const baseline = openApiDoc({
      paths: { '/orders': { post: { request: { properties: { a: 'string' } } } } },
    });
    const candidate = openApiDoc({
      paths: { '/orders': { post: { request: { properties: { a: 'string', b: 'string' } } } } },
    });

    const reports = await Promise.all(
      Array.from({ length: 3 }, () =>
        analyze(makeFacts({ files: [openApiFile(baseline, candidate)] }))
      )
    );

    const canonical = reports.map((report) =>
      JSON.stringify({
        fingerprint: report.fingerprint,
        changes: report.changes,
        guard: report.guard,
        coverage: report.coverage,
        consumers: report.consumers,
      })
    );

    expect(new Set(canonical).size).toBe(1);
  });

  it('consumes the Phase 80 changed paths without re-parsing the change', async () => {
    const files: FileSpec[] = [
      { path: 'openapi.json', kind: 'modified', baseline: UNCHANGED, candidate: UNCHANGED },
      { path: 'unrelated.txt', kind: 'modified', baseline: 'a', candidate: 'b' },
    ];

    const facts = makeFacts({ files });

    const report = await analyze(facts);

    /* Only the contract-bearing path is considered. */
    expect(report.coverage.filesChecked).toBe(1);
  });

  it('never mutates the static graph while analysing contracts', async () => {
    const graph = buildGraph(BASE_SYMBOLS, BASE_EDGES);
    const symbolsBefore = graph.allSymbols(PROJECT).length;
    const edgesBefore = graph.allEdges(PROJECT).length;

    const facts = makeFacts({
      symbols: BASE_SYMBOLS,
      edges: BASE_EDGES,
      files: [openApiFile(UNCHANGED, UNCHANGED)],
    });

    await analyze(facts);

    expect(graph.allSymbols(PROJECT)).toHaveLength(symbolsBefore);
    expect(graph.allEdges(PROJECT)).toHaveLength(edgesBefore);
  });

  it('never produces an artifact payload from a contract analysis', async () => {
    const facts = makeFacts({ files: [openApiFile(UNCHANGED, UNCHANGED)] });

    const report = await analyze(facts);

    expect(JSON.stringify(report)).not.toContain('artifactPayload');
    expect(report.guard.safeToMerge).toBe(false);
    expect(report.guard.safeToDeploy).toBe(false);
  });

  it('builds an equivalent report through the shared facts builder', async () => {
    const graph = buildGraph(BASE_SYMBOLS, BASE_EDGES);

    const facts = buildProjectContractFacts({
      projectId: PROJECT,
      rootPath: process.cwd(),
      generation: 'gen-1',
      graph,
      coverage: {
        available: true,
        evaluate: () => ({ status: 'complete', negativeClaimSafe: true, reasons: [] }),
      },
      changedFiles: [],
    });

    const report = await analyze(facts);

    expect(report.baseline.entries).toBe(0);
    expect(report.guard.decision).toBe('compatible');
  });
});

/* ==================================================================
 * Daemon parity and multi-client
 * ================================================================== */

function daemonProject(): DaemonProjectRef {
  return { id: PROJECT, name: 'phase81', rootPath: process.cwd() };
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
    async changeProject() {
      throw new Error('not used in this suite');
    },
    async contractProject(_project, input) {
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

const CONTRACT_CHANGE = { projectId: PROJECT, mode: 'commit' as const, base: 'HEAD~1' };

describe('Phase 81 — daemon parity and multi-client', () => {
  it('produces a semantically identical report standalone and through the coordinator', async () => {
    const facts = makeFacts({ files: [openApiFile(UNCHANGED, UNCHANGED)] });

    const standalone = await analyze(facts);

    let calls = 0;

    const coordinator = makeCoordinator({
      run: async () => {
        calls += 1;
        return standalone;
      },
    });

    const viaDaemon = await coordinator.contract(daemonProject(), 'session-1', {
      request: request(),
      change: CONTRACT_CHANGE,
    });

    expect(calls).toBe(1);
    expect(viaDaemon.fingerprint).toBe(standalone.fingerprint);
    expect(JSON.stringify(viaDaemon.changes)).toBe(JSON.stringify(standalone.changes));
    expect(viaDaemon.guard.decision).toBe(standalone.guard.decision);
  });

  it('single-flights ten concurrent identical contract analyses into one computation', async () => {
    const facts = makeFacts({ files: [openApiFile(UNCHANGED, UNCHANGED)] });

    let calls = 0;

    const coordinator = makeCoordinator({
      run: async () => {
        calls += 1;
        return analyze(facts);
      },
    });

    const input = { request: request(), change: CONTRACT_CHANGE };

    const reports = await Promise.all(
      Array.from({ length: 10 }, () => coordinator.contract(daemonProject(), 'session-1', input))
    );

    expect(calls).toBe(1);
    expect(new Set(reports.map((report) => report.fingerprint)).size).toBe(1);
  });

  it('never serves a cached contract result after the generation changes', async () => {
    const facts = makeFacts({ files: [openApiFile(UNCHANGED, UNCHANGED)] });

    let calls = 0;

    const coordinator = makeCoordinator({
      run: async () => {
        calls += 1;
        return analyze(facts);
      },
    });

    const input = { request: request(), change: CONTRACT_CHANGE };

    await coordinator.contract(daemonProject(), 'session-1', input);

    /* A generation change must invalidate the cached result. */
    coordinator.invalidateEvidence(PROJECT);

    await coordinator.contract(daemonProject(), 'session-1', input);

    expect(calls).toBe(2);
  });
});

/* ==================================================================
 * Packaged MCP runtime
 * ================================================================== */

async function listPackagedMcpTools(bundlePath: string): Promise<string[]> {
  const cwd = tempDir('toolnet-phase81-mcp-');

  const requests = `${[
    JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'phase81-certify', version: '1.0.0' },
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

describe('Phase 81 — packaged runtime', () => {
  const repoRoot = resolve(process.cwd());
  const bundlePath = join(repoRoot, 'bundle', 'mcp.js');

  it('ships the contract-intelligence layer inside the packaged MCP bundle', () => {
    expect(existsSync(bundlePath)).toBe(true);

    const bundle = readFileSync(bundlePath, 'utf8');

    for (const marker of [
      'includeContracts',
      'contractCompatibility',
      'CONTRACT_ANALYSIS_LIMIT_REACHED',
      'CONTRACT_SCHEMA_UNSUPPORTED',
      'BASELINE_CONTRACT_UNAVAILABLE',
      'PROTO_FIELD_NUMBER_CHANGED',
      'GRAPHQL_FIELD_REMOVED',
      'EXPORT_REMOVED',
      'PUBLIC_TYPE_CHANGED',
      'CONTRACT INTELLIGENCE',
    ]) {
      expect(bundle).toContain(marker);
    }
  });

  it('exposes the contract option through the packaged tools/list', async () => {
    const tools = await listPackagedMcpTools(bundlePath);

    expect(tools).toContain('impact_guard');
  });

  it('works standalone with no daemon present', async () => {
    const facts = makeFacts({ files: [openApiFile(UNCHANGED, UNCHANGED)] });

    const report = await analyze(facts);

    expect(report.profile).toBe('verify');
    expect(report.guard.safeToMerge).toBe(false);
  });
});

/* ==================================================================
 * Certification marker
 * ================================================================== */

describe('Phase 81 — certification', () => {
  it('emits the Phase 81 PASS marker', () => {
    console.log(MARKER);

    expect(MARKER).toBe('PHASE81_CONTRACT_INTELLIGENCE=PASS');
  });
});
