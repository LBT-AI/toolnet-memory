import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { dirname, join } from 'node:path';

import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import { RepositoryIndexer } from '../../src/code-intelligence/indexer/repository-indexer.js';

import type { RepositoryIndexResult } from '../../src/code-intelligence/indexer/repository-indexer.js';

import {
  ResolutionEngine,
  isResolutionStale,
  resolutionGeneration,
  summarizeResolution,
} from '../../src/code-intelligence/resolution/resolution-engine.js';

import type { ResolutionSnapshot } from '../../src/code-intelligence/resolution/types.js';

import { GraphCoverageBuilder } from '../../src/code-intelligence/graph-coverage/index.js';

import { RichGraphEnricher } from '../../src/code-intelligence/rich/rich-graph-enricher.js';

import { PersistentTypeResolutionStore } from '../../src/storage/type-resolution-store.js';

import { LocalStorageProvider } from '../../src/storage/local/client.js';

const PROJECT_ID = 'phase70-project';

const roots: string[] = [];

function root(label: string): string {
  const value = mkdtempSync(join(tmpdir(), `toolnet-phase70-${label}-`));
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
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, content);
  }
}

async function indexAndResolve(
  repo: string,
  projectId = PROJECT_ID
): Promise<{ indexed: RepositoryIndexResult; snapshot: ResolutionSnapshot }> {
  const indexed = await new RepositoryIndexer().index(projectId, repo);
  const result = await new ResolutionEngine({
    projectId,
    rootPath: repo,
    graph: indexed.graph,
    parsedFiles: indexed.parsedFiles,
  }).resolve();
  return { indexed, snapshot: result.snapshot };
}

function coverageFor(
  indexed: RepositoryIndexResult,
  snapshot?: ResolutionSnapshot
): ReturnType<GraphCoverageBuilder['build']> {
  return new GraphCoverageBuilder().build({
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
    ...(snapshot ? { resolution: summarizeResolution(snapshot) } : {}),
  });
}

const CROSS_LANGUAGE_FIXTURE: Record<string, string> = {
  'orders.py': 'def create_order():\n    return 1\n',
  'main.py': 'from orders import create_order\n\n\ndef run():\n    return create_order()\n',
  'svc/service.go': 'package svc\n\nfunc Create() int { return 1 }\n',
  'cmd/main.go': 'package main\n\nimport "shop/svc"\n\nfunc main() {\n\tsvc.Create()\n}\n',
  'go.mod': 'module shop\n\ngo 1.22\n',
  'src/orders.rs': 'pub fn create_order() -> i32 { 1 }\n',
  'src/main.rs': 'mod orders;\n\nfn run() {\n    orders::create_order();\n}\n',
  'orders.h': 'int create_order(void);\n',
  'main.c': '#include "orders.h"\n\nint main(void) {\n    return create_order();\n}\n',
  'src/math.hpp': 'int add(int a, int b);\n',
  'src/math.cpp': '#include "math.hpp"\n\nint use_add() {\n    return add(1, 2);\n}\n',
};

describe('Phase 70 — Deterministic Symbol Resolution', () => {
  it('resolves cross-file calls deterministically for every structural language', async () => {
    const repo = root('cross-language');
    writeFiles(repo, CROSS_LANGUAGE_FIXTURE);

    const { snapshot } = await indexAndResolve(repo);

    expect(snapshot.stats.total).toBeGreaterThan(0);

    for (const language of ['python', 'go', 'rust', 'c', 'cpp']) {
      const stats = snapshot.byLanguage[language];
      expect(stats, `missing language stats for ${language}`).toBeDefined();
      expect(stats.resolved).toBeGreaterThan(0);
      expect(stats.unresolved).toBe(0);
      expect(stats.ambiguous).toBe(0);
    }
  });

  it('resolves aliases, namespace imports and module-qualified calls', async () => {
    const repo = root('aliases');
    writeFiles(repo, {
      'src/lib.ts':
        'export function createOrder() { return 1; }\nexport function save() { return 2; }\n',
      'src/alias.ts':
        "import { createOrder as create } from './lib.js';\nimport * as lib from './lib.js';\n\nexport function run() {\n  create();\n  return lib.save();\n}\n",
      'orders.py': 'def create_order():\n    return 1\n',
      'py_alias.py':
        'from orders import create_order as create\nimport orders\n\n\ndef run():\n    create()\n    return orders.create_order()\n',
    });

    const { snapshot, indexed } = await indexAndResolve(repo);

    const resolvedExpressions = snapshot.results
      .filter((result) => result.status === 'resolved' && result.kind === 'call')
      .map((result) => result.expression);

    expect(resolvedExpressions).toEqual(expect.arrayContaining(['create', 'save', 'create_order']));
    expect(snapshot.stats.unresolved).toBe(0);

    /* Namespace alias must point at the importing file's module, never a random name match. */
    const saveResult = snapshot.results.find(
      (result) => result.status === 'resolved' && result.expression === 'save'
    );
    const saveTarget = saveResult?.targetSymbolId
      ? indexed.graph.getSymbol(saveResult.targetSymbolId)
      : undefined;
    expect(saveTarget?.filePath).toBe('src/lib.ts');
  });

  it('creates zero incorrect CALLS edges across 50 identically named symbols', async () => {
    const repo = root('false-positive');
    const files: Record<string, string> = {};

    for (let index = 0; index < 20; index += 1) {
      files[`ts/mod${index}.ts`] = `export function save() { return ${index}; }\n`;
    }
    files['ts/caller.ts'] =
      "import { save } from './mod7.js';\n\nexport function run() {\n  return save();\n}\n";

    for (let index = 0; index < 10; index += 1) {
      files[`py/m${index}.py`] = `def save():\n    return ${index}\n`;
    }
    files['py/caller.py'] = 'def run():\n    return save()\n';

    for (let index = 0; index < 10; index += 1) {
      files[`go/m${index}/m.go`] = `package m${index}\n\nfunc save() int { return ${index} }\n`;
    }
    files['go/caller/caller.go'] = 'package caller\n\nfunc Run() int {\n\treturn save()\n}\n';

    for (let index = 0; index < 5; index += 1) {
      files[`rs/m${index}.rs`] = `pub fn save() -> i32 { ${index} }\n`;
    }
    files['rs/caller.rs'] = 'fn run() {\n    save();\n}\n';

    for (let index = 0; index < 5; index += 1) {
      files[`c/m${index}.c`] = `int save(void) { return ${index}; }\n`;
    }
    files['c/caller.c'] = 'int run(void) {\n    return save();\n}\n';

    writeFiles(repo, files);

    const { indexed, snapshot } = await indexAndResolve(repo);

    const totalSaveSymbols = indexed.graph
      .allSymbols(PROJECT_ID)
      .filter((symbol) => symbol.name === 'save' && symbol.type === 'function').length;
    expect(totalSaveSymbols).toBe(50);

    /*
     * Only the explicitly imported TypeScript call may resolve. Every
     * unqualified tree-sitter call must stay unresolved instead of binding to
     * one of the 49 other identically named symbols.
     */
    const resolvedSaveCalls = snapshot.results.filter(
      (result) =>
        result.status === 'resolved' && result.kind === 'call' && result.expression === 'save'
    );
    expect(resolvedSaveCalls).toHaveLength(1);

    const target = indexed.graph.getSymbol(resolvedSaveCalls[0].targetSymbolId!);
    expect(target?.filePath).toBe('ts/mod7.ts');

    /* Enrichment must not introduce foreign CALLS edges either. */
    new RichGraphEnricher(indexed.graph).enrich(PROJECT_ID, repo, snapshot);

    for (const edge of indexed.graph.allEdges(PROJECT_ID)) {
      if (edge.type !== 'CALLS') {
        continue;
      }
      const edgeTarget = indexed.graph.getSymbol(edge.to);
      if (edgeTarget?.name === 'save') {
        expect(edgeTarget.filePath).toBe('ts/mod7.ts');
      }
    }
  });

  it('keeps ambiguous targets unresolved instead of picking the first candidate', async () => {
    const repo = root('ambiguous');
    writeFiles(repo, {
      'src/a.ts': 'export function log(msg: string) { return msg; }\n',
      'src/b.ts': 'export function log(msg: string) { return msg; }\n',
      'src/c.ts':
        "import * as a from './a.js';\nimport * as b from './b.js';\n\nexport function run() {\n  a.log('x');\n  return b.log('y');\n}\n",
    });

    const { snapshot } = await indexAndResolve(repo);

    /* `a.log` and `b.log` are qualified, so each resolves to exactly one module. */
    const logResults = snapshot.results.filter((result) => result.expression === 'log');
    expect(logResults.every((result) => result.status !== 'ambiguous')).toBe(true);

    const bareAmbiguous = snapshot.results.filter((result) => result.status === 'ambiguous');
    expect(bareAmbiguous).toHaveLength(0);
  });

  it('resolves inherited members through a deterministic INHERITS edge', async () => {
    const repo = root('inheritance');
    writeFiles(repo, {
      'cpp/shapes.cpp': [
        'namespace api {',
        '',
        'class Parent {',
        'public:',
        '    void save();',
        '};',
        '',
        'class Child : public Parent {',
        'public:',
        '    void load();',
        '};',
        '',
        'void run() {',
        '    Child::save();',
        '    Child::load();',
        '}',
        '',
        '}',
      ].join('\n'),
    });

    const { snapshot, indexed } = await indexAndResolve(repo);

    const inherited = snapshot.results.find(
      (result) => result.expression === 'save' && result.status === 'resolved'
    );
    expect(inherited).toBeDefined();
    expect(inherited?.evidence.some((item) => item.kind === 'inheritance_member')).toBe(true);

    const target = indexed.graph.getSymbol(inherited!.targetSymbolId!);
    expect(target?.name).toBe('save');
    expect(target?.qualifiedName).toBe('api::Parent::save');
  });

  it('does not falsely resolve unknown receiver / interface dispatch', async () => {
    const repo = root('interface');
    writeFiles(repo, {
      'src/service.py': [
        'class Repository:',
        '    def save(self):',
        '        return 1',
        '',
        'def run(repo):',
        '    return repo.save()',
      ].join('\n'),
    });

    const { snapshot, indexed } = await indexAndResolve(repo);

    const call = snapshot.results.find((result) => result.expression === 'save');
    expect(call?.status).toBe('unresolved');
    expect(call?.reason).toBe('UNKNOWN_RECEIVER_TYPE');

    /* No CALLS edge may be fabricated to the only same-named method. */
    const edges = indexed.graph.allEdges(PROJECT_ID).filter((edge) => edge.type === 'CALLS');
    expect(edges).toHaveLength(0);
  });

  it('treats external dependencies as external, not as a coverage gap', async () => {
    const repo = root('external');
    writeFiles(repo, {
      'src/app.ts':
        "import { readFileSync } from 'node:fs';\n\nexport function load() {\n  return readFileSync('x');\n}\n",
    });

    const { snapshot, indexed } = await indexAndResolve(repo);

    const external = snapshot.results.filter((result) => result.reason === 'EXTERNAL_DEPENDENCY');
    expect(external.length).toBeGreaterThan(0);

    const summary = summarizeResolution(snapshot);
    expect(summary.unresolvedImports).toBe(0);

    const coverage = coverageFor(indexed, snapshot);
    expect(coverage.capabilities.dependency_graph.reasons).not.toContain('UNRESOLVED_IMPORT');
  });

  it('marks call_graph complete when every reference is deterministically resolved', async () => {
    const repo = root('coverage-complete');
    writeFiles(repo, {
      'orders.py': 'def create_order():\n    return 1\n',
      'main.py': 'from orders import create_order\n\n\ndef run():\n    return create_order()\n',
    });

    const { snapshot, indexed } = await indexAndResolve(repo);
    const summary = summarizeResolution(snapshot);

    expect(summary.unresolvedCallReferences).toBe(0);
    expect(summary.ambiguousCallTargets).toBe(0);
    expect(summary.unknownReceiverTypes).toBe(0);
    expect(summary.unresolvedImports).toBe(0);

    const coverage = coverageFor(indexed, snapshot);
    expect(coverage.capabilities.call_graph.status).toBe('complete');
    expect(coverage.capabilities.call_graph.negativeClaimSafe).toBe(true);
    expect(coverage.capabilities.call_graph.reasons).not.toContain('CROSS_FILE_RESOLUTION_PENDING');
    expect(coverage.capabilities.lexical_search.status).toBe('complete');
  });

  it('marks call_graph partial with evidence-based reasons when references stay unresolved', async () => {
    const repo = root('coverage-partial');
    writeFiles(repo, {
      'src/main.py': 'def run():\n    return missing_symbol()\n',
    });

    const { snapshot, indexed } = await indexAndResolve(repo);
    const summary = summarizeResolution(snapshot);
    expect(summary.unresolvedCallReferences).toBeGreaterThan(0);

    const coverage = coverageFor(indexed, snapshot);
    expect(coverage.capabilities.call_graph.status).toBe('partial');
    expect(coverage.capabilities.call_graph.negativeClaimSafe).toBe(false);
    expect(coverage.capabilities.call_graph.reasons).toContain('UNRESOLVED_CALL_REFERENCE');

    /* Unresolved calls never degrade lexical search. */
    expect(coverage.capabilities.lexical_search.status).toBe('complete');
    expect(coverage.capabilities.lexical_search.reasons).not.toContain('UNRESOLVED_CALL_REFERENCE');
  });

  it('produces deterministic resolution across repeated runs', async () => {
    const repo = root('determinism');
    writeFiles(repo, CROSS_LANGUAGE_FIXTURE);

    const { indexed, snapshot } = await indexAndResolve(repo);

    const runs = await Promise.all(
      [0, 1, 2].map(() =>
        new ResolutionEngine({
          projectId: PROJECT_ID,
          rootPath: repo,
          graph: indexed.graph,
          parsedFiles: indexed.parsedFiles,
        }).resolve()
      )
    );

    for (const run of runs) {
      expect(run.snapshot.generation).toBe(snapshot.generation);
      expect(run.snapshot.stats).toEqual(snapshot.stats);
      expect(run.snapshot.byLanguage).toEqual(snapshot.byLanguage);
      expect(run.snapshot.fingerprint).toBe(snapshot.fingerprint);
    }

    const signature = (value: ResolutionSnapshot): string =>
      JSON.stringify(
        value.results
          .map((result) => [
            result.expression,
            result.status,
            result.targetSymbolId ?? '',
            result.reason ?? '',
          ])
          .sort()
      );

    expect(signature(runs[0].snapshot)).toBe(signature(snapshot));
  });

  it('detects stale resolution when the graph generation changes', async () => {
    const repo = root('stale');
    writeFiles(repo, {
      'src/main.ts': 'export function one() { return 1; }\n',
    });

    const { indexed, snapshot } = await indexAndResolve(repo);
    const symbolIds = indexed.graph.allSymbols(PROJECT_ID).map((symbol) => symbol.id);

    expect(snapshot.generation).toBe(resolutionGeneration(symbolIds));
    expect(isResolutionStale(snapshot, symbolIds)).toBe(false);

    /* Adding a symbol changes the graph generation -> stale resolution. */
    writeFiles(repo, { 'src/more.ts': 'export function two() { return 2; }\n' });
    const next = await new RepositoryIndexer().index(PROJECT_ID, repo);
    const nextIds = next.graph.allSymbols(PROJECT_ID).map((symbol) => symbol.id);

    expect(isResolutionStale(snapshot, nextIds)).toBe(true);
  });

  it('persists resolution and keeps projects isolated', async () => {
    const repo = root('persist');
    writeFiles(repo, CROSS_LANGUAGE_FIXTURE);

    const { snapshot } = await indexAndResolve(repo);

    const storage = new LocalStorageProvider(join(repo, '.storage'));
    const store = new PersistentTypeResolutionStore(storage);

    await store.save(snapshot);
    const loaded = await store.load(PROJECT_ID);
    expect(loaded).toBeDefined();

    expect(await store.load('other-project')).toBeNull();
  });

  it('keeps every resolver result machine-readable (no confidence scores)', async () => {
    const repo = root('no-confidence');
    writeFiles(repo, CROSS_LANGUAGE_FIXTURE);

    const { snapshot } = await indexAndResolve(repo);

    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toMatch(/confidence/iu);
    expect(serialized).not.toMatch(/"score"/u);

    for (const result of snapshot.results) {
      expect(['resolved', 'ambiguous', 'unresolved', 'unsupported']).toContain(result.status);
    }
  });

  it('emits the machine-readable certification marker', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    expect(packageJson.scripts['phase70:certify']).toContain(
      'phase70-deterministic-symbol-resolution'
    );

    const docs = readFileSync('docs/architecture.md', 'utf8');
    expect(docs).toContain('Phase 70 — Deterministic Symbol Resolution');

    console.log('PHASE70_DETERMINISTIC_SYMBOL_RESOLUTION=PASS');
  });
});
