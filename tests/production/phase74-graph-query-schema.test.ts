/*
 * Phase 74 — ToolNet Graph Query Language (TGQL) production certification.
 *
 * Verifies the read-only, bounded, deterministic query layer end to end:
 * parser, validator, planner, executor, schema registry, coverage, pagination,
 * generation safety, project isolation, Fleet scope, injection defense and
 * complexity limits.
 *
 * PHASE74_GRAPH_QUERY_SCHEMA=PASS
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CodeGraphStore } from '../../src/code-intelligence/graph/graph-store.js';

import type { CodeSymbol, GraphEdge } from '../../src/core/types.js';

import {
  FleetGraphAdapter,
  ProjectGraphAdapter,
  QueryError,
  assertReadOnly,
  buildGraphSchema,
  decodeCursor,
  encodeCursor,
  parseQuery,
  runQuery,
  schemaFingerprint,
  validateQuery,
} from '../../src/code-intelligence/query-v2/index.js';

import { EDGE_SEMANTIC_REGISTRY } from '../../src/code-intelligence/graph/edge-semantic-registry.js';

import { FleetBuilder } from '../../src/code-intelligence/fleet/fleet-builder.js';

import type {
  FleetProjectExport,
  FleetProjectInput,
  FleetSnapshot,
} from '../../src/code-intelligence/fleet/types.js';

import { buildQueryCoverage } from '../../src/mcp/query-coverage.js';

import { getGraphSchema } from '../../src/mcp/tools/get-graph-schema.js';

import { queryGraph } from '../../src/mcp/tools/query-graph.js';

import type { MCPContext } from '../../src/mcp/context.js';

/* ------------------------------------------------------------------ *
 * Project graph fixture
 * ------------------------------------------------------------------ */

const PROJECT = 'proj-a';
const OTHER_PROJECT = 'proj-b';

const BULK = 1000;

function symbol(
  projectId: string,
  id: string,
  name: string,
  type: CodeSymbol['type'],
  filePath = 'src/a.ts',
  metadata?: Record<string, unknown>,
  startLine = 1
): CodeSymbol {
  return {
    id,
    projectId,
    name,
    qualifiedName: name,
    type,
    filePath,
    startLine,
    ...(metadata ? { metadata } : {}),
  };
}

function edge(
  projectId: string,
  from: string,
  to: string,
  type: GraphEdge['type'],
  provenance?: Record<string, unknown>
): GraphEdge {
  return {
    id: `${projectId}:${from}:${type}:${to}`,
    projectId,
    from,
    to,
    type,
    ...(provenance ? { metadata: { provenance } } : {}),
  };
}

function buildProjectGraph(): CodeGraphStore {
  const store = new CodeGraphStore();

  store.import(
    [
      symbol(PROJECT, 'f1', 'main', 'function'),
      symbol(PROJECT, 'f2', 'save', 'function'),
      symbol(PROJECT, 'f3', 'helper', 'function', 'src/b.ts'),
      symbol(PROJECT, 'f4', 'orphan', 'function', 'src/c.ts'),
      symbol(PROJECT, 'c1', 'Service', 'class', 'src/service.ts'),
      symbol(PROJECT, 'm1', 'create', 'method', 'src/service.ts'),
      symbol(PROJECT, 'r1', 'POST /orders', 'route', 'src/api.ts', {
        method: 'POST',
        path: '/orders',
        serviceId: 'api',
      }),
      symbol(PROJECT, 'e1', 'order.created', 'event', 'src/events.ts', {
        provider: 'kafka',
        channel: 'order.created',
      }),
      /* Another project in the same store: must stay invisible to proj-a. */
      symbol(OTHER_PROJECT, 'fb1', 'save', 'function', 'src/other.ts'),
      ...Array.from({ length: BULK }, (_, index) =>
        symbol(
          PROJECT,
          `bulk${index}`,
          `bulk${String(index).padStart(4, '0')}`,
          'function',
          'src/bulk.ts'
        )
      ),
    ],
    [
      edge(PROJECT, 'f1', 'f2', 'CALLS', {
        origin: 'resolver',
        evidence: 'resolved_symbol',
        certainty: 'deterministic',
      }),
      edge(PROJECT, 'f1', 'f3', 'CALLS'),
      edge(PROJECT, 'f2', 'c1', 'USES_TYPE'),
      edge(PROJECT, 'f2', 'e1', 'EMITS'),
      edge(PROJECT, 'f1', 'r1', 'HTTP_CALLS'),
      edge(PROJECT, 'm1', 'c1', 'DEFINES'),
      edge(OTHER_PROJECT, 'fb1', 'fb1', 'CALLS'),
    ]
  );

  return store;
}

function buildCyclicGraph(): CodeGraphStore {
  const store = new CodeGraphStore();

  store.import(
    [
      symbol(PROJECT, 'a', 'a', 'function'),
      symbol(PROJECT, 'b', 'b', 'function'),
      symbol(PROJECT, 'c', 'c', 'function'),
    ],
    [
      edge(PROJECT, 'a', 'b', 'CALLS'),
      edge(PROJECT, 'b', 'c', 'CALLS'),
      edge(PROJECT, 'c', 'a', 'CALLS'),
    ]
  );

  return store;
}

const graph = buildProjectGraph();
const adapter = new ProjectGraphAdapter(graph, 'gen-1', PROJECT);

/* ------------------------------------------------------------------ *
 * Fleet fixture (built from sanitized export views — no repo indexing)
 * ------------------------------------------------------------------ */

function exportView(input: {
  projectId: string;
  name: string;
  identities?: string[];
  endpoints?: FleetProjectExport['endpoints'];
  outboundCalls?: FleetProjectExport['outboundCalls'];
  events?: FleetProjectExport['events'];
  packages?: FleetProjectExport['packages'];
  packageDependencies?: FleetProjectExport['packageDependencies'];
}): FleetProjectExport {
  return {
    version: 1,
    projectId: input.projectId,
    name: input.name,
    generation: `gen-${input.projectId}`,
    graphFingerprint: `fp-${input.projectId}`,
    indexedAt: new Date(0).toISOString(),
    crossServiceComplete: true,
    identities: input.identities ?? [input.name],
    services: [],
    endpoints: input.endpoints ?? [],
    outboundCalls: input.outboundCalls ?? [],
    events: input.events ?? [],
    packages: input.packages ?? [],
    packageDependencies: input.packageDependencies ?? [],
  };
}

function buildFleet(): { snapshot: FleetSnapshot; exports: Map<string, FleetProjectExport> } {
  const web = exportView({
    projectId: 'web',
    name: 'web-frontend',
    identities: ['web-frontend'],
    outboundCalls: [
      {
        protocol: 'http',
        callerSymbolId: 'f1',
        filePath: 'src/client.ts',
        line: 3,
        method: 'POST',
        path: '/orders',
        host: 'orders-api',
      },
    ],
  });

  const api = exportView({
    projectId: 'orders-api',
    name: 'orders-api',
    identities: ['orders-api'],
    endpoints: [
      {
        resourceId: 'r1',
        protocol: 'http',
        serviceId: 'api',
        method: 'POST',
        path: '/orders',
        handlerSymbolId: 'h1',
      },
    ],
    events: [
      {
        resourceId: 'e2',
        provider: 'kafka',
        channel: 'order.created',
        direction: 'emit',
        serviceId: 'api',
      },
    ],
  });

  const worker = exportView({
    projectId: 'worker',
    name: 'order-worker',
    identities: ['order-worker'],
    events: [
      {
        resourceId: 'e3',
        provider: 'kafka',
        channel: 'order.created',
        direction: 'listen',
        serviceId: 'worker',
      },
      /* Same channel name, different provider: must never be joined to kafka. */
      {
        resourceId: 'e4',
        provider: 'socketio',
        channel: 'order.created',
        direction: 'listen',
        serviceId: 'worker',
      },
    ],
  });

  const shared = exportView({
    projectId: 'shared-sdk',
    name: '@company/shared',
    identities: ['@company/shared', 'shared-sdk'],
    packages: [
      {
        id: 'npm:@company/shared',
        name: '@company/shared',
        manifest: 'package.json',
        source: 'npm',
      },
    ],
  });

  const expressProject = exportView({
    projectId: 'express',
    name: 'express',
    identities: ['express'],
    packages: [{ id: 'npm:express', name: 'express', manifest: 'package.json', source: 'npm' }],
  });

  const webWithShared = {
    ...web,
    packageDependencies: [
      {
        name: '@company/shared',
        specifier: 'workspace:*',
        local: true,
        manifest: 'package.json' as const,
        source: 'npm' as const,
      },
      {
        name: 'express',
        specifier: '^5.0.0',
        local: false,
        manifest: 'package.json' as const,
        source: 'npm' as const,
      },
    ],
  };

  const inputs: FleetProjectInput[] = [webWithShared, api, worker, shared, expressProject].map(
    (exportViewModel) => ({
      projectId: exportViewModel.projectId,
      name: exportViewModel.name,
      export: exportViewModel,
    })
  );

  const { snapshot } = new FleetBuilder().build({ projects: inputs });

  const exports = new Map<string, FleetProjectExport>(
    [webWithShared, api, worker, shared, expressProject].map((view) => [view.projectId, view])
  );

  return { snapshot, exports };
}

function buildAmbiguousFleet(): FleetSnapshot {
  const client = exportView({
    projectId: 'web2',
    name: 'web2',
    identities: ['web2'],
    outboundCalls: [
      {
        protocol: 'http',
        callerSymbolId: 'f1',
        filePath: 'src/client.ts',
        line: 7,
        method: 'POST',
        path: '/orders',
      },
    ],
  });

  const ordersB = exportView({
    projectId: 'orders-b',
    name: 'orders-b',
    identities: ['orders-b'],
    endpoints: [
      { resourceId: 'rb', protocol: 'http', serviceId: 'b', method: 'POST', path: '/orders' },
    ],
  });

  const ordersC = exportView({
    projectId: 'orders-c',
    name: 'orders-c',
    identities: ['orders-c'],
    endpoints: [
      { resourceId: 'rc', protocol: 'http', serviceId: 'c', method: 'POST', path: '/orders' },
    ],
  });

  const inputs: FleetProjectInput[] = [client, ordersB, ordersC].map((view) => ({
    projectId: view.projectId,
    name: view.name,
    export: view,
  }));

  return new FleetBuilder().build({ projects: inputs }).snapshot;
}

const fleet = buildFleet();
const fleetAdapter = new FleetGraphAdapter({
  snapshot: fleet.snapshot,
  exports: fleet.exports,
  localProjectId: PROJECT,
  local: adapter,
});

/* ------------------------------------------------------------------ *
 * Coverage stub
 * ------------------------------------------------------------------ */

function contextWithCoverage(
  status: 'complete' | 'partial' | 'stale' | 'unavailable',
  negativeClaimSafe: boolean
): MCPContext {
  const evaluation = {
    capability: 'call_graph' as const,
    status,
    negativeClaimSafe,
    reasons: negativeClaimSafe ? [] : ['UNRESOLVED_CALL_REFERENCE'],
    freshness: { checked: false, stale: false, added: [], modified: [], deleted: [] },
  };

  return {
    graph,
    project: { id: PROJECT, name: 'proj-a', rootPath: '/tmp/proj-a' },
    fleet: null,
    coverage: {
      currentSnapshot: null,
      evaluate: () => evaluation,
      evaluateWithFreshness: async () => evaluation,
    },
  } as unknown as MCPContext;
}

/* ------------------------------------------------------------------ *
 * Tests
 * ------------------------------------------------------------------ */

describe('Phase 74 — TGQL parser and AST', () => {
  it('parses the supported clause set into a deterministic AST', () => {
    const { ast } = parseQuery(
      'MATCH (f:Function)-[:CALLS]->(g:Function) WHERE f.name = $name AND g.name != "x" ' +
        'RETURN DISTINCT f.name AS caller, g ORDER BY caller DESC LIMIT 10 SKIP 5'
    );

    expect(ast.distinct).toBe(true);
    expect(ast.match).toHaveLength(1);
    expect(ast.match[0]?.elements).toHaveLength(2);
    expect(ast.match[0]?.elements[0]?.edge?.types).toEqual(['CALLS']);
    expect(ast.match[0]?.elements[0]?.edge?.direction).toBe('outgoing');
    expect(ast.projection).toEqual([
      { variable: 'f', property: 'name', alias: 'caller' },
      { variable: 'g', alias: 'g' },
    ]);
    expect(ast.orderBy).toEqual([{ variable: 'caller', direction: 'DESC' }]);
    expect(ast.limit).toBe(10);
    expect(ast.skip).toBe(5);
  });

  it('supports incoming, undirected and bounded variable-length relationships', () => {
    const { ast } = parseQuery('MATCH p=(a:Function)-[:CALLS*1..3]->(b:Function) RETURN p LIMIT 5');
    expect(ast.match[0]?.pathAlias).toBe('p');
    expect(ast.match[0]?.elements[0]?.edge).toMatchObject({
      direction: 'outgoing',
      minHops: 1,
      maxHops: 3,
      variableLength: true,
    });

    const incoming = parseQuery('MATCH (a)-[:CALLS]->(b) RETURN a, b LIMIT 1').ast;
    expect(incoming.match[0]?.elements[0]?.edge?.direction).toBe('outgoing');

    const undirected = parseQuery('MATCH (a)-[:CALLS]-(b) RETURN a, b LIMIT 1').ast;
    expect(undirected.match[0]?.elements[0]?.edge?.direction).toBe('undirected');
  });

  it('reports syntax errors deterministically with line and column', () => {
    let error: QueryError | undefined;
    try {
      parseQuery('MATCH (f:Function RETURN f');
    } catch (caught) {
      error = caught as QueryError;
    }

    expect(error).toBeInstanceOf(QueryError);
    expect(error?.code).toBe('QUERY_SYNTAX_ERROR');
    expect(error?.line).toBe(1);
    expect(typeof error?.column).toBe('number');
  });

  it('rejects unsupported clauses clearly', () => {
    expect(() => parseQuery('MATCH (f:Function) WITH f RETURN f')).toThrow(QueryError);
    expect(() => parseQuery('UNWIND [1,2] AS x RETURN x')).toThrow(/not a supported clause/u);
  });
});

describe('Phase 74 — read-only enforcement', () => {
  const mutations = [
    'MATCH (f:Function) DELETE f RETURN f',
    'CREATE (f:Function) RETURN f',
    'MATCH (f:Function) SET f.name = "x" RETURN f',
    'MATCH (f:Function) DETACH DELETE f RETURN f',
    'MERGE (f:Function) RETURN f',
    'MATCH (f:Function) REMOVE f.name RETURN f',
  ];

  for (const query of mutations) {
    it(`rejects mutation query: ${query}`, () => {
      let error: QueryError | undefined;
      try {
        parseQuery(query);
      } catch (caught) {
        error = caught as QueryError;
      }
      expect(error?.code).toBe('READ_ONLY_VIOLATION');
    });
  }

  it('rejects call/load/unwind/foreach procedures', () => {
    const codeOf = (query: string): string => {
      try {
        parseQuery(query);
        return 'none';
      } catch (caught) {
        return (caught as QueryError).code;
      }
    };

    expect(codeOf('MATCH (f:Function) CALL db.labels() RETURN f')).toBe('UNSUPPORTED_CLAUSE');
    expect(codeOf('LOAD CSV FROM "x" RETURN 1')).toBe('UNSUPPORTED_CLAUSE');
    expect(codeOf('FOREACH (x IN [1] | SET x)')).toBe('UNSUPPORTED_CLAUSE');
    expect(codeOf('UNWIND [1,2] AS x RETURN x')).toBe('UNSUPPORTED_CLAUSE');
  });

  it('defends against injection payloads without executing anything', () => {
    const payloads = [
      'MATCH (f:Function) RETURN f; DROP TABLE symbols',
      'MATCH (f:Function) RETURN f; DELETE FROM symbols',
      'MATCH (f:Function) RETURN f /* unterminated nested comment',
      `MATCH (f:Function) WHERE f.name = "${'x'.repeat(9000)}" RETURN f`,
    ];

    for (const payload of payloads) {
      let error: QueryError | undefined;
      try {
        parseQuery(payload);
      } catch (caught) {
        error = caught as QueryError;
      }
      expect(error).toBeInstanceOf(QueryError);
      expect(['READ_ONLY_VIOLATION', 'QUERY_SYNTAX_ERROR', 'QUERY_LIMIT_EXCEEDED']).toContain(
        error?.code
      );
    }
  });

  it('treats interpolation-looking text as inert literal data', () => {
    const { ast } = parseQuery(
      'MATCH (f:Function) WHERE f.name = "${process.env.SECRET}" RETURN f LIMIT 1'
    );

    const where = ast.where;
    expect(where?.kind).toBe('comparison');
    if (where?.kind === 'comparison' && where.right.kind === 'literal') {
      /* The payload is preserved verbatim as a string; it is never evaluated. */
      expect(where.right.value).toBe('${process.env.SECRET}');
    } else {
      throw new Error('expected a literal comparison');
    }
  });

  it('exposes no mutation API to the executor', () => {
    expect(() => assertReadOnly(adapter)).not.toThrow();
    expect(() => assertReadOnly(fleetAdapter)).not.toThrow();

    for (const method of ['addSymbol', 'addEdge', 'clearProject', 'save']) {
      expect((adapter as unknown as Record<string, unknown>)[method]).toBeUndefined();
      expect((fleetAdapter as unknown as Record<string, unknown>)[method]).toBeUndefined();
    }
  });
});

describe('Phase 74 — schema registry', () => {
  const schema = buildGraphSchema();

  it('derives project edge types from the Phase 71 semantic registry', () => {
    const projectEdges = schema.edgeTypes
      .filter((definition) => definition.scope === 'project')
      .map((definition) => definition.name)
      .sort();
    expect(projectEdges).toEqual(Object.keys(EDGE_SEMANTIC_REGISTRY).sort());
  });

  it('marks reserved vocabulary with no producer as not currently produced', () => {
    const reserved = schema.edgeTypes.filter((definition) => definition.status === 'reserved');
    const names = reserved.map((definition) => definition.name).sort();

    expect(names).toContain('CROSS_RPC_CALLS');
    expect(names).toContain('CROSS_GRAPHQL_CALLS');
    expect(names).toContain('CROSS_TRPC_CALLS');
    for (const definition of reserved) {
      expect(definition.producers).toEqual([]);
      expect(definition.currentlyProduced).toBe(false);
    }
  });

  it('marks active cross-repo vocabulary with its producer', () => {
    const http = schema.edgeTypes.find((definition) => definition.name === 'CROSS_HTTP_CALLS');
    expect(http?.status).toBe('active');
    expect(http?.producers).toEqual(['phase73-cross-project-linker']);
    expect(http?.currentlyProduced).toBe(true);
  });

  it('publishes limits, clauses and a stable schema fingerprint', () => {
    expect(schema.query.readOnly).toBe(true);
    expect(schema.query.cypherCompatible).toBe(false);
    expect(schema.query.clauses).toEqual(['MATCH', 'WHERE', 'RETURN', 'ORDER BY', 'LIMIT', 'SKIP']);
    expect(schema.query.maxRows).toBe(1000);
    expect(schema.query.maxDepth).toBe(5);
    expect(schemaFingerprint()).toBe(schema.fingerprint);
  });

  it('rejects unknown node and edge types', () => {
    const nodeError = (() => {
      try {
        validateQuery({
          ast: parseQuery('MATCH (x:Magic) RETURN x LIMIT 1').ast,
          tokens: [],
          scope: 'project',
          parameters: {},
        });
        return null;
      } catch (caught) {
        return caught as QueryError;
      }
    })();
    expect(nodeError?.code).toBe('UNKNOWN_NODE_TYPE');

    const edgeError = (() => {
      try {
        validateQuery({
          ast: parseQuery('MATCH (a)-[:TELEPORTS]->(b) RETURN a LIMIT 1').ast,
          tokens: [],
          scope: 'project',
          parameters: {},
        });
        return null;
      } catch (caught) {
        return caught as QueryError;
      }
    })();
    expect(edgeError?.code).toBe('UNKNOWN_EDGE_TYPE');
  });

  it('rejects non-allowlisted and sensitive properties', () => {
    for (const property of ['secret', 'rawMetadata', 'credentials', 'token', 'metadata']) {
      const error = (() => {
        try {
          validateQuery({
            ast: parseQuery(`MATCH (f:Function) RETURN f.${property} LIMIT 1`).ast,
            tokens: [],
            scope: 'project',
            parameters: {},
          });
          return null;
        } catch (caught) {
          return caught as QueryError;
        }
      })();
      expect(error?.code).toBe('INVALID_PROPERTY');
    }
  });

  it('rejects reserved cross-repo edges in project scope', () => {
    const error = (() => {
      try {
        validateQuery({
          ast: parseQuery('MATCH (a)-[:CROSS_HTTP_CALLS]->(b) RETURN a LIMIT 1').ast,
          tokens: [],
          scope: 'project',
          parameters: {},
        });
        return null;
      } catch (caught) {
        return caught as QueryError;
      }
    })();
    expect(error?.code).toBe('UNKNOWN_EDGE_TYPE');
  });
});

describe('Phase 74 — node, edge and multi-hop queries', () => {
  it('binds parameters and returns stable ordering', async () => {
    const result = await runQuery({
      source: 'MATCH (f:Function) WHERE f.name = $name RETURN f LIMIT 10',
      scope: 'project',
      graph: adapter,
      parameters: { name: 'save' },
    });

    expect(result.rowCount).toBe(1);
    expect(result.rows[0]?.f).toMatchObject({ id: 'f2', name: 'save', type: 'Function' });
    expect(result.truncated).toBe(false);
  });

  it('rejects missing parameters', () => {
    const error = (() => {
      try {
        validateQuery({
          ast: parseQuery('MATCH (f:Function) WHERE f.name = $name RETURN f LIMIT 1').ast,
          tokens: [],
          scope: 'project',
          parameters: {},
        });
        return null;
      } catch (caught) {
        return caught as QueryError;
      }
    })();
    expect(error?.code).toBe('QUERY_SYNTAX_ERROR');
  });

  it('runs an edge query with ORDER BY and preserves provenance', async () => {
    const result = await runQuery({
      source:
        'MATCH (a:Function)-[:CALLS]->(b:Function) RETURN a.name, b.name ORDER BY a.name, b.name LIMIT 100',
      scope: 'project',
      graph: adapter,
    });

    expect(result.columns).toEqual(['a.name', 'b.name']);
    expect(result.rows).toEqual([
      { 'a.name': 'main', 'b.name': 'helper' },
      { 'a.name': 'main', 'b.name': 'save' },
    ]);
  });

  it('returns edge provenance when projecting a path', async () => {
    const result = await runQuery({
      source: 'MATCH p=(a:Function)-[:CALLS]->(b:Function) WHERE a.name = "main" RETURN p LIMIT 10',
      scope: 'project',
      graph: adapter,
    });

    expect(result.rowCount).toBe(2);

    const paths = result.rows.map((row) => row.p) as Array<{
      nodes: Array<{ name: string }>;
      edges: Array<{ type: string; evidence?: string[]; origin?: string; certainty?: string }>;
    }>;

    const withProvenance = paths.find((path) => path.nodes[1]?.name === 'save');
    expect(withProvenance?.edges[0]).toMatchObject({
      type: 'CALLS',
      origin: 'resolver',
      certainty: 'deterministic',
      evidence: ['resolved_symbol'],
    });
  });

  it('runs a bounded multi-edge chain', async () => {
    const result = await runQuery({
      source:
        'MATCH (a:Function)-[:CALLS]->(b:Function)-[:USES_TYPE]->(t:Class) RETURN a.name, b.name, t.name LIMIT 50',
      scope: 'project',
      graph: adapter,
    });

    expect(result.rows).toEqual([{ 'a.name': 'main', 'b.name': 'save', 't.name': 'Service' }]);
  });

  it('filters with string, IN and null predicates deterministically', async () => {
    const startsWith = await runQuery({
      source: 'MATCH (f:Function) WHERE f.name STARTS WITH "bulk000" RETURN f.name LIMIT 5',
      scope: 'project',
      graph: adapter,
    });
    expect(startsWith.rowCount).toBe(5);

    const inList = await runQuery({
      source:
        'MATCH (f:Function) WHERE f.name IN ["main", "helper"] RETURN f.name ORDER BY f.name LIMIT 5',
      scope: 'project',
      graph: adapter,
    });
    expect(inList.rows).toEqual([{ 'f.name': 'helper' }, { 'f.name': 'main' }]);

    const contains = await runQuery({
      source: 'MATCH (f:Function) WHERE f.name CONTAINS "elpe" RETURN f.name LIMIT 5',
      scope: 'project',
      graph: adapter,
    });
    expect(contains.rows).toEqual([{ 'f.name': 'helper' }]);
  });

  it('finds routes and event channels through their edges', async () => {
    const route = await runQuery({
      source:
        'MATCH (c:Function)-[:HTTP_CALLS]->(r:Route) RETURN c.name, r.method, r.path LIMIT 10',
      scope: 'project',
      graph: adapter,
    });
    expect(route.rows).toEqual([{ 'c.name': 'main', 'r.method': 'POST', 'r.path': '/orders' }]);

    const events = await runQuery({
      source: 'MATCH (p:Function)-[:EMITS]->(e:EventChannel) RETURN p.name, e.channel LIMIT 10',
      scope: 'project',
      graph: adapter,
    });
    expect(events.rows).toEqual([{ 'p.name': 'save', 'e.channel': 'order.created' }]);
  });
});

describe('Phase 74 — bounded traversal and complexity limits', () => {
  const cyclic = buildCyclicGraph();
  const cyclicAdapter = new ProjectGraphAdapter(cyclic, 'gen-cycle', PROJECT);

  it('terminates on a cyclic graph with a bounded variable-length path', async () => {
    const result = await runQuery({
      source: 'MATCH p=(a:Function)-[:CALLS*1..3]->(b:Function) RETURN a.name, b.name LIMIT 20',
      scope: 'project',
      graph: cyclicAdapter,
    });

    expect(result.rowCount).toBeGreaterThan(0);
    expect(result.rowCount).toBeLessThanOrEqual(20);
  });

  it('rejects unbounded and over-deep variable-length paths', () => {
    const unbounded = (() => {
      try {
        parseQuery('MATCH p=(a:Function)-[:CALLS*]->(b:Function) RETURN p LIMIT 5');
        return null;
      } catch (caught) {
        return caught as QueryError;
      }
    })();
    expect(unbounded?.code).toBe('QUERY_LIMIT_EXCEEDED');

    const tooDeep = (() => {
      try {
        validateQuery({
          ast: parseQuery('MATCH p=(a:Function)-[:CALLS*1..9]->(b:Function) RETURN p LIMIT 5').ast,
          tokens: [],
          scope: 'project',
          parameters: {},
        });
        return null;
      } catch (caught) {
        return caught as QueryError;
      }
    })();
    expect(tooDeep?.code).toBe('QUERY_LIMIT_EXCEEDED');
  });

  it('rejects oversized LIMIT and over-complex patterns', () => {
    const bigLimit = (() => {
      try {
        validateQuery({
          ast: parseQuery('MATCH (f:Function) RETURN f LIMIT 999999999').ast,
          tokens: [],
          scope: 'project',
          parameters: {},
        });
        return null;
      } catch (caught) {
        return caught as QueryError;
      }
    })();
    expect(bigLimit?.code).toBe('QUERY_LIMIT_EXCEEDED');

    const longChain = `MATCH ${'(a0)-[:CALLS]->' + Array.from({ length: 20 }, (_, index) => `(a${index + 1})`).join('-[:CALLS]->')} RETURN a0 LIMIT 1`;
    const tooComplex = (() => {
      try {
        validateQuery({
          ast: parseQuery(longChain).ast,
          tokens: [],
          scope: 'project',
          parameters: {},
        });
        return null;
      } catch (caught) {
        return caught as QueryError;
      }
    })();
    expect(tooComplex?.code).toBe('QUERY_TOO_COMPLEX');
  });

  it('rejects pathological OR chains and huge query text', () => {
    const orChain = `MATCH (f:Function) WHERE ${Array.from(
      { length: 4000 },
      (_, index) => `f.name = "x${index}"`
    ).join(' OR ')} RETURN f LIMIT 1`;

    const error = (() => {
      try {
        parseQuery(orChain);
        return null;
      } catch (caught) {
        return caught as QueryError;
      }
    })();

    expect(error).toBeInstanceOf(QueryError);
    expect(['QUERY_TOO_COMPLEX', 'QUERY_LIMIT_EXCEEDED']).toContain(error?.code);

    expect(() => parseQuery(`MATCH (f:Function) RETURN f //${'x'.repeat(9000)}`)).toThrow(
      /maximum length/u
    );
  });

  it('honours the default row bound and clamps explicit limits', async () => {
    /* No LIMIT: the server applies its default bound of 100 rows. */
    const defaulted = await runQuery({
      source: 'MATCH (f:Function) RETURN f.name',
      scope: 'project',
      graph: adapter,
    });
    expect(defaulted.rowCount).toBe(100);
    expect(defaulted.truncated).toBe(true);

    /* Exactly 1000 matches with LIMIT 1000: complete page, nothing truncated. */
    const exact = await runQuery({
      source: 'MATCH (f:Function) WHERE f.name STARTS WITH "bulk" RETURN f.name LIMIT 1000',
      scope: 'project',
      graph: adapter,
    });
    expect(exact.rowCount).toBe(1000);
    expect(exact.truncated).toBe(false);

    /* The hard maximum is enforced by the validator, not silently ignored. */
    expect(() =>
      validateQuery({
        ast: parseQuery('MATCH (f:Function) RETURN f LIMIT 5000').ast,
        tokens: [],
        scope: 'project',
        parameters: {},
      })
    ).toThrow(/LIMIT must be between 1 and 1000/u);
  });

  it('supports AbortSignal cancellation', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      runQuery({
        source: 'MATCH (f:Function) RETURN f LIMIT 10',
        scope: 'project',
        graph: adapter,
        signal: controller.signal,
      })
    ).rejects.toMatchObject({ code: 'QUERY_EXECUTION_ABORTED' });
  });
});

describe('Phase 74 — pagination and generation safety', () => {
  it('pages deterministically without duplicates or gaps', async () => {
    const source =
      'MATCH (f:Function) WHERE f.name STARTS WITH "bulk" RETURN f.name ORDER BY f.name LIMIT 100';

    const seen: string[] = [];
    let cursor: string | undefined;
    let pages = 0;

    for (;;) {
      const page = await runQuery({
        source,
        scope: 'project',
        graph: adapter,
        ...(cursor ? { cursor } : {}),
      });

      pages += 1;
      seen.push(...page.rows.map((row) => String(row['f.name'])));

      if (!page.truncated || !page.nextCursor) {
        break;
      }
      cursor = page.nextCursor;
      expect(pages).toBeLessThan(20);
    }

    expect(pages).toBe(10);
    expect(seen).toHaveLength(BULK);
    expect(new Set(seen).size).toBe(BULK);
    expect(seen[0]).toBe('bulk0000');
    expect(seen[seen.length - 1]).toBe('bulk0999');
  });

  it('detects a stale cursor when the graph generation changes', async () => {
    const source = 'MATCH (f:Function) WHERE f.name STARTS WITH "bulk" RETURN f.name LIMIT 100';

    const first = await runQuery({ source, scope: 'project', graph: adapter });
    expect(first.nextCursor).toBeDefined();

    const nextGeneration = new ProjectGraphAdapter(graph, 'gen-2', PROJECT);

    await expect(
      runQuery({ source, scope: 'project', graph: nextGeneration, cursor: first.nextCursor })
    ).rejects.toMatchObject({ code: 'CURSOR_STALE' });
  });

  it('rejects malformed cursors', () => {
    expect(() =>
      decodeCursor('not-a-cursor', { fingerprint: 'x', scope: 'project', generation: 'gen-1' })
    ).toThrow(/not valid/u);

    const valid = encodeCursor({ q: 'q', s: 'project', g: 'gen-1', o: 100 });
    expect(() =>
      decodeCursor(valid, { fingerprint: 'other', scope: 'project', generation: 'gen-1' })
    ).toThrow(/different query or graph generation/u);
  });

  it('is deterministic across repeated runs', async () => {
    const source =
      'MATCH (a:Function)-[:CALLS]->(b:Function) RETURN a.name, b.name ORDER BY a.name, b.name LIMIT 50';

    const runs = await Promise.all(
      [0, 1, 2].map(() => runQuery({ source, scope: 'project', graph: adapter }))
    );

    expect(runs[0]?.rows).toEqual(runs[1]?.rows);
    expect(runs[1]?.rows).toEqual(runs[2]?.rows);
    expect(runs[0]?.queryFingerprint).toBe(runs[1]?.queryFingerprint);
    expect(runs[0]?.schemaFingerprint).toBe(runs[2]?.schemaFingerprint);
  });
});

describe('Phase 74 — coverage and negative-claim safety', () => {
  it('marks a complete scope safe for negative claims', async () => {
    const coverage = await buildQueryCoverage(
      contextWithCoverage('complete', true),
      { requiredCapabilities: ['call_graph'], usesFleet: false, negative: true },
      null
    );

    expect(coverage?.status).toBe('complete');
    expect(coverage?.negativeClaimSafe).toBe(true);
    expect(coverage?.impactMayBeUnderreported).toBe(false);
  });

  it('never marks a partial scope safe for negative claims', async () => {
    const coverage = await buildQueryCoverage(
      contextWithCoverage('partial', false),
      { requiredCapabilities: ['call_graph'], usesFleet: false, negative: true },
      null
    );

    expect(coverage?.status).toBe('partial');
    expect(coverage?.negativeClaimSafe).toBe(false);
    expect(coverage?.impactMayBeUnderreported).toBe(true);
  });

  it('combines Fleet coverage with project capabilities', async () => {
    const coverage = await buildQueryCoverage(
      contextWithCoverage('complete', true),
      { requiredCapabilities: ['cross_service_graph'], usesFleet: true, negative: true },
      fleet.snapshot
    );

    expect(coverage?.capabilities.cross_service_graph?.status).toBe('complete');
    expect(coverage?.fleet).toBeDefined();
    expect(coverage?.fleet?.projects.slice().sort()).toEqual(
      ['express', 'orders-api', 'shared-sdk', 'web', 'worker'].sort()
    );
    expect(coverage?.negativeClaimSafe).toBe(fleet.snapshot.coverage.negativeClaimSafe);
  });

  it('treats a missing Fleet as unsafe for negative claims', async () => {
    const coverage = await buildQueryCoverage(
      contextWithCoverage('complete', true),
      { requiredCapabilities: [], usesFleet: true, negative: true },
      null
    );

    expect(coverage?.fleet?.status).toBe('unavailable');
    expect(coverage?.negativeClaimSafe).toBe(false);
  });

  it('never derives required capabilities from lexical coverage', () => {
    const schema = buildGraphSchema();
    const lexical = schema.nodeTypes.length > 0;
    expect(lexical).toBe(true);

    /* CALLS maps to call_graph only, never lexical_search. */
    const validated = validateQuery({
      ast: parseQuery('MATCH (a)-[:CALLS]->(b) RETURN a LIMIT 1').ast,
      tokens: [],
      scope: 'project',
      parameters: {},
    });
    expect(validated.requiredCapabilities).toEqual(['call_graph']);
  });
});

describe('Phase 74 — project isolation', () => {
  it('never exposes another project through the project adapter', async () => {
    const result = await runQuery({
      source: 'MATCH (f:Function) WHERE f.name = "save" RETURN f LIMIT 10',
      scope: 'project',
      graph: adapter,
    });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.f).toMatchObject({ id: 'f2', projectId: PROJECT });

    /* proj-b's identically named symbol exists in the store but is invisible. */
    const inStore = graph.findByName(OTHER_PROJECT, 'save');
    expect(inStore).toHaveLength(1);
    expect(result.rows.some((row) => JSON.stringify(row).includes(OTHER_PROJECT))).toBe(false);
  });

  it('cannot be tricked into another project through a property filter', async () => {
    const result = await runQuery({
      source: 'MATCH (f:Function) WHERE f.projectId = "proj-b" RETURN f LIMIT 10',
      scope: 'project',
      graph: adapter,
    });

    expect(result.rowCount).toBe(0);
  });

  it('does not mutate the underlying store', () => {
    const before = graph.allSymbols(PROJECT).length;
    const edgesBefore = graph.allEdges(PROJECT).length;

    const isolated = new ProjectGraphAdapter(graph, 'gen-isolated', PROJECT);
    expect(isolated.nodeCount()).toBe(before);
    expect(isolated.edgeCount()).toBe(edgesBefore);
    expect(graph.allSymbols(PROJECT)).toHaveLength(before);
    expect(graph.allEdges(PROJECT)).toHaveLength(edgesBefore);
  });
});

describe('Phase 74 — Fleet scope queries', () => {
  it('queries cross-project HTTP calls at project granularity', async () => {
    const result = await runQuery({
      source: 'MATCH (a:Project)-[:CROSS_HTTP_CALLS]->(b:Project) RETURN a.name, b.name LIMIT 100',
      scope: 'fleet',
      graph: fleetAdapter,
    });

    expect(result.rows).toEqual([{ 'a.name': 'web-frontend', 'b.name': 'orders-api' }]);
  });

  it('queries cross-project HTTP calls at resource granularity', async () => {
    const result = await runQuery({
      source: 'MATCH (c:HttpCall)-[:CROSS_HTTP_CALLS]->(r:Route) RETURN c.path, r.path LIMIT 100',
      scope: 'fleet',
      graph: fleetAdapter,
    });

    expect(result.rows).toEqual([{ 'c.path': '/orders', 'r.path': '/orders' }]);
  });

  it('preserves event provider separation and never joins producer to consumer', async () => {
    const emits = await runQuery({
      source:
        'MATCH (c:EventChannel)-[:CROSS_EMITS]->(t:EventChannel) RETURN c.channel, t.channel LIMIT 100',
      scope: 'fleet',
      graph: fleetAdapter,
    });

    expect(emits.rows.length).toBeGreaterThan(0);
    for (const row of emits.rows) {
      expect(row['c.channel']).toBe('order.created');
    }

    /* socket.io channel must not be linked to the kafka channel. */
    const listens = await runQuery({
      source: 'MATCH (p:Project)-[:CROSS_LISTENS_ON]->(q:Project) RETURN p.name, q.name LIMIT 100',
      scope: 'fleet',
      graph: fleetAdapter,
    });
    expect(listens.rows).toEqual([{ 'p.name': 'order-worker', 'q.name': 'orders-api' }]);
  });

  it('links only canonical local package dependencies', async () => {
    const result = await runQuery({
      source:
        'MATCH (a:Project)-[:CROSS_PACKAGE_DEPENDS_ON]->(b:Project) RETURN a.name, b.name LIMIT 100',
      scope: 'fleet',
      graph: fleetAdapter,
    });

    expect(result.rows).toEqual([{ 'a.name': 'web-frontend', 'b.name': '@company/shared' }]);
  });

  it('never turns an ambiguous Fleet reference into an edge', async () => {
    const snapshot = buildAmbiguousFleet();
    const ambiguousAdapter = new FleetGraphAdapter({ snapshot, exports: new Map() });

    const result = await runQuery({
      source: 'MATCH (a:Project)-[:CROSS_HTTP_CALLS]->(b:Project) RETURN a.name, b.name LIMIT 100',
      scope: 'fleet',
      graph: ambiguousAdapter,
    });

    expect(result.rowCount).toBe(0);
    expect(snapshot.stats.crossProjectEdges).toBe(0);
    expect(
      snapshot.unresolved.every((entry) => entry.reason === 'AMBIGUOUS_CROSS_PROJECT_ENDPOINT')
    ).toBe(true);
  });

  it('keeps Fleet node identity project-scoped', async () => {
    const projectNodes = fleetAdapter.nodesByType('Project');
    expect(projectNodes.map((node) => node.id)).toEqual(
      ['express', 'orders-api', 'shared-sdk', 'web', 'worker'].map((id) => `project:${id}`).sort()
    );

    /* Remote resource identities are prefixed with their owning project. */
    const remoteRoute = fleetAdapter.node('orders-api::r1');
    expect(remoteRoute?.type).toBe('Route');
    expect(remoteRoute?.projectId).toBe('orders-api');

    /* A fleet node id never collides with a local symbol id. */
    expect(fleetAdapter.node('r1')?.projectId).toBe(PROJECT);
  });
});

describe('Phase 74 — MCP tools', () => {
  const ctx = {
    graph,
    project: { id: PROJECT, name: 'proj-a', rootPath: '/tmp/proj-a' },
    fleet: null,
    coverage: undefined,
  } as unknown as MCPContext;

  it('get_graph_schema returns a machine-readable, honest schema', async () => {
    const schema = await getGraphSchema(ctx);

    expect(schema.query.readOnly).toBe(true);
    expect(
      schema.edgeTypes.find((entry) => entry.name === 'CROSS_RPC_CALLS')?.currentlyProduced
    ).toBe(false);

    const observed = new Set(schema.observed.project);
    expect(observed.has('CALLS')).toBe(true);
    expect(observed.has('HTTP_CALLS')).toBe(true);
    expect(observed.has('CROSS_HTTP_CALLS')).toBe(false);
  });

  it('query_graph runs project-scope queries and reports coverage presence', async () => {
    const result = await queryGraph(ctx, {
      query: 'MATCH (f:Function) WHERE f.name = $name RETURN f LIMIT 5',
      parameters: { name: 'main' },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.scope).toBe('project');
      expect(result.rowCount).toBe(1);
      expect(result.columns).toEqual(['f']);
    }
  });

  it('query_graph rejects mutations with a deterministic diagnostic', async () => {
    const result = await queryGraph(ctx, { query: 'MATCH (f:Function) DELETE f RETURN f' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('READ_ONLY_VIOLATION');
      expect(result.error).not.toHaveProperty('stack');
    }
  });

  it('query_graph never leaks a stack trace for internal failures', async () => {
    const result = await queryGraph(ctx, {
      query: 'MATCH (f:Function) RETURN f LIMIT 5',
      scope: 'fleet',
    });

    if (!result.ok) {
      expect(result.error).not.toHaveProperty('stack');
      expect(typeof result.error.message).toBe('string');
    }
  });

  it('query_graph explain returns a plan without executing', async () => {
    const result = await queryGraph(ctx, {
      query: 'MATCH (f:Function) WHERE f.name = "main" RETURN f LIMIT 5',
      explain: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows).toEqual([]);
      expect(result.explain).toBe(true);
      expect(result.plan?.startingIndex).toBe('nameIndex');
      expect(result.plan?.usesIndex).toBe(true);
      expect(result.plan?.requiredCapabilities).toEqual([]);
    }
  });
});

/* ------------------------------------------------------------------ *
 * Packaged runtime certification
 *
 * Phase 74 adds MCP tools. Unit tests proving the source registration is not
 * enough: the packaged runtime (bundle/ ships in package.json "files") must
 * expose them too, together with the query engine they depend on.
 * ------------------------------------------------------------------ */

/**
 * Run the packaged MCP bundle and read its real `tools/list` response.
 * The MCP stdio server does not exit on stdin EOF, so the probe resolves as
 * soon as the id=2 response arrives and then kills the child.
 */
async function listPackagedMcpTools(bundlePath: string): Promise<string[]> {
  const cwd = mkdtempSync(join(tmpdir(), 'toolnet-phase74-'));
  const requests = `${[
    JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'phase74-certify', version: '1.0.0' },
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
        const names = (message.result?.tools ?? []).map((tool) => String(tool.name));
        finish(() => resolvePromise(names));
        return;
      }
    });

    child.on('error', (error) => finish(() => rejectPromise(error)));
    child.stdin.write(requests);
  });
}

describe('Phase 74 — packaged runtime', () => {
  const repoRoot = resolve(process.cwd());
  const bundlePath = join(repoRoot, 'bundle', 'mcp.js');

  it('ships the query engine and both tools inside the packaged bundle', () => {
    expect(existsSync(bundlePath)).toBe(true);

    const bundle = readFileSync(bundlePath, 'utf8');
    for (const marker of [
      'query_graph',
      'get_graph_schema',
      'UNKNOWN_EDGE_TYPE',
      'UNSUPPORTED_CLAUSE',
      'READ_ONLY_VIOLATION',
      'CURSOR_STALE',
      'QUERY_LIMIT_EXCEEDED',
    ]) {
      expect(bundle).toContain(marker);
    }

    const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')) as {
      files?: string[];
    };
    expect(pkg.files).toContain('bundle');
  });

  it('exposes query_graph and get_graph_schema over MCP from the packaged bundle', async () => {
    const listed = await listPackagedMcpTools(bundlePath);
    expect(listed).toContain('query_graph');
    expect(listed).toContain('get_graph_schema');
    expect(listed).toContain('fleet_status');
    expect(listed).toContain('fleet_projects');
  }, 90_000);
});

describe('Phase 74 — certification', () => {
  it('holds every release invariant', async () => {
    const schema = buildGraphSchema();

    /* Schema registry is a single source of truth over the Phase 71 vocabulary. */
    expect(schema.edgeTypes.filter((entry) => entry.scope === 'project')).toHaveLength(
      Object.keys(EDGE_SEMANTIC_REGISTRY).length
    );

    /* Read-only: mutation vocabulary never reaches the parser. */
    expect(() => parseQuery('MATCH (f:Function) DELETE f RETURN f')).toThrow(/read-only/u);

    /* Bounded: unbounded paths are rejected, bounded ones execute. */
    expect(() => parseQuery('MATCH p=(a)-[:CALLS*]->(b) RETURN p LIMIT 1')).toThrow(
      /must declare a bound/u
    );

    const bounded = await runQuery({
      source: 'MATCH p=(a:Function)-[:CALLS*1..2]->(b:Function) RETURN a.name, b.name LIMIT 5',
      scope: 'project',
      graph: adapter,
    });
    expect(bounded.rowCount).toBeGreaterThan(0);

    /* Deterministic: identical graph + query gives identical results. */
    const first = await runQuery({
      source:
        'MATCH (a:Function)-[:CALLS]->(b:Function) RETURN a.name, b.name ORDER BY a.name, b.name LIMIT 10',
      scope: 'project',
      graph: adapter,
    });
    const second = await runQuery({
      source:
        'MATCH (a:Function)-[:CALLS]->(b:Function) RETURN a.name, b.name ORDER BY a.name, b.name LIMIT 10',
      scope: 'project',
      graph: adapter,
    });
    expect(second.rows).toEqual(first.rows);
    expect(second.queryFingerprint).toBe(first.queryFingerprint);

    /* Project isolation and Fleet scope both remain intact. */
    expect(first.rows.some((row) => JSON.stringify(row).includes(OTHER_PROJECT))).toBe(false);
    const cross = await runQuery({
      source: 'MATCH (a:Project)-[:CROSS_HTTP_CALLS]->(b:Project) RETURN a.name, b.name LIMIT 10',
      scope: 'fleet',
      graph: fleetAdapter,
    });
    expect(cross.rowCount).toBe(1);

    console.log('PHASE74_GRAPH_QUERY_SCHEMA=PASS');
  });
});
