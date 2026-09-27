/*
 * Phase 82 — central test framework registry.
 *
 * Every framework-specific decision lives here: how a test file is recognised,
 * how test symbols are extracted, how a SAFE argv is built, and how machine
 * readable results are parsed. No framework `if/else` is scattered elsewhere.
 *
 * Discovery never executes a test file. Execution never builds a command from
 * an untrusted string: argv is always an array, and the executable is resolved
 * from the project's own tooling (no installation, no network).
 */

import { existsSync } from 'node:fs';

import { isAbsolute, join, normalize } from 'node:path';

import * as ts from 'typescript';

import type { TestFramework, TestSupport } from './types.js';

export interface ParsedTestSymbol {
  name: string;
  suite?: string;
  line?: number;
}

export interface TestCommandPlan {
  framework: TestFramework;
  command: string;
  args: string[];
  cwd: string;
  /** True when the executable could not be resolved locally. */
  unavailable: boolean;
}

export type ResultSupport = 'structured' | 'textual' | 'none';

export interface ParsedTestResult {
  testId: string;
  status: 'passed' | 'failed' | 'skipped' | 'todo' | 'errored';
  durationMs?: number;
  failure?: string;
}

export interface TestFrameworkAdapter {
  framework: TestFramework;
  /** Discovery support level for this build. */
  support: TestSupport;
  resultSupport: ResultSupport;
  /** True when the path looks like a test file for this framework. */
  matchesPath(path: string): boolean;
  /** Extract test symbols from source text (never executes anything). */
  parseTests(source: string, path: string): ParsedTestSymbol[];
  /** Build a safe argv for one validated test path. */
  buildCommand(input: { rootPath: string; testPath: string }): TestCommandPlan;
  /** Parse machine-readable runner output when available. */
  parseResults(stdout: string, stderr: string): ParsedTestResult[] | null;
}

const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/u;

function normalizePath(value: string): string {
  return normalize(value).replaceAll('\\', '/');
}

/** Resolve a project-local executable; never a global package or an install. */
export function resolveLocalBinary(rootPath: string, name: string): string | null {
  const candidates = [
    join(rootPath, 'node_modules', '.bin', name),
    join(rootPath, 'node_modules', '.bin', `${name}.cmd`),
    join(rootPath, 'node_modules', '.bin', `${name}.exe`),
  ];

  for (const candidate of candidates) {
    try {
      if (existsSync(candidate)) {
        return candidate;
      }
    } catch {
      /* Unreadable binary path: treat as unavailable. */
    }
  }

  return null;
}

function relativeCommand(rootPath: string, name: string): string | null {
  const absolute = resolveLocalBinary(rootPath, name);

  if (!absolute) {
    return null;
  }

  /* Keep the command project-contained and relative to the runner cwd. */
  return normalizePath(absolute).replace(`${normalizePath(rootPath)}/`, '');
}

/* ------------------------------------------------------------------ *
 * TypeScript / JavaScript (vitest, jest, node:test)
 * ------------------------------------------------------------------ */

const TS_CALLS = new Set(['describe', 'it', 'test', 'suite']);
const MODIFIERS = new Set(['only', 'skip', 'todo', 'concurrent', 'each', 'failing']);

interface TsTestExtraction {
  symbols: ParsedTestSymbol[];
  /** True when the parser saw a recognizable test structure. */
  recognized: boolean;
}

function extractTsTests(source: string, path: string): TsTestExtraction {
  const file = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    path.endsWith('.tsx') || path.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  const symbols: ParsedTestSymbol[] = [];

  let recognized = false;

  const visit = (node: ts.Node, suitePath: string[]): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const name = node.expression.text;

      if (TS_CALLS.has(name)) {
        recognized = true;

        const first = node.arguments[0];

        const title =
          first && (ts.isStringLiteral(first) || ts.isNoSubstitutionTemplateLiteral(first))
            ? first.text
            : first && ts.isTemplateExpression(first)
              ? first.head.text
              : undefined;

        const isSuite = name === 'describe' || name === 'suite';

        if (isSuite) {
          const nextSuite = title ? [...suitePath, title] : suitePath;

          for (const child of node.arguments) {
            visit(child, nextSuite);
          }

          return;
        }

        symbols.push({
          name: title ?? `anonymous:${symbols.length}`,
          ...(suitePath.length > 0 ? { suite: suitePath.join(' > ') } : {}),
          line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1,
        });
      }
    }

    /* `describe.only(...)`, `test.skip(...)` — property access form. */
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const root = node.expression.expression;

      if (ts.isIdentifier(root) && TS_CALLS.has(root.text)) {
        const modifier = node.expression.name.text;

        if (MODIFIERS.has(modifier)) {
          recognized = true;

          const first = node.arguments[0];

          const title =
            first && ts.isStringLiteral(first)
              ? first.text
              : first && ts.isNoSubstitutionTemplateLiteral(first)
                ? first.text
                : undefined;

          if (root.text !== 'describe') {
            symbols.push({
              name: title ?? `anonymous:${symbols.length}`,
              ...(suitePath.length > 0 ? { suite: suitePath.join(' > ') } : {}),
              line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1,
            });
          }
        }
      }
    }

    ts.forEachChild(node, (child) => visit(child, suitePath));
  };

  visit(file, []);

  return { symbols, recognized };
}

function makeTsAdapter(framework: 'vitest' | 'jest' | 'node_test'): TestFrameworkAdapter {
  return {
    framework,
    support: 'supported',
    resultSupport: framework === 'node_test' ? 'textual' : 'structured',
    matchesPath(path) {
      return TEST_FILE.test(path);
    },
    parseTests(source, path) {
      return extractTsTests(source, path).symbols;
    },
    buildCommand({ rootPath, testPath }) {
      if (framework === 'node_test') {
        return {
          framework,
          command: process.execPath,
          args: ['--test', testPath],
          cwd: rootPath,
          unavailable: false,
        };
      }

      const binary = relativeCommand(rootPath, framework === 'vitest' ? 'vitest' : 'jest');

      if (!binary) {
        return { framework, command: framework, args: [], cwd: rootPath, unavailable: true };
      }

      const args =
        framework === 'vitest'
          ? ['run', testPath, '--reporter=json', '--no-color']
          : ['--runTestsByPath', testPath, '--json', '--ci'];

      return { framework, command: binary, args, cwd: rootPath, unavailable: false };
    },
    parseResults(stdout) {
      return parseJsonReporter(stdout, framework);
    },
  };
}

/** Find the last balanced JSON object in the output that looks like a report. */
function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();

  try {
    const direct = JSON.parse(trimmed) as unknown;
    if (direct && typeof direct === 'object') {
      return direct;
    }
  } catch {
    /* Fall through to a bounded scan. */
  }

  let start = text.indexOf('{');

  let attempts = 0;

  while (start !== -1 && attempts < 25) {
    for (let end = text.length - 1; end > start; end -= 1) {
      if (text[end] !== '}') {
        continue;
      }

      try {
        const parsed = JSON.parse(text.slice(start, end + 1)) as unknown;

        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch {
        /* Keep narrowing. */
      }

      break;
    }

    attempts += 1;
    start = text.indexOf('{', start + 1);
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeStatus(raw: unknown): ParsedTestResult['status'] {
  const value = String(raw ?? '').toLowerCase();

  if (value === 'passed' || value === 'pass' || value === 'ok') {
    return 'passed';
  }

  if (value === 'failed' || value === 'fail') {
    return 'failed';
  }

  if (value === 'skipped' || value === 'pending' || value === 'skip') {
    return 'skipped';
  }

  if (value === 'todo' || value === 'disabled') {
    return 'todo';
  }

  return 'errored';
}

function parseJsonReporter(
  stdout: string,
  _framework: 'vitest' | 'jest' | 'node_test'
): ParsedTestResult[] | null {
  const document = extractJsonObject(stdout);

  if (!isRecord(document)) {
    return null;
  }

  const results: ParsedTestResult[] = [];

  /* vitest: { testResults: [{ name, assertionResults: [{ fullName, status, duration }] }] }
     jest:   { testResults: [{ name, assertionResults: [...] }] } */
  const testResults = document.testResults;

  if (Array.isArray(testResults)) {
    for (const file of testResults) {
      if (!isRecord(file)) {
        continue;
      }

      const assertions = file.assertionResults;

      if (!Array.isArray(assertions)) {
        continue;
      }

      for (const assertion of assertions) {
        if (!isRecord(assertion)) {
          continue;
        }

        const name =
          typeof assertion.fullName === 'string'
            ? assertion.fullName
            : typeof assertion.title === 'string'
              ? assertion.title
              : 'unknown';

        const record: ParsedTestResult = {
          testId: `${String(file.name ?? '')}::${name}`,
          status: normalizeStatus(assertion.status),
        };

        if (typeof assertion.duration === 'number') {
          record.durationMs = assertion.duration;
        }

        const failureMessages = assertion.failureMessages;

        if (Array.isArray(failureMessages) && failureMessages.length > 0) {
          record.failure = String(failureMessages[0]).slice(0, 2_000);
        }

        results.push(record);
      }
    }
  }

  if (results.length > 0) {
    return results;
  }

  /* A flat { tests: [{ name, status }] } shape is also accepted. */
  const flat = document.tests;

  if (Array.isArray(flat)) {
    for (const entry of flat) {
      if (!isRecord(entry)) {
        continue;
      }

      results.push({
        testId: String(entry.name ?? entry.testId ?? 'unknown'),
        status: normalizeStatus(entry.status),
      });
    }
  }

  return results.length > 0 ? results : null;
}

/* ------------------------------------------------------------------ *
 * pytest
 * ------------------------------------------------------------------ */

function parsePytestTests(source: string): ParsedTestSymbol[] {
  const symbols: ParsedTestSymbol[] = [];

  let suite: string | undefined;

  const lines = source.split(/\r?\n/u);

  for (const [index, line] of lines.entries()) {
    const classMatch = /^class\s+([A-Za-z_][A-Za-z0-9_]*)/u.exec(line);

    if (classMatch) {
      suite = classMatch[1]!;
      continue;
    }

    const fnMatch = /^def\s+(test_[A-Za-z0-9_]*)\s*\(/u.exec(line);

    if (fnMatch) {
      symbols.push({
        name: fnMatch[1]!,
        ...(suite ? { suite } : {}),
        line: index + 1,
      });
    }
  }

  return symbols;
}

const PYTEST_ADAPTER: TestFrameworkAdapter = {
  framework: 'pytest',
  support: 'partial',
  resultSupport: 'textual',
  matchesPath(path) {
    const name = path.split('/').pop() ?? path;

    return path.startsWith('tests/') || path.includes('/tests/')
      ? /^test_.*\.py$/u.test(name) || /_test\.py$/u.test(name)
      : /^test_.*\.py$/u.test(name);
  },
  parseTests(source) {
    return parsePytestTests(source);
  },
  buildCommand({ rootPath, testPath }) {
    const binary = relativeCommand(rootPath, 'pytest');

    if (binary) {
      return {
        framework: 'pytest',
        command: binary,
        args: ['-v', testPath],
        cwd: rootPath,
        unavailable: false,
      };
    }

    /* No local pytest: the runner is unavailable rather than silently installed. */
    return { framework: 'pytest', command: 'pytest', args: [], cwd: rootPath, unavailable: true };
  },
  parseResults(stdout) {
    const results: ParsedTestResult[] = [];

    for (const line of stdout.split(/\r?\n/u)) {
      const match = /^(\S+\.py)::(\S+)\s+(PASSED|FAILED|SKIPPED|ERROR)/u.exec(line.trim());

      if (!match) {
        continue;
      }

      const status: ParsedTestResult['status'] =
        match[3] === 'PASSED'
          ? 'passed'
          : match[3] === 'FAILED'
            ? 'failed'
            : match[3] === 'SKIPPED'
              ? 'skipped'
              : 'errored';

      results.push({ testId: `${match[1]}::${match[2]}`, status });
    }

    return results.length > 0 ? results : null;
  },
};

/* ------------------------------------------------------------------ *
 * Go
 * ------------------------------------------------------------------ */

const GO_ADAPTER: TestFrameworkAdapter = {
  framework: 'go_test',
  support: 'supported',
  resultSupport: 'textual',
  matchesPath(path) {
    return path.endsWith('_test.go');
  },
  parseTests(source) {
    const symbols: ParsedTestSymbol[] = [];

    for (const line of source.split(/\r?\n/u)) {
      const match =
        /^func\s+(Test[A-Za-z0-9_]*|Benchmark[A-Za-z0-9_]*|Example[A-Za-z0-9_]*)\s*\(/u.exec(line);

      if (match) {
        symbols.push({ name: match[1]! });
      }
    }

    return symbols;
  },
  buildCommand({ rootPath, testPath }) {
    const dir = testPath.includes('/') ? `./${testPath.slice(0, testPath.lastIndexOf('/'))}` : '.';

    return {
      framework: 'go_test',
      command: 'go',
      args: ['test', dir],
      cwd: rootPath,
      unavailable: false,
    };
  },
  parseResults(stdout) {
    const results: ParsedTestResult[] = [];

    for (const line of stdout.split(/\r?\n/u)) {
      const match = /^\s*---\s+(PASS|FAIL|SKIP):\s+([A-Za-z0-9_]+)/u.exec(line);

      if (!match) {
        continue;
      }

      results.push({
        testId: match[2]!,
        status: match[1] === 'PASS' ? 'passed' : match[1] === 'FAIL' ? 'failed' : 'skipped',
      });
    }

    return results.length > 0 ? results : null;
  },
};

/* ------------------------------------------------------------------ *
 * Cargo
 * ------------------------------------------------------------------ */

const CARGO_ADAPTER: TestFrameworkAdapter = {
  framework: 'cargo_test',
  support: 'supported',
  resultSupport: 'textual',
  matchesPath(path) {
    return path.startsWith('tests/') && path.endsWith('.rs');
  },
  parseTests(source) {
    const symbols: ParsedTestSymbol[] = [];

    const lines = source.split(/\r?\n/u);

    for (const [index, line] of lines.entries()) {
      const fnMatch = /^\s*fn\s+([A-Za-z0-9_]+)\s*\(/u.exec(line);

      if (!fnMatch) {
        continue;
      }

      const previous = lines.slice(Math.max(0, index - 3), index).join('\n');

      if (/#\[test\]|#\[tokio::test\]/u.test(previous)) {
        symbols.push({ name: fnMatch[1]!, line: index + 1 });
      }
    }

    return symbols;
  },
  buildCommand({ rootPath }) {
    return {
      framework: 'cargo_test',
      command: 'cargo',
      args: ['test'],
      cwd: rootPath,
      unavailable: false,
    };
  },
  parseResults(stdout) {
    const results: ParsedTestResult[] = [];

    for (const line of stdout.split(/\r?\n/u)) {
      const match = /^test\s+(\S+)\s+\.\.\.\s+(ok|FAILED|ignored)/u.exec(line.trim());

      if (!match) {
        continue;
      }

      results.push({
        testId: match[1]!,
        status: match[2] === 'ok' ? 'passed' : match[2] === 'FAILED' ? 'failed' : 'skipped',
      });
    }

    return results.length > 0 ? results : null;
  },
};

/* ------------------------------------------------------------------ *
 * Registry
 * ------------------------------------------------------------------ */

export const TEST_FRAMEWORK_ADAPTERS: readonly TestFrameworkAdapter[] = [
  makeTsAdapter('vitest'),
  makeTsAdapter('jest'),
  makeTsAdapter('node_test'),
  PYTEST_ADAPTER,
  GO_ADAPTER,
  CARGO_ADAPTER,
];

export function adapterFor(framework: TestFramework): TestFrameworkAdapter | undefined {
  return TEST_FRAMEWORK_ADAPTERS.find((adapter) => adapter.framework === framework);
}

/**
 * Framework detection for one path.
 *
 * `vitest`/`jest` cannot be told apart from a filename alone, so a JS/TS test
 * file is attributed to `vitest` by default and the caller may prefer the
 * project's declared runner. Detection never guesses a framework for a path it
 * does not recognise.
 */
export function detectFramework(path: string, preferred?: TestFramework): TestFramework | null {
  const normalized = normalizePath(path);

  if (preferred && adapterFor(preferred)?.matchesPath(normalized)) {
    return preferred;
  }

  if (GO_ADAPTER.matchesPath(normalized)) {
    return 'go_test';
  }

  if (CARGO_ADAPTER.matchesPath(normalized)) {
    return 'cargo_test';
  }

  if (PYTEST_ADAPTER.matchesPath(normalized)) {
    return 'pytest';
  }

  if (TEST_FILE.test(normalized)) {
    return preferred === 'node_test' || preferred === 'jest' ? preferred : 'vitest';
  }

  return null;
}

/** True when a path is a test file for any supported framework. */
export function isTestPath(path: string): boolean {
  return detectFramework(path) !== null;
}

/** Reject a test path that is not project-contained or that is absolute. */
export function isContainedTestPath(path: string): boolean {
  if (typeof path !== 'string' || path.length === 0 || path.length > 1_024) {
    return false;
  }

  if (path.includes('\0') || isAbsolute(path) || /^[A-Za-z]:[\\/]/u.test(path)) {
    return false;
  }

  const normalized = normalizePath(path);

  return normalized !== '..' && !normalized.startsWith('../') && !normalized.includes('/../');
}
