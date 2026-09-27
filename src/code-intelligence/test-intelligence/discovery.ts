/*
 * Phase 82 — test discovery.
 *
 * Test files are found from the graph (paths that look like tests, plus files
 * that already carry a TESTS edge). Each source file is READ and parsed — never
 * executed — and every test symbol becomes a canonical TestDescriptor.
 *
 * Discovery tracks its own coverage per framework. A path that looks like a test
 * but has no supported parser is reported as an unsupported framework, so "no
 * tests exist" can never be produced from partial discovery.
 */

import { adapterFor, detectFramework, isTestPath } from './frameworks.js';

import type { ParsedTestSymbol } from './frameworks.js';

import type {
  FrameworkDiscoverySupport,
  TestDescriptor,
  TestDiscoveryCoverage,
  TestFramework,
  TestFacts,
  TestKind,
  TestSymbol,
} from './types.js';

export interface TestDiscoveryResult {
  tests: TestDescriptor[];
  byPath: Map<string, TestDescriptor[]>;
  coverage: TestDiscoveryCoverage;
  truncated: boolean;
}

/** Framework-agnostic pattern for a path that *looks* like a test. */
const TESTISH =
  /(^|\/)(tests?|__tests__|spec|e2e|integration)(\/|$)|\.(test|spec)\.[^/]+$|_test\.[^/]+$|^test_/u;

export function looksLikeTestPath(path: string): boolean {
  return isTestPath(path) || TESTISH.test(path);
}

function testKindFor(path: string): TestKind {
  const lower = path.toLowerCase();

  if (/(^|\/)(e2e|end-to-end)(\/|$)|\.e2e\./u.test(lower)) {
    return 'e2e';
  }

  if (/(^|\/)(integration|it)(\/|$)|\.integration\./u.test(lower)) {
    return 'integration';
  }

  if (/contract/u.test(lower)) {
    return 'contract';
  }

  return 'unit';
}

export function testDescriptorId(path: string, symbol: ParsedTestSymbol): string {
  const suite = symbol.suite ? `${symbol.suite}>` : '';

  return `${path}::${suite}${symbol.name}`;
}

function fileSymbolId(facts: TestFacts, path: string): string | undefined {
  const symbols = facts.graph.symbols().filter((symbol) => symbol.filePath === path);

  if (symbols.length === 0) {
    return undefined;
  }

  return (symbols.find((symbol) => symbol.type === 'file') ?? symbols[0])?.id;
}

export async function discoverTests(input: {
  facts: TestFacts;
  limits: { maxTestFiles: number; maxTestSymbols: number; maxSourceReadBytes: number };
}): Promise<TestDiscoveryResult> {
  const { facts, limits } = input;

  const testPaths = new Set<string>();

  for (const symbol of facts.graph.symbols()) {
    if (looksLikeTestPath(symbol.filePath)) {
      testPaths.add(symbol.filePath);
    }
  }

  /* A file that already carries a TESTS edge is a test file by construction. */
  for (const symbol of facts.graph.symbols()) {
    if (facts.graph.outgoing(symbol.id, ['TESTS']).length > 0) {
      testPaths.add(symbol.filePath);
    }
  }

  const sorted = [...testPaths].sort();

  const bounded = sorted.slice(0, limits.maxTestFiles);

  const truncated = sorted.length > bounded.length;

  const tests: TestDescriptor[] = [];
  const byPath = new Map<string, TestDescriptor[]>();

  const frameworkCounts = new Map<
    TestFramework,
    { files: number; symbols: number; support: FrameworkDiscoverySupport['support']; note?: string }
  >();

  let anyUnsupported = false;

  const unsupportedNotes = new Set<string>();

  for (const path of bounded) {
    const framework = detectFramework(path);

    const resolved: TestFramework = framework ?? 'other';

    const adapter = framework ? adapterFor(framework) : undefined;

    const support: FrameworkDiscoverySupport['support'] = framework
      ? (adapter?.support ?? 'unsupported')
      : 'unsupported';

    if (support !== 'supported') {
      anyUnsupported = true;

      unsupportedNotes.add(
        framework
          ? `${path}: limited ${framework} discovery`
          : `${path}: unsupported test framework`
      );
    }

    const bucket = frameworkCounts.get(resolved) ?? { files: 0, symbols: 0, support };

    bucket.files += 1;
    bucket.support = support === 'unsupported' ? 'unsupported' : bucket.support;

    let symbols: ParsedTestSymbol[] = [];

    if (adapter && facts.readSource) {
      const source = facts.readSource(path, limits.maxSourceReadBytes);

      if (source !== null) {
        try {
          symbols = adapter.parseTests(source, path);
        } catch {
          symbols = [];
        }
      }
    }

    const symbolId = fileSymbolId(facts, path);

    const descriptors: TestDescriptor[] = [];

    if (symbols.length === 0) {
      /* A recognised test file with no extractable test name is still a test
         unit at file granularity, so it can be selected honestly. */
      descriptors.push({
        id: `${path}::file`,
        projectId: facts.projectId,
        path,
        framework: resolved,
        kind: testKindFor(path),
        ...(symbolId ? { symbolId } : {}),
        deterministicIdentity: `${path}::file`,
      });
    } else {
      for (const symbol of symbols) {
        if (tests.length + descriptors.length >= limits.maxTestSymbols) {
          break;
        }

        descriptors.push({
          id: testDescriptorId(path, symbol),
          projectId: facts.projectId,
          path,
          framework: resolved,
          kind: testKindFor(path),
          ...(symbol.suite ? { suite: symbol.suite } : {}),
          testName: symbol.name,
          ...(symbolId ? { symbolId } : {}),
          deterministicIdentity: `${path}::${symbol.suite ?? ''}::${symbol.name}`,
        });
      }
    }

    tests.push(...descriptors);
    byPath.set(path, descriptors);

    bucket.symbols += descriptors.length;

    frameworkCounts.set(resolved, bucket);

    if (tests.length >= limits.maxTestSymbols) {
      break;
    }
  }

  const frameworks: FrameworkDiscoverySupport[] = [...frameworkCounts.entries()]
    .map(([framework, value]) => ({
      framework,
      support: value.support,
      files: value.files,
      symbols: value.symbols,
      ...(value.note ? { note: value.note } : {}),
    }))
    .sort((left, right) => left.framework.localeCompare(right.framework));

  const reasons: string[] = [];

  if (anyUnsupported) {
    reasons.push('UNSUPPORTED_TEST_FRAMEWORK');
  }

  if (truncated) {
    reasons.push('TEST_SELECTION_INCOMPLETE');
  }

  const coverage: TestDiscoveryCoverage = {
    testFiles: bounded.length,
    testSymbols: tests.length,
    frameworks,
    complete: !anyUnsupported && !truncated,
    reasons,
  };

  return { tests, byPath, coverage, truncated };
}

export { isTestPath };

export type { TestSymbol };
