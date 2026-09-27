import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { dirname, join } from 'node:path';

import { tmpdir } from 'node:os';

import { describe, expect, it } from 'vitest';

import { RepositoryIndexer } from '../../src/code-intelligence/indexer/repository-indexer.js';

import {
  GraphCoverageBuilder,
  GraphCoverageEvaluator,
  GraphFreshnessChecker,
} from '../../src/code-intelligence/graph-coverage/index.js';

import type { GraphCoverageSnapshot } from '../../src/code-intelligence/graph-coverage/types.js';

import { searchableParserExtensions } from '../../src/code-intelligence/parsers/capabilities.js';

import { buildManifest } from '../../src/code-intelligence/incremental/manifest-builder.js';

import { PersistentGraphCoverageStore } from '../../src/storage/graph-coverage-store.js';

import { PersistentCodeManifestStore } from '../../src/storage/code-manifest-store.js';

import { LocalStorageProvider } from '../../src/storage/local/client.js';

import { findCallers } from '../../src/mcp/tools/find-callers.js';

import { findSymbol } from '../../src/mcp/tools/find-symbol.js';

import { deadCode } from '../../src/mcp/tools/dead-code.js';

import { checkIndexCoverage } from '../../src/mcp/tools/check-index-coverage.js';

const PROJECT_ID = 'phase68-project';

const roots: string[] = [];

function root(label: string): string {
  const value = mkdtempSync(join(tmpdir(), `toolnet-phase68-${label}-`));
  roots.push(value);
  return value;
}

function writeFiles(repo: string, files: Record<string, string>): void {
  for (const [relative, content] of Object.entries(files)) {
    const absolute = join(repo, relative);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, content);
  }
}

interface BuiltProject {
  indexed: Awaited<ReturnType<RepositoryIndexer['index']>>;
  coverage: GraphCoverageSnapshot;
}

async function buildProject(repo: string, projectId = PROJECT_ID): Promise<BuiltProject> {
  const indexed = await new RepositoryIndexer().index(projectId, repo);

  const coverage = new GraphCoverageBuilder().build({
    projectId,
    scan: indexed.scan,
    acceptedFiles: indexed.acceptedFiles,
    languages: indexed.languages,
    indexedFiles: indexed.files,
    structuralFiles: indexed.structuralFiles,
    lexicalOnlyFiles: indexed.lexicalOnlyFiles,
    parseFailures: indexed.parseFailures,
    crossFileResolutionLanguages: indexed.crossFileResolutionLanguages,
  });

  return { indexed, coverage };
}

function storageFor(dir: string): LocalStorageProvider {
  return new LocalStorageProvider(dir);
}

async function persistBaseline(
  storage: LocalStorageProvider,
  repo: string,
  project: BuiltProject,
  projectId = PROJECT_ID
): Promise<void> {
  await new PersistentGraphCoverageStore(storage).save(project.coverage);

  const manifest = await buildManifest(projectId, repo, {
    scan: { extensions: searchableParserExtensions() },
  });

  await new PersistentCodeManifestStore(storage).save(manifest);
}

function evaluatorFor(
  project: BuiltProject,
  repo: string,
  storage?: LocalStorageProvider
): GraphCoverageEvaluator {
  return new GraphCoverageEvaluator({
    projectId: PROJECT_ID,
    rootPath: repo,
    storage,
    snapshot: project.coverage,
    graphAvailable: true,
  });
}

function toolContext(project: BuiltProject, repo: string, coverage?: GraphCoverageEvaluator) {
  return {
    project: {
      id: PROJECT_ID,
      name: 'demo',
      rootPath: repo,
    },
    graph: project.indexed.graph,
    coverage,
  } as any;
}

describe('Phase 68 Graph Coverage & Trust Contract', () => {
  it('certifies all graph coverage and trust cases', async () => {
    /*
     * 1. Pure TS/JS structural project, no parse failure, source
     *    unchanged -> call_graph complete, negative claim safe.
     */
    {
      const repo = root('ts');
      writeFiles(repo, {
        'src/a.ts': 'export function alpha() { return 1; }',
        'src/b.ts': 'import { alpha } from "./a"; export function beta() { return alpha(); }',
      });

      const project = await buildProject(repo);

      expect(project.indexed.parseFailures).toBe(0);
      expect(project.coverage.files.structural).toBe(2);
      expect(project.coverage.files.lexicalOnly).toBe(0);

      const callGraph = project.coverage.capabilities.call_graph;
      expect(callGraph.status).toBe('complete');
      expect(callGraph.negativeClaimSafe).toBe(true);
      expect(callGraph.reasons).toEqual([]);

      const storage = storageFor(join(repo, '.storage'));
      await persistBaseline(storage, repo, project);

      const evaluator = evaluatorFor(project, repo, storage);
      const freshness = await evaluator.checkFreshness();
      expect(freshness.checked).toBe(true);
      expect(freshness.stale).toBe(false);

      const evaluated = await evaluator.evaluateWithFreshness('call_graph');
      expect(evaluated.status).toBe('complete');
      expect(evaluated.negativeClaimSafe).toBe(true);
    }

    /*
     * 2. Python structural (tree-sitter) -> lexical search stays complete,
     *    symbol graph partial because cross-file resolution is pending
     *    (Phase 70). Call graph partial for same reason.
     */
    {
      const repo = root('py');
      writeFiles(repo, {
        'src/a.ts': 'export function tsFn() { return 1; }',
        'src/main.py': 'def authenticate(user):\n    return user is not None\n',
      });

      const project = await buildProject(repo);

      const lexical = project.coverage.capabilities.lexical_search;
      expect(lexical.status).toBe('complete');
      expect(lexical.negativeClaimSafe).toBe(true);

      for (const capability of ['call_graph', 'symbol_graph', 'dependency_graph'] as const) {
        const coverage = project.coverage.capabilities[capability];
        expect(coverage.status).toBe('partial');
        expect(coverage.negativeClaimSafe).toBe(false);
        expect(coverage.reasons).toContain('CROSS_FILE_RESOLUTION_PENDING');
      }

      const language = project.coverage.languages.find((item) => item.language === 'python');
      expect(language?.structural).toBe(true);
      expect(language?.lexicalSearch).toBe(true);
      expect(language?.crossFileResolution).toBe('pending');
    }

    /*
     * 3. A searchable in-scope source the parser rejects -> parse
     *    failure -> structural partial + PARSE_FAILURE.
     */
    {
      const repo = root('parsefail');
      writeFiles(repo, {
        'src/a.ts': 'export function alpha() { return 1; }',
        'src/legacy.broken': 'this is not parseable by any parser',
      });

      const indexed = await new RepositoryIndexer().index(PROJECT_ID, repo, {
        scan: { extensions: ['.ts', '.broken'] },
      });

      expect(indexed.parseFailures).toBe(1);

      const coverage = new GraphCoverageBuilder().build({
        projectId: PROJECT_ID,
        scan: indexed.scan,
        acceptedFiles: indexed.acceptedFiles,
        languages: indexed.languages,
        indexedFiles: indexed.files,
        structuralFiles: indexed.structuralFiles,
        lexicalOnlyFiles: indexed.lexicalOnlyFiles,
        parseFailures: indexed.parseFailures,
        crossFileResolutionLanguages: indexed.crossFileResolutionLanguages ?? [],
      });

      expect(coverage.files.parseFailures).toBe(1);

      for (const capability of ['lexical_search', 'call_graph', 'dependency_graph'] as const) {
        const item = coverage.capabilities[capability];
        expect(item.status).toBe('partial');
        expect(item.negativeClaimSafe).toBe(false);
        expect(item.reasons).toContain('PARSE_FAILURE');
      }
    }

    /*
     * 4. Source modified after index -> stale, negative claim unsafe.
     */
    {
      const repo = root('modified');
      writeFiles(repo, {
        'src/orders.ts': 'export function createOrder() { return "o1"; }',
        'src/other.ts': 'export function other() { return 2; }',
      });

      const project = await buildProject(repo);
      const storage = storageFor(join(repo, '.storage'));
      await persistBaseline(storage, repo, project);

      writeFileSync(
        join(repo, 'src/orders.ts'),
        'export function createOrder() { return "o1-changed"; }'
      );

      const evaluator = evaluatorFor(project, repo, storage);
      const freshness = await evaluator.checkFreshness();
      expect(freshness.stale).toBe(true);
      expect(freshness.modified).toContain('src/orders.ts');

      const evaluated = await evaluator.evaluateWithFreshness('call_graph');
      expect(evaluated.status).toBe('stale');
      expect(evaluated.negativeClaimSafe).toBe(false);
      expect(evaluated.reasons).toContain('SOURCE_MODIFIED_AFTER_INDEX');
    }

    /*
     * 5. Source added after index -> stale.
     */
    {
      const repo = root('added');
      writeFiles(repo, {
        'src/a.ts': 'export function a() { return 1; }',
      });

      const project = await buildProject(repo);
      const storage = storageFor(join(repo, '.storage'));
      await persistBaseline(storage, repo, project);

      writeFiles(repo, { 'src/new.ts': 'export function brandNew() { return 3; }' });

      const evaluator = evaluatorFor(project, repo, storage);
      const freshness = await evaluator.checkFreshness();
      expect(freshness.stale).toBe(true);
      expect(freshness.added).toContain('src/new.ts');

      const evaluated = await evaluator.evaluateWithFreshness('dependency_graph');
      expect(evaluated.status).toBe('stale');
      expect(evaluated.reasons).toContain('SOURCE_ADDED_AFTER_INDEX');
    }

    /*
     * 6. Source deleted after index -> stale.
     */
    {
      const repo = root('deleted');
      writeFiles(repo, {
        'src/a.ts': 'export function a() { return 1; }',
        'src/gone.ts': 'export function gone() { return 2; }',
      });

      const project = await buildProject(repo);
      const storage = storageFor(join(repo, '.storage'));
      await persistBaseline(storage, repo, project);

      rmSync(join(repo, 'src/gone.ts'));

      const evaluator = evaluatorFor(project, repo, storage);
      const freshness = await evaluator.checkFreshness();
      expect(freshness.stale).toBe(true);
      expect(freshness.deleted).toContain('src/gone.ts');

      const evaluated = await evaluator.evaluateWithFreshness('call_graph');
      expect(evaluated.status).toBe('stale');
      expect(evaluated.reasons).toContain('SOURCE_DELETED_AFTER_INDEX');
    }

    /*
     * 7. Oversized searchable source in scope -> partial.
     */
    {
      const repo = root('oversized');
      writeFiles(repo, {
        'src/huge.ts': 'export function huge() { return 1; }',
      });

      const indexed = await new RepositoryIndexer().index(PROJECT_ID, repo, {
        scan: { maxFileBytes: 8 },
      });

      expect(indexed.scan.skippedOversized).toBe(1);

      const coverage = new GraphCoverageBuilder().build({
        projectId: PROJECT_ID,
        scan: indexed.scan,
        acceptedFiles: indexed.acceptedFiles,
        languages: indexed.languages,
        indexedFiles: indexed.files,
        structuralFiles: indexed.structuralFiles,
        lexicalOnlyFiles: indexed.lexicalOnlyFiles,
        parseFailures: indexed.parseFailures,
        crossFileResolutionLanguages: indexed.crossFileResolutionLanguages ?? [],
      });

      expect(coverage.files.accepted).toBe(0);

      for (const capability of ['lexical_search', 'call_graph'] as const) {
        const item = coverage.capabilities[capability];
        expect(item.status).toBe('partial');
        expect(item.reasons).toContain('SKIPPED_OVERSIZED_SOURCE');
      }
    }

    /*
     * 8. Unreadable searchable source in scope -> partial.
     *
     * Filesystem-level unreadability cannot be simulated stably when the
     * test process runs as root, so the builder is certified
     * deterministically from the scan stats it already receives.
     */
    {
      const indexed = await new RepositoryIndexer().index(PROJECT_ID, root('empty'), {
        scan: { extensions: ['.ts'] },
      });

      const coverage = new GraphCoverageBuilder().build({
        projectId: PROJECT_ID,
        scan: {
          ...indexed.scan,
          skippedUnreadable: 1,
        },
        acceptedFiles: ['src/unreadable.ts'],
        languages: indexed.languages,
        indexedFiles: 0,
        structuralFiles: 0,
        lexicalOnlyFiles: 0,
        parseFailures: 0,
        crossFileResolutionLanguages: [],
      });

      for (const capability of ['lexical_search', 'call_graph'] as const) {
        const item = coverage.capabilities[capability];
        expect(item.status).toBe('partial');
        expect(item.reasons).toContain('SKIPPED_UNREADABLE_SOURCE');
      }
    }

    /*
     * 9. Generated files / ignored directories outside declared scope do
     *    NOT make coverage partial.
     */
    {
      const repo = root('scope');
      writeFiles(repo, {
        'src/a.ts': 'export function a() { return 1; }',
        'src/bundle.min.js': 'var x=1;',
        'dist/bundle.js': 'var y=1;',
        'node_modules/pkg/index.ts': 'export function pkg() { return 1; }',
        '.toolnet/state.ts': 'export function toolnetState() { return 1; }',
        'build/out.js': 'console.log(1);',
        '.env': 'SECRET=do-not-index',
      });

      const project = await buildProject(repo);

      expect(project.coverage.files.accepted).toBe(1);
      expect(project.coverage.scan.skippedIgnoredDirectories).toBeGreaterThan(0);
      expect(project.coverage.scan.skippedGenerated).toBeGreaterThan(0);
      expect(project.coverage.scope.sensitiveFilesExcluded).toBe(true);

      expect(project.coverage.capabilities.call_graph.status).toBe('complete');
      expect(project.coverage.capabilities.call_graph.negativeClaimSafe).toBe(true);
      expect(project.coverage.capabilities.lexical_search.status).toBe('complete');
    }

    /*
     * 10. Missing coverage snapshot -> unavailable, no crash.
     */
    {
      const repo = root('missing');
      writeFiles(repo, { 'src/a.ts': 'export function a() { return 1; }' });
      const project = await buildProject(repo);

      const missing = new GraphCoverageEvaluator({
        projectId: PROJECT_ID,
        rootPath: repo,
        snapshot: null,
        graphAvailable: false,
      });

      const evaluation = missing.evaluate('call_graph');
      expect(evaluation.status).toBe('unavailable');
      expect(evaluation.negativeClaimSafe).toBe(false);
      expect(evaluation.reasons).toContain('INDEX_MISSING');

      const legacy = new GraphCoverageEvaluator({
        projectId: PROJECT_ID,
        rootPath: repo,
        snapshot: null,
        graphAvailable: true,
      });

      expect(legacy.evaluate('call_graph').reasons).toContain('COVERAGE_MISSING');

      const ctx = toolContext(project, repo, missing);
      const result = await checkIndexCoverage(ctx, { capability: 'call_graph' });
      expect(result.status).toBe('unavailable');
      expect(result.negativeClaimSafe).toBe(false);
    }

    /*
     * 11. find_callers returns [] with complete coverage -> negative
     *     claim safe.
     */
    {
      const repo = root('fc-complete');
      writeFiles(repo, {
        'src/app.ts': [
          'export function used() { return 1; }',
          'export function orphan() { return 2; }',
          'export function user() { return used(); }',
          '',
        ].join('\n'),
      });

      const project = await buildProject(repo);
      const storage = storageFor(join(repo, '.storage'));
      await persistBaseline(storage, repo, project);

      const evaluator = evaluatorFor(project, repo, storage);
      const ctx = toolContext(project, repo, evaluator);

      const result = await findCallers(ctx, { symbolId: 'orphan' });

      expect(result.found).toBe(true);
      expect(result.count).toBe(0);
      expect(result.callers).toEqual([]);
      expect(result.coverage?.capability).toBe('call_graph');
      expect(result.coverage?.status).toBe('complete');
      expect(result.coverage?.negativeClaimSafe).toBe(true);

      const positive = await findCallers(ctx, { symbolId: 'used' });
      expect(positive.count).toBe(1);
      expect(positive.coverage?.status).toBe('complete');
    }

    /*
     * 12. find_callers returns [] with partial coverage -> negative
     *     claim unsafe.
     */
    {
      const repo = root('fc-partial');
      writeFiles(repo, {
        'src/app.ts': 'export function orphan() { return 2; }',
        'src/main.py': 'def authenticate(user):\n    return user is not None\n',
      });

      const project = await buildProject(repo);
      const storage = storageFor(join(repo, '.storage'));
      await persistBaseline(storage, repo, project);

      const evaluator = evaluatorFor(project, repo, storage);
      const ctx = toolContext(project, repo, evaluator);

      const result = await findCallers(ctx, { symbolId: 'orphan' });

      expect(result.found).toBe(true);
      expect(result.count).toBe(0);
      expect(result.coverage?.status).toBe('partial');
      expect(result.coverage?.negativeClaimSafe).toBe(false);
      expect(result.coverage?.reasons).toContain('CROSS_FILE_RESOLUTION_PENDING');
    }

    /*
     * 13. Symbol not found + partial coverage must not be treated as
     *     repository-wide absence.
     */
    {
      const repo = root('symbol-miss');
      writeFiles(repo, {
        'src/app.ts': 'export function existing() { return 1; }',
        'src/main.py': 'def authenticate(user):\n    return user is not None\n',
      });

      const project = await buildProject(repo);
      const storage = storageFor(join(repo, '.storage'));
      await persistBaseline(storage, repo, project);

      const evaluator = evaluatorFor(project, repo, storage);
      const ctx = toolContext(project, repo, evaluator);

      const symbols = await findSymbol(ctx, { name: 'PaymentService' });
      expect(symbols).toEqual([]);

      const coverage = await checkIndexCoverage(ctx, {
        capability: 'symbol_graph',
        verifyFreshness: true,
      });
      expect(coverage.status).toBe('partial');
      expect(coverage.negativeClaimSafe).toBe(false);

      const server = readFileSync('src/mcp/server.ts', 'utf8');
      expect(server).toContain('negativeClaimSafe');
      expect(server).toContain('check_index_coverage');
    }

    /*
     * 14. Dead-code candidate + partial graph -> trust metadata warns.
     */
    {
      const repo = root('deadcode');
      writeFiles(repo, {
        'src/app.ts': 'export function unusedHelper() { return 42; }',
        'src/main.py': 'def authenticate(user):\n    return user is not None\n',
      });

      const project = await buildProject(repo);
      const storage = storageFor(join(repo, '.storage'));
      await persistBaseline(storage, repo, project);

      const evaluator = evaluatorFor(project, repo, storage);
      const ctx = toolContext(project, repo, evaluator);

      const result = await deadCode(ctx, {});
      expect(result.total).toBeGreaterThan(0);
      expect(result.candidates.some((item) => item.name === 'unusedHelper')).toBe(true);
      expect(result.warning).toContain('candidates only');
      expect(result.coverage?.negativeClaimSafe).toBe(false);
      expect(result.coverage?.status).toBe('partial');

      const complete = await deadCode(toolContext(project, repo), {});
      expect(complete.coverage).toBeUndefined();
    }

    /*
     * 15. Coverage persistence round-trip.
     */
    {
      const repo = root('roundtrip');
      writeFiles(repo, { 'src/a.ts': 'export function a() { return 1; }' });
      const project = await buildProject(repo);

      const storage = storageFor(join(repo, '.storage'));
      const store = new PersistentGraphCoverageStore(storage);

      await store.save(project.coverage);
      const loaded = await store.load(PROJECT_ID);

      expect(loaded).toEqual(project.coverage);
      expect(loaded?.version).toBe(1);
      expect(loaded?.projectId).toBe(PROJECT_ID);
    }

    /*
     * 16. Project isolation: project A cannot read project B coverage.
     */
    {
      const repo = root('isolation');
      writeFiles(repo, { 'src/a.ts': 'export function a() { return 1; }' });
      const project = await buildProject(repo);

      const storage = storageFor(join(repo, '.storage'));
      const store = new PersistentGraphCoverageStore(storage);

      await store.save(project.coverage);
      expect(await store.load('other-project')).toBeNull();
      expect(await store.load(PROJECT_ID)).not.toBeNull();
    }

    /*
     * 17. Path traversal rejected.
     */
    {
      const repo = root('traversal');
      writeFiles(repo, { 'src/a.ts': 'export function a() { return 1; }' });
      const project = await buildProject(repo);
      const storage = storageFor(join(repo, '.storage'));
      await persistBaseline(storage, repo, project);

      const evaluator = evaluatorFor(project, repo, storage);
      const ctx = toolContext(project, repo, evaluator);

      expect(() => evaluator.assertPathsWithinRoot(['../../etc/passwd'])).toThrow();
      expect(() => evaluator.assertPathsWithinRoot(['/etc/passwd'])).toThrow();
      expect(() => evaluator.assertPathsWithinRoot(['src/../../outside.ts'])).toThrow();

      await expect(
        checkIndexCoverage(ctx, { capability: 'call_graph', paths: ['../../etc/passwd'] })
      ).rejects.toThrow();

      expect(() => evaluator.assertPathsWithinRoot(['src/a.ts'])).not.toThrow();

      /*
       * Path-restricted freshness: only the given path is checked.
       */
      const restrictedClean = await evaluator.checkFreshness({ paths: ['src/b.ts'] });
      expect(restrictedClean.stale).toBe(false);

      writeFileSync(join(repo, 'src/a.ts'), 'export function a() { return 999; }');

      const restrictedAfterModify = await evaluator.checkFreshness({ paths: ['src/a.ts'] });
      expect(restrictedAfterModify.stale).toBe(true);
      expect(restrictedAfterModify.modified).toContain('src/a.ts');

      const unrelated = await evaluator.checkFreshness({ paths: ['src/b.ts'] });
      expect(unrelated.stale).toBe(false);

      const full = await evaluator.checkFreshness();
      expect(full.stale).toBe(true);
      expect(full.modified).toContain('src/a.ts');
    }

    /*
     * 18. Existing MCP outputs stay backward-compatible: without a wired
     *     evaluator the coverage field is omitted and old shapes hold.
     */
    {
      const repo = root('compat');
      writeFiles(repo, {
        'src/app.ts': [
          'export function used() { return 1; }',
          'export function orphan() { return 2; }',
          'export function user() { return used(); }',
          '',
        ].join('\n'),
      });
      const project = await buildProject(repo);

      const ctx = toolContext(project, repo);

      const callers = await findCallers(ctx, { symbolId: 'orphan' });
      expect(callers.coverage).toBeUndefined();
      expect(callers.found).toBe(true);
      expect(callers.count).toBe(0);

      const found = await findCallers(ctx, { symbolId: 'used' });
      expect(found.count).toBe(1);
      expect(found.callers).toHaveLength(1);
      expect(found.coverage).toBeUndefined();
    }

    /*
     * check_index_coverage tool contract.
     */
    {
      const repo = root('tool');
      writeFiles(repo, {
        'src/orders.ts': 'export function createOrder() { return "o1"; }',
        'src/main.py': 'def authenticate(user):\n    return user is not None\n',
      });

      const project = await buildProject(repo);
      const storage = storageFor(join(repo, '.storage'));
      await persistBaseline(storage, repo, project);

      const evaluator = evaluatorFor(project, repo, storage);
      const ctx = toolContext(project, repo, evaluator);

      const partial = await checkIndexCoverage(ctx, { capability: 'call_graph' });
      expect(partial.status).toBe('partial');
      expect(partial.negativeClaimSafe).toBe(false);
      expect(partial.reasons).toContain('CROSS_FILE_RESOLUTION_PENDING');
      expect(partial.coverage?.acceptedFiles).toBe(2);
      expect(partial.coverage?.parseFailures).toBe(0);
      expect(partial.freshness?.checked).toBe(true);
      expect(partial.freshness?.stale).toBe(false);

      const all = await checkIndexCoverage(ctx, {});
      expect(all.status).toBe('partial');
      expect(all.capabilities?.call_graph).toMatchObject({ status: 'partial' });
      expect(all.capabilities?.lexical_search).toMatchObject({ status: 'complete' });

      writeFileSync(
        join(repo, 'src/orders.ts'),
        'export function createOrder() { return "o1-changed"; }'
      );

      const stale = await checkIndexCoverage(ctx, {
        capability: 'call_graph',
        verifyFreshness: true,
      });
      expect(stale.status).toBe('stale');
      expect(stale.negativeClaimSafe).toBe(false);
      expect(stale.reasons).toContain('SOURCE_MODIFIED_AFTER_INDEX');

      const noVerify = await checkIndexCoverage(ctx, {
        capability: 'call_graph',
        verifyFreshness: false,
      });
      expect(noVerify.freshness?.checked).toBe(false);
      expect(noVerify.status).toBe('partial');
    }

    /*
     * Static contract: registration, exports, scripts and docs.
     */
    {
      const server = readFileSync('src/mcp/server.ts', 'utf8');
      expect(server).toContain("server.tool(\n    'check_index_coverage'");
      expect(server).toContain('GRAPH COVERAGE & TRUST RULES');

      const storageIndex = readFileSync('src/storage/index.ts', 'utf8');
      expect(storageIndex).toContain("export * from './graph-coverage-store.js';");

      const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
      expect(packageJson.scripts['phase68:certify']).toContain('phase68-graph-coverage-trust');

      const docs = readFileSync('docs/architecture.md', 'utf8');
      expect(docs).toContain('Phase 68 — Graph Coverage & Trust Contract');
      expect(docs).toContain('negativeClaimSafe');
    }

    console.log('PHASE68_GRAPH_COVERAGE_TRUST=PASS');
  });
});

describe('Phase 68 freshness checker', () => {
  it('reports INDEX_STALE when the manifest baseline is missing', async () => {
    const repo = root('no-manifest');
    writeFiles(repo, { 'src/a.ts': 'export function a() { return 1; }' });
    const project = await buildProject(repo);
    const storage = storageFor(join(repo, '.storage'));

    await new PersistentGraphCoverageStore(storage).save(project.coverage);

    const checker = new GraphFreshnessChecker(storage);
    const result = await checker.check(PROJECT_ID, repo);

    expect(result.checked).toBe(true);
    expect(result.stale).toBe(true);
    expect(result.error).toContain('manifest missing');

    const evaluator = new GraphCoverageEvaluator({
      projectId: PROJECT_ID,
      rootPath: repo,
      storage,
      snapshot: project.coverage,
      graphAvailable: true,
    });

    const evaluated = await evaluator.evaluateWithFreshness('call_graph');
    expect(evaluated.status).toBe('stale');
    expect(evaluated.reasons).toContain('INDEX_STALE');
  });
});
