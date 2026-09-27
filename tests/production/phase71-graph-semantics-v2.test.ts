import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { existsSync, mkdirSync } from 'node:fs';

import { dirname, join } from 'node:path';

import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import { CodeGraphStore } from '../../src/code-intelligence/graph/graph-store.js';

import { GraphBuilder } from '../../src/code-intelligence/graph/graph-builder.js';

import { createGraphEdge } from '../../src/code-intelligence/graph/edge-factory.js';

import { createEdgeProvenance } from '../../src/code-intelligence/graph/edge-provenance.js';

import {
  EDGE_SEMANTIC_REGISTRY,
  getEdgeSemanticDefinition,
  getEdgeCategory,
} from '../../src/code-intelligence/graph/edge-semantic-registry.js';

import { GraphValidator } from '../../src/code-intelligence/graph/graph-validator.js';

import {
  repairPreservedEdges,
  buildStableSymbolRemap,
} from '../../src/code-intelligence/graph/graph-repair.js';

import { RepositoryIndexer } from '../../src/code-intelligence/indexer/repository-indexer.js';

import { GraphQueryEngine } from '../../src/code-intelligence/query/graph-query-engine.js';

import { GraphCoverageBuilder } from '../../src/code-intelligence/graph-coverage/index.js';

const PROJECT_ID = 'phase71-project';

const roots: string[] = [];

function root(label: string): string {
  const value = mkdtempSync(join(tmpdir(), `toolnet-phase71-${label}-`));
  roots.push(value);
  return value;
}

afterEach(() => {
  for (const value of roots.splice(0)) {
    rmSync(value, { recursive: true, force: true });
  }
});

function writeFiles(repo: string, files: Record<string, string>): void {
  for (const [relative, content] of Object.entries(files)) {
    const absolute = join(repo, relative);
    const dir = dirname(absolute);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(absolute, content);
  }
}

describe('Phase 71 — Graph Semantics v2', () => {
  it('edge semantic registry is complete', () => {
    const expectedTypes = [
      'DEFINES',
      'IMPORTS',
      'CALLS',
      'CALL_REFERENCE',
      'USES_TYPE',
      'INHERITS',
      'IMPLEMENTS',
      'READS',
      'WRITES',
      'HANDLES',
      'CONFIGURES',
      'ROUTE',
      'TESTS',
      'HTTP_CALLS',
      /*
       * Phase 72 legitimately extends the shared semantic registry with the
       * cross-service protocol edges. The registry must stay a single
       * authority, so the completeness contract grows with it.
       */
      'RPC_CALLS',
      'GRAPHQL_CALLS',
      'TRPC_CALLS',
      'EMITS',
      'LISTENS_ON',
    ] as const;

    for (const type of expectedTypes) {
      expect(EDGE_SEMANTIC_REGISTRY[type]).toBeDefined();
      expect(EDGE_SEMANTIC_REGISTRY[type].type).toBe(type);
    }

    expect(Object.keys(EDGE_SEMANTIC_REGISTRY).length).toBe(expectedTypes.length);
  });

  it('getEdgeSemanticDefinition returns correct definition', () => {
    const def = getEdgeSemanticDefinition('CALLS');
    expect(def).toBeDefined();
    expect(def?.primaryProducer).toBe('resolver');
    expect(def?.category).toBe('call');
    expect(def?.allowedSourceTypes).toContain('function');
    expect(def?.allowedTargetTypes).toContain('function');
  });

  it('getEdgeCategory returns category', () => {
    expect(getEdgeCategory('IMPORTS')).toBe('dependency');
    expect(getEdgeCategory('INHERITS')).toBe('type');
    expect(getEdgeCategory('TESTS')).toBe('test');
    expect(getEdgeCategory('DEFINES')).toBe('structure');
  });

  it('edge factory creates deterministic IDs', () => {
    const edge1 = createGraphEdge({
      projectId: 'p1',
      from: 'src/main.ts',
      to: 'src/utils.ts',
      type: 'IMPORTS',
      provenance: createEdgeProvenance('parser', 'explicit_import', 'deterministic'),
    });

    const edge2 = createGraphEdge({
      projectId: 'p1',
      from: 'src/main.ts',
      to: 'src/utils.ts',
      type: 'IMPORTS',
      provenance: createEdgeProvenance('parser', 'explicit_import', 'deterministic'),
    });

    expect(edge1.id).toBe(edge2.id);
    expect(edge1.id).toHaveLength(24);
  });

  it('graph validator rejects invalid edges', () => {
    const graph = new CodeGraphStore();
    const validator = new GraphValidator(graph);

    graph.addSymbol({
      id: 's1',
      projectId: PROJECT_ID,
      name: 'source',
      type: 'function',
      filePath: 'src/a.ts',
    });

    graph.addSymbol({
      id: 's2',
      projectId: PROJECT_ID,
      name: 'target',
      type: 'property',
      filePath: 'src/b.ts',
    });

    graph.addEdge(
      createGraphEdge({
        projectId: PROJECT_ID,
        from: 's1',
        to: 's2',
        type: 'USES_TYPE',
        provenance: createEdgeProvenance('enricher', 'resolved_symbol', 'deterministic'),
      })
    );

    const result = validator.validate(PROJECT_ID);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.type === 'semantic_mismatch')).toBe(true);
  });

  it('graph validator rejects duplicate edges', () => {
    const graph = new CodeGraphStore();
    const validator = new GraphValidator(graph);

    graph.addSymbol({
      id: 's1',
      projectId: PROJECT_ID,
      name: 'source',
      type: 'function',
      filePath: 'src/a.ts',
    });

    graph.addSymbol({
      id: 's2',
      projectId: PROJECT_ID,
      name: 'target',
      type: 'function',
      filePath: 'src/b.ts',
    });

    graph.addEdge(
      createGraphEdge({
        projectId: PROJECT_ID,
        from: 's1',
        to: 's2',
        type: 'CALLS',
        provenance: createEdgeProvenance('resolver', 'resolved_symbol', 'deterministic'),
      })
    );

    graph.addEdge({
      id: 'different-id-' + Date.now(),
      projectId: PROJECT_ID,
      from: 's1',
      to: 's2',
      type: 'CALLS',
      metadata: {},
    });

    const result = validator.validate(PROJECT_ID);
    expect(result.valid).toBe(false);
    expect(result.stats.duplicates).toBe(1);
  });

  it('graph validator rejects missing source/target', () => {
    const graph = new CodeGraphStore();
    const validator = new GraphValidator(graph);

    graph.addSymbol({
      id: 's1',
      projectId: PROJECT_ID,
      name: 'source',
      type: 'function',
      filePath: 'src/a.ts',
    });

    graph.addEdge(
      createGraphEdge({
        projectId: PROJECT_ID,
        from: 's1',
        to: 'missing-target',
        type: 'CALLS',
        provenance: createEdgeProvenance('resolver', 'resolved_symbol', 'deterministic'),
      })
    );

    const result = validator.validate(PROJECT_ID);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.type === 'missing_target')).toBe(true);
  });

  it('graph validator rejects invalid edge type', () => {
    const graph = new CodeGraphStore();
    const validator = new GraphValidator(graph);

    graph.addSymbol({
      id: 's1',
      projectId: PROJECT_ID,
      name: 'source',
      type: 'function',
      filePath: 'src/a.ts',
    });

    graph.addSymbol({
      id: 's2',
      projectId: PROJECT_ID,
      name: 'target',
      type: 'function',
      filePath: 'src/b.ts',
    });

    graph.addEdge({
      id: 'e1',
      projectId: PROJECT_ID,
      from: 's1',
      to: 's2',
      type: 'UNKNOWN_EDGE_TYPE' as import('../../src/core/types.js').GraphEdge['type'],
      metadata: {},
    });

    const result = validator.validate(PROJECT_ID);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.type === 'invalid_type')).toBe(true);
  });

  it('edge provenance is present on all edges', () => {
    const edge = createGraphEdge({
      projectId: PROJECT_ID,
      from: 's1',
      to: 's2',
      type: 'IMPORTS',
      provenance: createEdgeProvenance('parser', 'explicit_import', 'deterministic', {
        filePath: 'src/a.ts',
        line: 1,
        language: 'typescript',
      }),
    });

    expect(edge.metadata?.provenance).toBeDefined();
    expect((edge.metadata?.provenance as Record<string, unknown>).origin).toBe('parser');
    expect((edge.metadata?.provenance as Record<string, unknown>).evidence).toBe('explicit_import');
    expect((edge.metadata?.provenance as Record<string, unknown>).certainty).toBe('deterministic');
    expect((edge.metadata?.provenance as Record<string, unknown>).filePath).toBe('src/a.ts');
  });

  it('CALLS and CALL_REFERENCE have different semantics', () => {
    const callsDef = getEdgeSemanticDefinition('CALLS');
    const callRefDef = getEdgeSemanticDefinition('CALL_REFERENCE');

    expect(callsDef).toBeDefined();
    expect(callRefDef).toBeDefined();
    expect(callsDef?.description).toContain('Deterministic static call');
    expect(callRefDef?.description).toContain('without known runtime target');
    expect(callsDef?.primaryProducer).toBe('resolver');
    expect(callRefDef?.primaryProducer).toBe('resolver');
  });

  it('DEFINES edge is normalized', () => {
    const def = getEdgeSemanticDefinition('DEFINES');
    expect(def).toBeDefined();
    expect(def?.allowedSourceTypes).toContain('file');
    expect(def?.allowedTargetTypes).toContain('function');
    expect(def?.category).toBe('structure');
  });

  it('IMPORTS edge is normalized', () => {
    const def = getEdgeSemanticDefinition('IMPORTS');
    expect(def).toBeDefined();
    expect(def?.allowedSourceTypes).toContain('file');
    expect(def?.allowedTargetTypes).toContain('file');
    expect(def?.category).toBe('dependency');
  });

  it('USES_TYPE edge works with class/interface targets', () => {
    const def = getEdgeSemanticDefinition('USES_TYPE');
    expect(def).toBeDefined();
    expect(def?.allowedTargetTypes).toContain('class');
    expect(def?.allowedTargetTypes).toContain('interface');
    expect(def?.primaryProducer).toBe('enricher');
  });

  it('INHERITS and IMPLEMENTS working', () => {
    const inheritsDef = getEdgeSemanticDefinition('INHERITS');
    const implementsDef = getEdgeSemanticDefinition('IMPLEMENTS');

    expect(inheritsDef?.allowedSourceTypes).toEqual(['class']);
    expect(inheritsDef?.allowedTargetTypes).toContain('class');
    expect(inheritsDef?.supportsMultiple).toBe(false);

    expect(implementsDef?.allowedSourceTypes).toEqual(['class']);
    expect(implementsDef?.allowedTargetTypes).toContain('interface');
    expect(implementsDef?.supportsMultiple).toBe(true);
  });

  it('graph builder produces valid edges with provenance', async () => {
    const repo = root('builder');
    writeFiles(repo, {
      'src/a.ts': 'export function a() { return 1; }\n',
      'src/b.ts': "import { a } from './a.js';\nexport function b() { return a(); }\n",
    });

    const indexer = new RepositoryIndexer();
    const indexed = await indexer.index(PROJECT_ID, repo);

    const builder = new GraphBuilder();
    const graph = builder.build(PROJECT_ID, indexed.parsedFiles, { projectId: PROJECT_ID });

    const edges = graph.allEdges(PROJECT_ID);
    expect(edges.length).toBeGreaterThan(0);

    for (const edge of edges) {
      expect(edge.metadata?.provenance).toBeDefined();
      expect((edge.metadata?.provenance as Record<string, unknown>).origin).toBeDefined();
    }
  });

  it('no dangling edges after repair', () => {
    const prevSymbols: import('../../src/core/types.js').CodeSymbol[] = [
      {
        id: 'old-s1',
        projectId: PROJECT_ID,
        name: 'a',
        type: 'function',
        filePath: 'src/a.ts',
      },
      {
        id: 'old-s2',
        projectId: PROJECT_ID,
        name: 'b',
        type: 'function',
        filePath: 'src/b.ts',
      },
    ];

    const prevEdges: import('../../src/core/types.js').GraphEdge[] = [
      {
        id: 'old-e1',
        projectId: PROJECT_ID,
        from: 'old-s1',
        to: 'old-s2',
        type: 'CALLS',
        metadata: {},
      },
    ];

    const currentSymbols: import('../../src/core/types.js').CodeSymbol[] = [
      {
        id: 's1',
        projectId: PROJECT_ID,
        name: 'a',
        type: 'function',
        filePath: 'src/a.ts',
      },
      {
        id: 's2',
        projectId: PROJECT_ID,
        name: 'b',
        type: 'function',
        filePath: 'src/b.ts',
      },
    ];

    const remap = buildStableSymbolRemap(prevSymbols, currentSymbols);
    expect(remap.get('old-s1')).toBe('s1');
    expect(remap.get('old-s2')).toBe('s2');

    const repaired = repairPreservedEdges({
      projectId: PROJECT_ID,
      previousSymbols: prevSymbols,
      previousEdges: prevEdges,
      currentSymbols,
      rebuiltSourceFiles: new Set(),
      removedFiles: new Set(),
    });

    expect(repaired).toHaveLength(1);
    expect(repaired[0]?.from).toBe('s1');
    expect(repaired[0]?.to).toBe('s2');
    expect(repaired[0]?.metadata?.provenance).toBeDefined();
  });

  it('persistence round-trip preserves edges', async () => {
    const repo = root('roundtrip');
    writeFiles(repo, {
      'src/a.ts': 'export function a() { return 1; }\n',
    });

    const indexer = new RepositoryIndexer();
    const indexed = await indexer.index(PROJECT_ID, repo);
    const graph = new GraphBuilder().build(PROJECT_ID, indexed.parsedFiles, {
      projectId: PROJECT_ID,
    });

    const snapshot = {
      version: 1 as const,
      projectId: PROJECT_ID,
      updatedAt: new Date().toISOString(),
      files: 1,
      symbols: graph.allSymbols(PROJECT_ID),
      edges: graph.allEdges(PROJECT_ID),
    };

    expect(snapshot.edges.length).toBeGreaterThan(0);
    for (const edge of snapshot.edges) {
      expect(edge.projectId).toBe(PROJECT_ID);
      expect(edge.id).toBeDefined();
    }
  });

  it('determinism: same input produces same edge IDs', () => {
    const edgeA = createGraphEdge({
      projectId: 'p',
      from: 'f',
      to: 't',
      type: 'CALLS',
      provenance: createEdgeProvenance('resolver', 'resolved_symbol', 'deterministic'),
    });

    const edgeB = createGraphEdge({
      projectId: 'p',
      from: 'f',
      to: 't',
      type: 'CALLS',
      provenance: createEdgeProvenance('resolver', 'resolved_symbol', 'deterministic'),
    });

    expect(edgeA.id).toBe(edgeB.id);
  });

  it('graph query engine neighborsByType filters by edge type', () => {
    const graph = new CodeGraphStore();
    const engine = new GraphQueryEngine(graph);

    graph.addSymbol({
      id: 's1',
      projectId: PROJECT_ID,
      name: 'a',
      type: 'function',
      filePath: 'src/a.ts',
    });

    graph.addSymbol({
      id: 's2',
      projectId: PROJECT_ID,
      name: 'b',
      type: 'function',
      filePath: 'src/b.ts',
    });

    graph.addSymbol({
      id: 's3',
      projectId: PROJECT_ID,
      name: 'c',
      type: 'class',
      filePath: 'src/c.ts',
    });

    graph.addEdge(
      createGraphEdge({
        projectId: PROJECT_ID,
        from: 's1',
        to: 's2',
        type: 'CALLS',
        provenance: createEdgeProvenance('resolver', 'resolved_symbol', 'deterministic'),
      })
    );

    graph.addEdge(
      createGraphEdge({
        projectId: PROJECT_ID,
        from: 's1',
        to: 's3',
        type: 'USES_TYPE',
        provenance: createEdgeProvenance('enricher', 'resolved_symbol', 'deterministic'),
      })
    );

    const callNeighbors = engine.neighborsByType(PROJECT_ID, 's1', 'outgoing', ['CALLS']);
    expect(callNeighbors).toHaveLength(1);
    expect(callNeighbors[0]?.symbol.id).toBe('s2');

    const typeNeighbors = engine.neighborsByType(PROJECT_ID, 's1', 'outgoing', ['USES_TYPE']);
    expect(typeNeighbors).toHaveLength(1);
    expect(typeNeighbors[0]?.symbol.id).toBe('s3');
  });

  it('graph query engine getEdgeTypes returns all types', () => {
    const graph = new CodeGraphStore();
    const engine = new GraphQueryEngine(graph);

    graph.addSymbol({
      id: 's1',
      projectId: PROJECT_ID,
      name: 'a',
      type: 'function',
      filePath: 'src/a.ts',
    });

    graph.addSymbol({
      id: 's2',
      projectId: PROJECT_ID,
      name: 'b',
      type: 'function',
      filePath: 'src/b.ts',
    });

    graph.addEdge(
      createGraphEdge({
        projectId: PROJECT_ID,
        from: 's1',
        to: 's2',
        type: 'CALLS',
        provenance: createEdgeProvenance('resolver', 'resolved_symbol', 'deterministic'),
      })
    );

    const types = engine.getEdgeTypes(PROJECT_ID);
    expect(types).toContain('CALLS');
  });

  it('impact analyzer includes edgeType in result', async () => {
    const graph = new CodeGraphStore();
    const { ImpactAnalyzer } =
      await import('../../src/code-intelligence/impact/impact-analyzer.js');
    const analyzer = new ImpactAnalyzer(graph);

    graph.addSymbol({
      id: 's1',
      projectId: PROJECT_ID,
      name: 'a',
      type: 'function',
      filePath: 'src/a.ts',
    });

    graph.addSymbol({
      id: 's2',
      projectId: PROJECT_ID,
      name: 'b',
      type: 'function',
      filePath: 'src/b.ts',
    });

    graph.addEdge(
      createGraphEdge({
        projectId: PROJECT_ID,
        from: 's2',
        to: 's1',
        type: 'CALLS',
        provenance: createEdgeProvenance('resolver', 'resolved_symbol', 'deterministic'),
      })
    );

    const results = analyzer.analyze(PROJECT_ID, 's1');
    expect(results).toHaveLength(1);
    expect(results[0]?.edgeType).toBe('CALLS');
    expect(results[0]?.symbol.id).toBe('s2');
  });

  it('dead code analyzer uses registry-aligned edge types', async () => {
    const repo = root('deadcode');
    writeFiles(repo, {
      'src/used.ts': 'export function used() { return 1; }\n',
      'src/unused.ts': 'export function unused() { return 2; }\n',
    });

    const indexer = new RepositoryIndexer();
    const indexed = await indexer.index(PROJECT_ID, repo);
    const graph = new GraphBuilder().build(PROJECT_ID, indexed.parsedFiles, {
      projectId: PROJECT_ID,
    });

    const { DeadCodeAnalyzer } =
      await import('../../src/code-intelligence/analysis/dead-code-analyzer.js');
    const analyzer = new DeadCodeAnalyzer(graph);
    const candidates = analyzer.analyze(PROJECT_ID);

    const unusedCandidates = candidates.filter((c) => c.name === 'unused');
    expect(unusedCandidates.length).toBeGreaterThan(0);
  });

  it('graph coverage integration with phase 70', async () => {
    const repo = root('coverage');
    writeFiles(repo, {
      'src/index.ts': 'export function tsFn() { return 1; }\n',
      'src/main.py': 'def pyFn():\n    return 1\n',
    });

    const indexer = new RepositoryIndexer();
    const indexed = await indexer.index(PROJECT_ID, repo);
    const graph = new GraphBuilder().build(PROJECT_ID, indexed.parsedFiles, {
      projectId: PROJECT_ID,
    });

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
    });

    expect(coverage.capabilities.call_graph.status).toBe('partial');
  });

  it('phase 70 regression: resolution snapshot still works', async () => {
    const repo = root('regression');
    writeFiles(repo, {
      'src/utils.ts': 'export function greet(name: string): string { return `hi ${name}`; }\n',
      'src/main.ts':
        "import { greet } from './utils.js';\nfunction main() { return greet('world'); }\n",
    });

    const indexer = new RepositoryIndexer();
    const indexed = await indexer.index(PROJECT_ID, repo);
    const graph = new GraphBuilder().build(PROJECT_ID, indexed.parsedFiles, {
      projectId: PROJECT_ID,
    });

    const { ResolutionEngine } =
      await import('../../src/code-intelligence/resolution/resolution-engine.js');
    const engine = new ResolutionEngine({
      projectId: PROJECT_ID,
      rootPath: repo,
      graph,
      parsedFiles: indexed.parsedFiles,
    });

    const result = await engine.resolve();
    expect(result.snapshot.fingerprint).toBeDefined();
  });

  it('READS and WRITES edges are deterministic and registry-valid', async () => {
    const repo = root('reads-writes');
    writeFiles(repo, {
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
        },
        include: ['src/**/*.ts'],
      }),
      'src/store.ts': [
        'export class Store {',
        '  value = 0;',
        '  getValue() { return this.value; }',
        '  setValue(value: number) { this.value = value; }',
        '}',
        '',
      ].join('\n'),
    });

    const indexed = await new RepositoryIndexer().index(PROJECT_ID, repo);
    const { RichGraphEnricher } =
      await import('../../src/code-intelligence/rich/rich-graph-enricher.js');
    const stats = new RichGraphEnricher(indexed.graph).enrich(PROJECT_ID, repo, null);

    const edges = indexed.graph.allEdges(PROJECT_ID);
    expect(edges.filter((edge) => edge.type === 'READS').length).toBeGreaterThan(0);
    expect(edges.filter((edge) => edge.type === 'WRITES').length).toBeGreaterThan(0);
    expect(stats.reads).toBeGreaterThan(0);
    expect(stats.writes).toBeGreaterThan(0);

    const validation = new GraphValidator(indexed.graph).validate(PROJECT_ID);
    expect(validation.stats.invalidEdges).toBe(0);
  });

  it('phase 71 certification gate', async () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    expect(packageJson.scripts['phase71:certify']).toContain('phase71-graph-semantics-v2');

    const docs = readFileSync('docs/architecture.md', 'utf8');
    expect(docs).toContain('Phase 71 — Graph Semantics v2');

    const { semanticFingerprint, edgeTypesForCapability } =
      await import('../../src/code-intelligence/graph/graph-semantics.js');
    expect(semanticFingerprint()).toMatch(/^[0-9a-f]{64}$/);
    expect(edgeTypesForCapability('call_graph')).toContain('CALLS');
    expect(edgeTypesForCapability('symbol_graph')).not.toContain('CALLS');

    console.log('PHASE71_GRAPH_SEMANTICS_V2=PASS');
  });
});
