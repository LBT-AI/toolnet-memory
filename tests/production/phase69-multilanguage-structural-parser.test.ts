import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';

import { dirname, join } from 'node:path';

import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import { RepositoryIndexer } from '../../src/code-intelligence/indexer/repository-indexer.js';

import { findCallers } from '../../src/mcp/tools/find-callers.js';

import { findSymbol } from '../../src/mcp/tools/find-symbol.js';

import { checkIndexCoverage } from '../../src/mcp/tools/check-index-coverage.js';

import {
  searchableParserExtensions,
  structuralLanguages,
  treeSitterLanguages,
} from '../../src/code-intelligence/parsers/capabilities.js';

import {
  getStructuralParserAdapters,
  isTreeSitterRuntimeAvailable,
  resetParserRegistry,
} from '../../src/code-intelligence/parsers/registry.js';

import {
  GraphCoverageBuilder,
  GraphFreshnessChecker,
} from '../../src/code-intelligence/graph-coverage/index.js';

import type { GraphCoverageSnapshot } from '../../src/code-intelligence/graph-coverage/types.js';

import { IncrementalRepositoryIndexer } from '../../src/code-intelligence/incremental/incremental-indexer.js';

import {
  computeParserFingerprint,
  GRAPH_PARSER_SCHEMA_VERSION,
} from '../../src/code-intelligence/parsers/fingerprint.js';

import {
  resolveGrammarWasmPaths,
  verifyGrammarAssets,
} from '../../src/code-intelligence/parsers/tree-sitter/runtime.js';

import { PersistentCodeGraphStore } from '../../src/storage/code-graph-store.js';

import { LocalStorageProvider } from '../../src/storage/local/client.js';

import type { RepositoryIndexResult } from '../../src/code-intelligence/indexer/repository-indexer.js';

const PROJECT_ID = 'phase69-project';

const roots: string[] = [];

function root(label: string): string {
  const value = mkdtempSync(join(tmpdir(), `toolnet-phase69-${label}-`));
  roots.push(value);
  return value;
}

afterEach(() => {
  for (const value of roots.splice(0)) {
    rmSync(value, { recursive: true, force: true });
  }
  resetParserRegistry();
});

function writeFiles(repo: string, files: Record<string, string>): void {
  for (const [relative, content] of Object.entries(files)) {
    const absolute = join(repo, relative);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, content);
  }
}

function coverageInput(indexed: RepositoryIndexResult) {
  return {
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
  };
}

function buildCoverage(
  indexed: RepositoryIndexResult,
  overrides: Partial<ReturnType<typeof coverageInput>> = {}
): GraphCoverageSnapshot {
  return new GraphCoverageBuilder().build({ ...coverageInput(indexed), ...overrides });
}

function storageFor(dir: string): LocalStorageProvider {
  return new LocalStorageProvider(dir);
}

describe('Phase 69 Multi-language Structural Parser Foundation', () => {
  it('exposes tree-sitter runtime and adapters', () => {
    expect(isTreeSitterRuntimeAvailable()).toBe(true);
    const adapters = getStructuralParserAdapters();
    expect(adapters.map((a) => a.id).sort()).toEqual([
      'tree-sitter-c',
      'tree-sitter-cpp',
      'tree-sitter-go',
      'tree-sitter-python',
      'tree-sitter-rust',
    ]);
  });

  it('reports structural parser capability truthfully', () => {
    expect(structuralLanguages()).toEqual(
      expect.arrayContaining([
        'typescript',
        'tsx',
        'javascript',
        'jsx',
        'mts',
        'cts',
        'mjs',
        'cjs',
        'python',
        'go',
        'rust',
        'c',
        'cpp',
      ])
    );
    expect(treeSitterLanguages()).toEqual(
      expect.arrayContaining(['python', 'go', 'rust', 'c', 'cpp'])
    );
    expect(searchableParserExtensions()).toEqual(
      expect.arrayContaining([
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
      ])
    );
  });

  it('parses Python structural symbols', async () => {
    const repo = root('py');
    writeFiles(repo, {
      'src/service.py': [
        'class Base:',
        '    def hello(self):',
        '        return "hi"',
        '',
        'class User(Base):',
        '    def greet(self):',
        '        return super().hello()',
        '',
        'def helper():',
        '    return User()',
        '',
        'import os',
        'from collections import defaultdict',
        'from utils import helper as h',
        '',
        'def caller():',
        '    return h()',
      ].join('\n'),
    });

    const indexed = await new RepositoryIndexer().index(PROJECT_ID, repo);
    expect(indexed.parseFailures).toBe(0);

    const symbols = indexed.graph.allSymbols(PROJECT_ID);
    const names = symbols.map((s) => s.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'src/service.py',
        'Base',
        'User',
        'helper',
        'caller',
        'hello',
        'greet',
      ])
    );

    const user = symbols.find((s) => s.name === 'User');
    expect(user?.type).toBe('class');
    expect(user?.metadata?.structuralParser).toBe(true);

    const greet = symbols.find((s) => s.name === 'greet');
    expect(greet?.type).toBe('method');
    expect(greet?.metadata?.structuralParser).toBe(true);
  });

  it('parses Go structural symbols', async () => {
    const repo = root('go');
    writeFiles(repo, {
      'cmd/server.go': [
        'package main',
        '',
        'import "fmt"',
        '',
        'type Service struct {',
        '    Name string',
        '}',
        '',
        'func (s *Service) Create() error {',
        '    return nil',
        '}',
        '',
        'func main() {',
        '    var s Service',
        '    _ = s.Create()',
        '    fmt.Println("hi")',
        '}',
      ].join('\n'),
    });

    const indexed = await new RepositoryIndexer().index(PROJECT_ID, repo);
    expect(indexed.parseFailures).toBe(0);

    const symbols = indexed.graph.allSymbols(PROJECT_ID);
    const names = symbols.map((s) => s.name);
    expect(names).toEqual(expect.arrayContaining(['cmd/server.go', 'Service', 'Create', 'main']));

    const service = symbols.find((s) => s.name === 'Service');
    expect(service?.type).toBe('class');
    expect(service?.metadata?.kind).toBe('struct');

    const create = symbols.find((s) => s.name === 'Create');
    expect(create?.type).toBe('method');
  });

  it('parses Rust structural symbols', async () => {
    const repo = root('rust');
    writeFiles(repo, {
      'src/lib.rs': [
        'use std::collections::HashMap;',
        '',
        'struct User {',
        '    name: String,',
        '}',
        '',
        'trait Greet {',
        '    fn greet(&self);',
        '}',
        '',
        'impl Greet for User {',
        '    fn greet(&self) {}',
        '}',
        '',
        'impl User {',
        '    fn new() -> Self { User { name: String::new() } }',
        '}',
        '',
        'fn helper() {',
        '    let u = User::new();',
        '}',
      ].join('\n'),
    });

    const indexed = await new RepositoryIndexer().index(PROJECT_ID, repo);
    expect(indexed.parseFailures).toBe(0);

    const symbols = indexed.graph.allSymbols(PROJECT_ID);
    const names = symbols.map((s) => s.name);
    expect(names).toEqual(
      expect.arrayContaining(['src/lib.rs', 'User', 'Greet', 'helper', 'new', 'greet'])
    );

    const user = symbols.find((s) => s.name === 'User');
    expect(user?.type).toBe('class');
    expect(user?.metadata?.kind).toBe('struct');
  });

  it('parses C structural symbols', async () => {
    const repo = root('c');
    writeFiles(repo, {
      'src/main.c': [
        '#include <stdio.h>',
        '#include "local.h"',
        '',
        'typedef int Count;',
        '',
        'struct Point {',
        '    int x;',
        '    int y;',
        '};',
        '',
        'enum Color { RED, GREEN, BLUE };',
        '',
        'int add(int a, int b) {',
        '    return a + b;',
        '}',
        '',
        'int main() {',
        '    Count c = add(1, 2);',
        '    return c;',
        '}',
      ].join('\n'),
    });

    const indexed = await new RepositoryIndexer().index(PROJECT_ID, repo);
    expect(indexed.parseFailures).toBe(0);

    const symbols = indexed.graph.allSymbols(PROJECT_ID);
    const names = symbols.map((s) => s.name);
    expect(names).toEqual(
      expect.arrayContaining(['src/main.c', 'Count', 'Point', 'Color', 'add', 'main'])
    );

    const point = symbols.find((s) => s.name === 'Point');
    expect(point?.type).toBe('class');
    expect(point?.metadata?.kind).toBe('struct');
  });

  it('parses C++ structural symbols', async () => {
    const repo = root('cpp');
    writeFiles(repo, {
      'src/service.cpp': [
        '#include <iostream>',
        '',
        'namespace api {',
        'class Service {',
        'public:',
        '    virtual ~Service() = default;',
        '    virtual bool create() = 0;',
        '};',
        '',
        'class UserService : public Service {',
        'public:',
        '    bool create() override;',
        '    void helper();',
        '};',
        '',
        'void free_func() {',
        '    UserService u;',
        '    u.create();',
        '}',
        '',
        '}',
      ].join('\n'),
    });

    const indexed = await new RepositoryIndexer().index(PROJECT_ID, repo);
    expect(indexed.parseFailures).toBe(0);

    const symbols = indexed.graph.allSymbols(PROJECT_ID);
    const names = symbols.map((s) => s.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'src/service.cpp',
        'Service',
        'UserService',
        'free_func',
        'create',
        'helper',
      ])
    );

    const userService = symbols.find((s) => s.name === 'UserService');
    expect(userService?.type).toBe('class');
  });

  it('does not create fake cross-file CALLS edges for tree-sitter languages', async () => {
    const repo = root('cross');
    writeFiles(repo, {
      'src/a.py': 'def save():\n    return "a"\n',
      'src/b.py': 'def save():\n    return "b"\n',
      'src/c.py': 'def caller():\n    return save()\n',
    });

    const indexed = await new RepositoryIndexer().index(PROJECT_ID, repo);
    const calls = indexed.graph.allEdges(PROJECT_ID).filter((e) => e.type === 'CALLS');
    expect(calls).toHaveLength(0);
  });

  it('marks cross-file resolution as pending for tree-sitter languages', async () => {
    const repo = root('coverage');
    writeFiles(repo, {
      'src/index.ts': 'export function tsFn() { return 1; }',
      'src/main.py': 'def pyFn():\n    return 1\n',
    });

    const project = await new RepositoryIndexer().index(PROJECT_ID, repo);
    const coverage = new (
      await import('../../src/code-intelligence/graph-coverage/index.js')
    ).GraphCoverageBuilder().build({
      projectId: PROJECT_ID,
      scan: project.scan,
      acceptedFiles: project.acceptedFiles,
      languages: project.languages,
      indexedFiles: project.files,
      structuralFiles: project.structuralFiles,
      lexicalOnlyFiles: project.lexicalOnlyFiles,
      parseFailures: project.parseFailures,
      crossFileResolutionLanguages: project.crossFileResolutionLanguages,
    });

    expect(coverage.capabilities.call_graph.status).toBe('partial');
    expect(coverage.capabilities.call_graph.negativeClaimSafe).toBe(false);
    expect(coverage.capabilities.call_graph.reasons).toContain('CROSS_FILE_RESOLUTION_PENDING');

    const python = coverage.languages.find((l) => l.language === 'python');
    expect(python?.structural).toBe(true);
    expect(python?.crossFileResolution).toBe('pending');
  });

  it('discovers all six language families in a cross-language fixture repo', async () => {
    const repo = root('multi');
    writeFiles(repo, {
      'src/index.ts': 'export function tsFn() { return 1; }',
      'worker/job.py': 'def pyFn():\n    return 1\n',
      'cmd/server.go': 'package main\nfunc main() {}\n',
      'core/lib.rs': 'fn rsFn() {}\n',
      'native/core.c': 'int cFn() { return 0; }\n',
      'native/service.cpp': 'class Svc {};\n',
    });

    const indexed = await new RepositoryIndexer().index(PROJECT_ID, repo);
    const languages = indexed.languages.map((l) => l.language).sort();
    expect(languages).toEqual(
      expect.arrayContaining(['typescript', 'python', 'go', 'rust', 'c', 'cpp'])
    );

    const symbols = indexed.graph.allSymbols(PROJECT_ID);
    expect(symbols.length).toBeGreaterThan(6);
    expect(indexed.parseFailures).toBe(0);
  });

  it('resolves structural adapters deterministically for every tree-sitter language', () => {
    const adapters = getStructuralParserAdapters();

    for (const [id, language] of [
      ['tree-sitter-python', 'python'],
      ['tree-sitter-go', 'go'],
      ['tree-sitter-rust', 'rust'],
      ['tree-sitter-c', 'c'],
      ['tree-sitter-cpp', 'cpp'],
    ] as const) {
      const adapter = adapters.find((item) => item.id === id);
      expect(adapter).toBeDefined();
      expect(adapter?.supports(language)).toBe(true);
      expect(adapter?.engine).toBe('tree-sitter');
      expect(adapter?.capability()).toMatchObject({
        parserId: id,
        engine: 'tree-sitter',
        structural: true,
        lexicalSearch: true,
      });
    }

    // TypeScript is never handled by a tree-sitter adapter, and there are no
    // duplicate adapter registrations.
    expect(adapters.some((adapter) => adapter.supports('typescript' as never))).toBe(false);
    expect(new Set(adapters.map((adapter) => adapter.id)).size).toBe(adapters.length);
  });

  it('verifies grammar asset integrity and computes a stable parser fingerprint', () => {
    const assets = verifyGrammarAssets();
    expect(assets.map((asset) => asset.language)).toEqual(['c', 'cpp', 'go', 'python', 'rust']);
    for (const asset of assets) {
      expect(asset.available).toBe(true);
      expect(asset.sha256).toMatch(/^[0-9a-f]{64}$/u);
    }

    for (const wasmPath of Object.values(resolveGrammarWasmPaths())) {
      expect(existsSync(wasmPath)).toBe(true);
    }

    const first = computeParserFingerprint();
    const second = computeParserFingerprint();

    expect(first.digest).toBe(second.digest);
    expect(first.digest).toMatch(/^[0-9a-f]{64}$/u);
    expect(first.schemaVersion).toBe(GRAPH_PARSER_SCHEMA_VERSION);
    expect(first.adapters.sort()).toEqual([
      'tree-sitter-c',
      'tree-sitter-cpp',
      'tree-sitter-go',
      'tree-sitter-python',
      'tree-sitter-rust',
    ]);
    expect(Object.keys(first.grammars).sort()).toEqual(['c', 'cpp', 'go', 'python', 'rust']);
  });

  it('parses offline without any network downloader', () => {
    const runtime = readFileSync('src/code-intelligence/parsers/tree-sitter/runtime.ts', 'utf8');
    expect(runtime).not.toMatch(/fetch\(|https?:\/\//u);
    expect(runtime).not.toMatch(/download\s*\(/u);
    expect(runtime).not.toMatch(/require\('https?'\)|from 'https?'/u);
    expect(runtime).toContain('readFileSync');

    for (const wasmPath of Object.values(resolveGrammarWasmPaths())) {
      expect(wasmPath).toContain('node_modules');
    }
  });

  it('extracts Python imports, calls, heritage and qualified names deterministically', async () => {
    const repo = root('py-detail');
    writeFiles(repo, {
      'src/service.py': [
        'import os',
        'import x as y',
        'from collections import defaultdict',
        'from utils import helper as h',
        '',
        'class Base:',
        '    def hello(self):',
        '        return 1',
        '',
        'class User(Base):',
        '    def greet(self):',
        '        return 2',
        '',
        'def outer():',
        '    def inner():',
        '        return 3',
        '    return inner()',
      ].join('\n'),
    });

    const indexed = await new RepositoryIndexer().index(PROJECT_ID, repo);
    const parsed = indexed.parsedFiles.find((file) => file.filePath === 'src/service.py');

    expect(parsed?.parser?.id).toBe('tree-sitter-python');
    expect(parsed?.parser?.structural).toBe(true);

    expect(parsed?.imports.map((item) => item.source)).toEqual(
      expect.arrayContaining(['os', 'x', 'collections', 'utils'])
    );

    const aliasedModule = parsed?.imports.find((item) => item.source === 'x');
    expect(aliasedModule?.bindings[0]).toMatchObject({ localName: 'y', importedName: 'x' });

    const plainFromImport = parsed?.imports.find((item) => item.source === 'collections');
    expect(plainFromImport?.bindings[0]).toMatchObject({
      localName: 'defaultdict',
      importedName: 'defaultdict',
    });

    const aliasedFromImport = parsed?.imports.find((item) => item.source === 'utils');
    expect(aliasedFromImport?.bindings[0]).toMatchObject({
      localName: 'h',
      importedName: 'helper',
    });

    expect(parsed?.heritage).toEqual([
      expect.objectContaining({ targetName: 'Base', type: 'INHERITS' }),
    ]);

    const symbols = indexed.graph.allSymbols(PROJECT_ID);
    const method = symbols.find((symbol) => symbol.name === 'greet');
    expect(method?.type).toBe('method');
    expect(method?.qualifiedName).toBe('User.greet');

    const nested = symbols.find((symbol) => symbol.name === 'inner');
    expect(nested?.qualifiedName).toBe('outer.inner');
    expect(parsed?.calls.some((call) => call.calleeName === 'inner')).toBe(true);
  });

  it('extracts Go imports, receiver methods, structs and interfaces', async () => {
    const repo = root('go-detail');
    writeFiles(repo, {
      'cmd/server.go': [
        'package main',
        '',
        'import (',
        '    "fmt"',
        '    f "os"',
        ')',
        '',
        'type Service struct {',
        '    Name string',
        '}',
        '',
        'type Runner interface {',
        '    Run() error',
        '}',
        '',
        'func (s *Service) Create() error {',
        '    fmt.Println("x")',
        '    return nil',
        '}',
      ].join('\n'),
    });

    const indexed = await new RepositoryIndexer().index(PROJECT_ID, repo);
    const parsed = indexed.parsedFiles.find((file) => file.filePath === 'cmd/server.go');

    expect(parsed?.imports.map((item) => item.source)).toEqual(
      expect.arrayContaining(['fmt', 'os'])
    );
    expect(parsed?.imports.find((item) => item.source === 'os')?.bindings[0]?.localName).toBe('f');

    const symbols = indexed.graph.allSymbols(PROJECT_ID);
    expect(symbols.find((symbol) => symbol.name === 'Service')?.metadata?.kind).toBe('struct');
    expect(symbols.find((symbol) => symbol.name === 'Runner')?.type).toBe('interface');

    const create = symbols.find((symbol) => symbol.name === 'Create');
    expect(create?.type).toBe('method');
    expect(create?.qualifiedName).toBe('Service.Create');
  });

  it('extracts Rust impl/trait relationships and methods', async () => {
    const repo = root('rust-detail');
    writeFiles(repo, {
      'src/lib.rs': [
        'use std::collections::HashMap;',
        'use foo::{a, b};',
        '',
        'struct User { name: String }',
        '',
        'trait Greet {',
        '    fn greet(&self);',
        '}',
        '',
        'impl Greet for User {',
        '    fn greet(&self) {}',
        '}',
        '',
        'impl User {',
        '    fn new() -> Self { User { name: String::new() } }',
        '}',
      ].join('\n'),
    });

    const indexed = await new RepositoryIndexer().index(PROJECT_ID, repo);
    const parsed = indexed.parsedFiles.find((file) => file.filePath === 'src/lib.rs');

    expect(parsed?.imports.map((item) => item.source)).toEqual(
      expect.arrayContaining(['std::collections', 'foo'])
    );

    // `impl Greet for User` must read as User IMPLEMENTS Greet, never inverted.
    expect(parsed?.heritage).toEqual([
      expect.objectContaining({ targetName: 'Greet', type: 'IMPLEMENTS' }),
    ]);

    const symbols = indexed.graph.allSymbols(PROJECT_ID);
    expect(symbols.find((symbol) => symbol.name === 'User')?.metadata?.kind).toBe('struct');
    expect(symbols.find((symbol) => symbol.name === 'Greet')?.type).toBe('interface');

    const newMethod = symbols.find((symbol) => symbol.name === 'new');
    expect(newMethod?.type).toBe('method');
    expect(newMethod?.qualifiedName).toBe('User::new');
  });

  it('extracts C includes, typedefs, structs, enums and functions', async () => {
    const repo = root('c-detail');
    writeFiles(repo, {
      'src/main.c': [
        '#include <stdio.h>',
        '#include "local.h"',
        '',
        'typedef int Count;',
        '',
        'struct Point { int x; int y; };',
        'enum Color { RED, GREEN };',
        '',
        'int add(int a, int b) {',
        '    return a + b;',
        '}',
        '',
        'int main() {',
        '    Count c = add(1, 2);',
        '    return c;',
        '}',
      ].join('\n'),
    });

    const indexed = await new RepositoryIndexer().index(PROJECT_ID, repo);
    const parsed = indexed.parsedFiles.find((file) => file.filePath === 'src/main.c');

    expect(parsed?.imports.map((item) => item.source)).toEqual(
      expect.arrayContaining(['stdio.h', 'local.h'])
    );

    const symbols = indexed.graph.allSymbols(PROJECT_ID);
    expect(symbols.find((symbol) => symbol.name === 'Count')?.metadata?.kind).toBe('typedef');
    expect(symbols.find((symbol) => symbol.name === 'Point')?.metadata?.kind).toBe('struct');
    expect(symbols.find((symbol) => symbol.name === 'Color')?.metadata?.kind).toBe('enum');
    expect(symbols.find((symbol) => symbol.name === 'add')?.type).toBe('function');
    expect(parsed?.calls.some((call) => call.calleeName === 'add')).toBe(true);
  });

  it('extracts C++ namespaces, inheritance, methods and member calls', async () => {
    const repo = root('cpp-detail');
    writeFiles(repo, {
      'src/service.cpp': [
        '#include <iostream>',
        '',
        'namespace api {',
        '',
        'class Service {',
        'public:',
        '    virtual ~Service() = default;',
        '    virtual bool create() = 0;',
        '};',
        '',
        'class UserService : public Service {',
        'public:',
        '    bool create() override;',
        '    void helper();',
        '};',
        '',
        'void free_func() {',
        '    UserService u;',
        '    u.helper();',
        '}',
        '',
        '}',
      ].join('\n'),
    });

    const indexed = await new RepositoryIndexer().index(PROJECT_ID, repo);
    const parsed = indexed.parsedFiles.find((file) => file.filePath === 'src/service.cpp');

    expect(parsed?.imports.map((item) => item.source)).toContain('iostream');
    expect(parsed?.heritage).toEqual([
      expect.objectContaining({ targetName: 'Service', type: 'INHERITS' }),
    ]);

    const symbols = indexed.graph.allSymbols(PROJECT_ID);
    const userService = symbols.find((symbol) => symbol.name === 'UserService');
    expect(userService?.type).toBe('class');
    expect(userService?.qualifiedName).toBe('api::UserService');
    expect(symbols.find((symbol) => symbol.name === 'free_func')?.qualifiedName).toBe(
      'api::free_func'
    );
    expect(
      parsed?.calls.some((call) => call.calleeName === 'helper' && call.qualifier === 'u')
    ).toBe(true);
  });

  it('keeps cross-file resolution pending for tree-sitter languages in coverage', async () => {
    const repo = root('coverage');
    writeFiles(repo, {
      'src/index.ts': 'export function tsFn() { return 1; }',
      'worker/job.py': 'def pyFn():\n    return 1\n',
      'cmd/server.go': 'package main\nfunc main() {}\n',
    });

    const indexed = await new RepositoryIndexer().index(PROJECT_ID, repo);
    const coverage = buildCoverage(indexed);

    const python = coverage.languages.find((item) => item.language === 'python');
    expect(python?.structural).toBe(true);
    expect(python?.parser).toBe('tree-sitter-python');
    expect(python?.crossFileResolution).toBe('pending');
    expect(python?.parseFailures).toBe(0);

    // Python is no longer lexical-only, but structural negative claims stay unsafe.
    expect(coverage.capabilities.call_graph.reasons).not.toContain('LEXICAL_ONLY_LANGUAGE');
    expect(coverage.capabilities.call_graph.reasons).toContain('CROSS_FILE_RESOLUTION_PENDING');
    expect(coverage.capabilities.call_graph.status).toBe('partial');
    expect(coverage.capabilities.call_graph.negativeClaimSafe).toBe(false);
    expect(coverage.capabilities.lexical_search.status).toBe('complete');
  });

  it('reports partial structural coverage when a parse tree has error nodes', async () => {
    const repo = root('partial-ast');
    writeFiles(repo, {
      'src/good.ts': 'export function good() { return 1; }',
      'src/broken.py': 'def broken(:\n    return 1\n',
    });

    const indexed = await new RepositoryIndexer().index(PROJECT_ID, repo);
    expect(indexed.structuralDiagnostics).toBeGreaterThanOrEqual(1);

    const parsed = indexed.parsedFiles.find((file) => file.filePath === 'src/broken.py');
    expect(parsed?.diagnostics?.[0]).toMatchObject({
      code: 'PARTIAL_AST',
      severity: 'warning',
      filePath: 'src/broken.py',
    });

    const coverage = buildCoverage(indexed);
    expect(coverage.capabilities.call_graph.status).toBe('partial');
    expect(coverage.capabilities.call_graph.negativeClaimSafe).toBe(false);
    expect(coverage.capabilities.call_graph.reasons).toContain('STRUCTURAL_PARSE_FAILED');

    // The lexical layer survives a structural parse problem.
    expect(coverage.capabilities.lexical_search.status).toBe('complete');
  });

  it('treats an unavailable structural parser as a coverage gap', async () => {
    const repo = root('parser-unavailable');
    writeFiles(repo, {
      'src/a.ts': 'export function a() { return 1; }',
      'src/main.py': 'def pyFn():\n    return 1\n',
    });

    const indexed = await new RepositoryIndexer().index(PROJECT_ID, repo);
    const coverage = buildCoverage(indexed, { structuralParserUnavailable: 1 });

    expect(coverage.capabilities.call_graph.reasons).toContain('STRUCTURAL_PARSER_UNAVAILABLE');
    expect(coverage.capabilities.call_graph.status).toBe('partial');
    expect(coverage.capabilities.call_graph.negativeClaimSafe).toBe(false);
  });

  it('invalidates the structural graph when the parser fingerprint changes', async () => {
    const repo = root('fingerprint');
    writeFiles(repo, {
      'src/a.ts': 'export function a() { return 1; }',
      'src/main.py': 'def pyFn():\n    return 1\n',
    });

    const storage = storageFor(join(repo, '.storage'));
    const indexer = new IncrementalRepositoryIndexer(storage);

    const first = await indexer.index(PROJECT_ID, repo);
    expect(first.fullRebuild).toBe(true);

    const second = await indexer.index(PROJECT_ID, repo);
    expect(second.fullRebuild).toBe(false);

    const graphStore = new PersistentCodeGraphStore(storage);
    const snapshot = await graphStore.load(PROJECT_ID);
    expect(snapshot?.parserFingerprint).toBe(computeParserFingerprint().digest);

    if (!snapshot) {
      throw new Error('expected an indexed graph snapshot');
    }

    await graphStore.save({ ...snapshot, parserFingerprint: 'stale-parser-fingerprint' });

    const third = await indexer.index(PROJECT_ID, repo);
    expect(third.fullRebuild).toBe(true);
  });

  it('incrementally re-indexes only the modified non-TypeScript file', async () => {
    const repo = root('incremental-nts');
    writeFiles(repo, {
      'src/a.py': 'def one():\n    return 1\n',
      'src/b.py': 'def two():\n    return 2\n',
    });

    const storage = storageFor(join(repo, '.storage'));
    const indexer = new IncrementalRepositoryIndexer(storage);

    await indexer.index(PROJECT_ID, repo);

    writeFileSync(join(repo, 'src/a.py'), 'def one():\n    return 11\n');

    const result = await indexer.index(PROJECT_ID, repo);
    expect(result.fullRebuild).toBe(false);
    expect(result.modified).toBe(1);
    expect(result.parsed).toBe(1);

    const graph = await new PersistentCodeGraphStore(storage).load(PROJECT_ID);
    expect(graph?.symbols.some((symbol) => symbol.name === 'one')).toBe(true);

    const freshness = await new GraphFreshnessChecker(storage).check(PROJECT_ID, repo);
    expect(freshness.checked).toBe(true);
    expect(freshness.stale).toBe(false);
  });

  it('preserves scanner security invariants for non-TypeScript sources', async () => {
    const repo = root('security');
    const outside = root('outside');

    writeFiles(repo, {
      'src/ok.py': 'def ok():\n    return 1\n',
      'node_modules/pkg/mod.py': 'def pkg():\n    return 1\n',
      'dist/bundle.py': 'def dist():\n    return 1\n',
    });

    writeFiles(outside, { 'secret.py': 'def leaked():\n    return 1\n' });

    let symlinkCreated = false;
    try {
      symlinkSync(join(outside, 'secret.py'), join(repo, 'src/linked.py'));
      symlinkCreated = true;
    } catch {
      symlinkCreated = false;
    }

    const indexed = await new RepositoryIndexer().index(PROJECT_ID, repo);

    expect(indexed.acceptedFiles).toContain('src/ok.py');
    expect(indexed.acceptedFiles).not.toContain('node_modules/pkg/mod.py');
    expect(indexed.acceptedFiles).not.toContain('dist/bundle.py');
    expect(indexed.acceptedFiles).not.toContain('src/linked.py');
    expect(indexed.parsedFiles.some((file) => file.filePath.includes('outside'))).toBe(false);

    if (symlinkCreated) {
      expect(indexed.acceptedFiles).not.toContain('src/linked.py');
    }
  });

  it('ships grammar assets and declares them as runtime dependencies', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

    for (const dependency of [
      'web-tree-sitter',
      'tree-sitter-python',
      'tree-sitter-go',
      'tree-sitter-rust',
      'tree-sitter-c',
      'tree-sitter-cpp',
    ]) {
      expect(packageJson.dependencies[dependency]).toBeDefined();
    }

    for (const asset of verifyGrammarAssets()) {
      expect(asset.available).toBe(true);
      expect(existsSync(asset.wasmPath)).toBe(true);
    }
  });

  it('indexes 100 mixed-language files within a bounded budget', async () => {
    const repo = root('perf');
    const templates: Array<(index: number) => [string, string]> = [
      (index) => [`src/m${index}.ts`, `export function t${index}() { return ${index}; }`],
      (index) => [`src/m${index}.py`, `def p${index}():\n    return ${index}\n`],
      (index) => [`src/m${index}.go`, `package m\nfunc g${index}() int { return ${index} }\n`],
      (index) => [`src/m${index}.rs`, `fn r${index}() -> i32 { ${index} }\n`],
      (index) => [`src/m${index}.c`, `int c${index}() { return ${index}; }\n`],
      (index) => [`src/m${index}.cpp`, `int x${index}() { return ${index}; }\n`],
    ];

    const files: Record<string, string> = {};
    for (let index = 0; index < 100; index += 1) {
      const [path, content] = templates[index % templates.length](index);
      files[path] = content;
    }
    writeFiles(repo, files);

    const started = Date.now();
    const indexed = await new RepositoryIndexer().index(PROJECT_ID, repo);
    const elapsed = Date.now() - started;

    expect(indexed.files).toBe(100);
    expect(indexed.parseFailures).toBe(0);
    expect(Object.keys(indexed.parserStats).sort()).toEqual([
      'c',
      'cpp',
      'go',
      'python',
      'rust',
      'typescript',
    ]);
    for (const stats of Object.values(indexed.parserStats)) {
      expect(stats.files).toBeGreaterThan(0);
      expect(stats.failures).toBe(0);
      expect(stats.durationMs).toBeGreaterThanOrEqual(0);
    }
    expect(elapsed).toBeLessThan(60_000);
  });

  it('emits the machine-readable certification marker', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    expect(packageJson.scripts['phase69:certify']).toContain(
      'phase69-multilanguage-structural-parser'
    );

    const docs = readFileSync('docs/architecture.md', 'utf8');
    expect(docs).toContain('Phase 69 — Multi-language Structural Parser Foundation');
    expect(docs).toContain('Parser fingerprint');

    const readme = readFileSync('README.md', 'utf8');
    expect(readme).toContain('Cross-file resolver');
    expect(readme).not.toContain('Tree-sitter is not implemented in this release');

    console.log('PHASE69_MULTILANGUAGE_STRUCTURAL_PARSER=PASS');
  });
});
