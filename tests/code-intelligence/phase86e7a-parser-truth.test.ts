/*
 * Phase 86E.7A P0-B — parser capability truth (source runtime).
 *
 * Canonical authority: PARSER_CAPABILITIES in
 * src/code-intelligence/parsers/capabilities.ts. release-manifest.json must
 * describe the same truth (drift gate: phase86e7a-packaged-parser + the
 * static release contract).
 *
 * PASS marker: PARSER_SOURCE_TRUTH=PASS
 */

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  PARSER_CAPABILITIES,
  parserCapabilityForPath,
  structuralLanguages,
  supportedParserExtensions,
  treeSitterLanguages,
} from '../../src/code-intelligence/parsers/capabilities.js';
import {
  findStructuralAdapter,
  getStructuralParserAdapters,
  isTreeSitterRuntimeAvailable,
  parseWithStructuralAdapter,
  resetParserRegistry,
  structuralAdapterIds,
} from '../../src/code-intelligence/parsers/registry.js';
import { TreeSitterPythonAdapter } from '../../src/code-intelligence/parsers/tree-sitter/python.js';
import {
  createTreeSitterRuntime,
  resetTreeSitterRuntime,
  verifyGrammarAssets,
} from '../../src/code-intelligence/parsers/tree-sitter/runtime.js';

const MARKER = 'PARSER_SOURCE_TRUTH=PASS';

const SAMPLES: Record<string, { file: string; source: string }> = {
  python: {
    file: 'svc.py',
    source: [
      'import os',
      'from sys import path',
      '',
      'class Greeter(Base):',
      '    def greet(self, name):',
      '        return helper(name)',
      '',
    ].join('\n'),
  },
  go: {
    file: 'svc.go',
    source: [
      'package main',
      '',
      'import (',
      '"fmt"',
      '"os"',
      ')',
      '',
      'type Server struct { Name string }',
      '',
      'func (s Server) Start() error {',
      '    fmt.Println("hi")',
      '    return helper()',
      '}',
      '',
      'func main() { fmt.Println(os.Args) }',
      '',
    ].join('\n'),
  },
  rust: {
    file: 'svc.rs',
    source: [
      'use std::collections::HashMap;',
      '',
      'struct Config { name: String }',
      '',
      'impl Config {',
      '    fn new(name: String) -> Self { Self { name } }',
      '    fn run(&self) { helper(); }',
      '}',
      '',
    ].join('\n'),
  },
  c: {
    file: 'svc.c',
    source: [
      '#include <stdio.h>',
      '#include "util.h"',
      '',
      'struct Point { int x; int y; };',
      '',
      'int add(int a, int b) { return helper(a) + a; }',
      '',
      'int main() { printf("hi"); return add(1, 2); }',
      '',
    ].join('\n'),
  },
  cpp: {
    file: 'svc.cpp',
    source: [
      '#include <iostream>',
      '#include "x.hpp"',
      '',
      'class Widget : public Base {',
      'public:',
      '    void render() { helper(); }',
      '};',
      '',
      'int main() { Widget w; w.render(); }',
      '',
    ].join('\n'),
  },
};

describe('Phase 86E.7A — parser capability truth', () => {
  it('P1: canonical capability set covers tree-sitter structural languages', () => {
    expect(treeSitterLanguages().sort()).toEqual(['c', 'cpp', 'go', 'python', 'rust']);
    expect(structuralLanguages()).toContain('python');
    expect(structuralLanguages()).toContain('cpp');

    for (const language of ['python', 'go', 'rust', 'c', 'cpp'] as const) {
      const entry = PARSER_CAPABILITIES.find((item) => item.language === language);
      expect(entry?.engine).toBe('tree-sitter');
      expect(entry?.structural).toBe(true);
      expect(entry?.supported).toBe(true);
      expect(entry?.lexicalSearch).toBe(true);
    }

    const extensions = supportedParserExtensions();
    for (const extension of [
      '.py',
      '.go',
      '.rs',
      '.c',
      '.h',
      '.cc',
      '.cpp',
      '.cxx',
      '.hpp',
      '.hh',
    ]) {
      expect(extensions).toContain(extension);
    }

    expect(parserCapabilityForPath('a.py')?.engine).toBe('tree-sitter');
    expect(parserCapabilityForPath('a.cpp')?.engine).toBe('tree-sitter');
  });

  it('P1b: tree-sitter runtime initializes with all five grammar assets', () => {
    const assets = verifyGrammarAssets();
    expect(assets.map((asset) => asset.language)).toEqual(['c', 'cpp', 'go', 'python', 'rust']);
    for (const asset of assets) {
      expect(asset.available).toBe(true);
      expect(asset.sha256).toMatch(/^[0-9a-f]{64}$/u);
    }

    expect(isTreeSitterRuntimeAvailable()).toBe(true);
    expect(structuralAdapterIds().sort()).toEqual([
      'tree-sitter-c',
      'tree-sitter-cpp',
      'tree-sitter-go',
      'tree-sitter-python',
      'tree-sitter-rust',
    ]);
  });

  it.each(['python', 'go', 'rust', 'c', 'cpp'] as const)(
    'structural parse (%s): functions, imports, types and call edges',
    async (language) => {
      const sample = SAMPLES[language];
      const parsed = await parseWithStructuralAdapter({
        projectId: 'phase86e7a',
        rootPath: '/tmp/phase86e7a',
        filePath: sample.file,
        source: sample.source,
        language,
      });

      // Lexical indexing is NOT a structural PASS: null means fallback.
      expect(parsed).not.toBe(null);
      expect(parsed?.parser?.engine).toBe('tree-sitter');
      expect(parsed?.parser?.structural).toBe(true);
      // File symbol + at least one extracted function/method/class.
      expect(parsed!.symbols.length).toBeGreaterThan(1);
      expect(parsed!.imports.length).toBeGreaterThan(0);
      expect(parsed!.calls.length).toBeGreaterThan(0);
    }
  );

  it('P7: unavailable grammar fails closed — never a structural success', async () => {
    resetTreeSitterRuntime();
    resetParserRegistry();

    const empty = createTreeSitterRuntime({ grammars: {} });
    expect(empty.available).toBe(false);

    await expect(
      new TreeSitterPythonAdapter(empty).parse({
        projectId: 'phase86e7a',
        rootPath: '/tmp/phase86e7a',
        filePath: 'a.py',
        source: 'x = 1\n',
        language: 'python',
      })
    ).rejects.toThrow('grammar unavailable');

    resetTreeSitterRuntime();
    resetParserRegistry();

    // No adapter at all → null so the caller takes the lexical path.
    const unsupported = await parseWithStructuralAdapter({
      projectId: 'phase86e7a',
      rootPath: '/tmp/phase86e7a',
      filePath: 'A.java',
      source: 'class A {}',
      language: 'java' as never,
    });
    expect(unsupported).toBe(null);
    expect(findStructuralAdapter('java' as never)).toBe(null);
  });

  it('P8: syntax errors report coverage gaps instead of crashing', async () => {
    const parsed = await parseWithStructuralAdapter({
      projectId: 'phase86e7a',
      rootPath: '/tmp/phase86e7a',
      filePath: 'broken.py',
      source: 'def foo(:\n  ???\n',
      language: 'python',
    });

    expect(parsed).not.toBe(null);
    expect(parsed?.diagnostics?.some((item) => item.code === 'PARTIAL_AST')).toBe(true);
    // Diagnostics never carry source content.
    for (const diagnostic of parsed?.diagnostics ?? []) {
      expect(diagnostic.message).not.toContain('def foo');
    }
  });

  it('P9: lexical fallback remains available for every structural language', () => {
    for (const language of ['python', 'go', 'rust', 'c', 'cpp'] as const) {
      const entry = PARSER_CAPABILITIES.find((item) => item.language === language);
      expect(entry?.lexicalSearch).toBe(true);
      expect(entry?.lexicalEngine).toBe('file-chunk-fts5-bm25');
    }
  });

  it('P10: release manifest equals canonical parser truth (drift gate)', () => {
    const manifest = JSON.parse(readFileSync('release-manifest.json', 'utf8')) as {
      hardening?: {
        codeIntelligence?: {
          treeSitterRuntime?: unknown;
          supportedExtensions?: unknown;
        };
        nonTsIntelligence?: { structuralParserSupport?: unknown };
      };
    };

    const codeIntelligence = manifest.hardening?.codeIntelligence;
    const nonTs = manifest.hardening?.nonTsIntelligence;

    expect(codeIntelligence?.treeSitterRuntime).toBe(true);
    expect(nonTs?.structuralParserSupport).toBe(true);

    const manifestExtensions = new Set((codeIntelligence?.supportedExtensions ?? []) as string[]);
    for (const extension of supportedParserExtensions()) {
      expect(manifestExtensions.has(extension)).toBe(true);
    }

    expect(MARKER).toBe('PARSER_SOURCE_TRUTH=PASS');
  });

  it('P11: grammar/runtime packages are production dependencies with shippable assets', async () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
      dependencies?: Record<string, string>;
    };

    for (const dependency of [
      'web-tree-sitter',
      'tree-sitter-python',
      'tree-sitter-go',
      'tree-sitter-rust',
      'tree-sitter-c',
      'tree-sitter-cpp',
    ]) {
      expect(packageJson.dependencies?.[dependency]).toBeDefined();
    }

    const { existsSync } = await import('node:fs');
    for (const asset of verifyGrammarAssets()) {
      expect(asset.available).toBe(true);
      expect(existsSync(asset.wasmPath)).toBe(true);
    }
  });

  it('P17: grammar asset hashes are memoized for the admission hot path', async () => {
    /*
     * Phase 77 regression guard: every daemon admission handshake recomputes
     * the build fingerprint, which hashes the grammar wasm assets. Without
     * memoization each handshake synchronously re-reads ~6MB, starving the
     * event loop until concurrent startups miss their connect budgets.
     * This test proves repeat lookups are served from the memo without
     * touching the filesystem again: a file created after the first (miss)
     * lookup stays invisible until resetTreeSitterRuntime clears the cache.
     */
    const { hashGrammarAsset } =
      await import('../../src/code-intelligence/parsers/tree-sitter/runtime.js');
    const { mkdtempSync, writeFileSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');

    const dir = mkdtempSync(join(tmpdir(), 'toolnet-hash-memo-'));

    try {
      const probe = join(dir, 'late.wasm');

      expect(hashGrammarAsset(probe)).toBe(null);

      writeFileSync(probe, 'grammar-bytes');

      // Memoized miss: no filesystem re-read on repeat lookups.
      expect(hashGrammarAsset(probe)).toBe(null);

      resetTreeSitterRuntime();

      const digest = hashGrammarAsset(probe);
      expect(digest).toMatch(/^[0-9a-f]{64}$/u);

      // Memoized hit: stable across repeat lookups.
      expect(hashGrammarAsset(probe)).toBe(digest);
    } finally {
      resetTreeSitterRuntime();
      const { rmSync } = await import('node:fs');
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
