import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import {
  parserCapabilityForPath,
  parserSupportsPath,
  parserLexicallySearchesPath,
  searchableParserExtensions,
} from '../../src/code-intelligence/parsers/capabilities.js';
import { parseCodeFile } from '../../src/code-intelligence/parsers/parse-code-file.js';
import { LSP_COMMANDS } from '../../src/code-intelligence/parsers/lsp-capabilities.js';
import { RepositoryIndexer } from '../../src/code-intelligence/indexer/repository-indexer.js';
import { SmartCodeChunker } from '../../src/code-intelligence/chunks/smart-chunker.js';

const roots: string[] = [];

function root(): string {
  const value = mkdtempSync(join(tmpdir(), 'toolnet-non-ts-'));
  roots.push(value);
  return value;
}

afterEach(() => {
  for (const value of roots.splice(0)) {
    rmSync(value, { recursive: true, force: true });
  }
});

describe('Phase 30 non-TypeScript foundation', () => {
  it('keeps Python structurally unsupported but lexically searchable', () => {
    const capability = parserCapabilityForPath('app/main.py');
    expect(capability?.supported).toBe(false);
    expect(capability?.structural).toBe(false);
    expect(capability?.lexicalSearch).toBe(true);
    expect(parserSupportsPath('app/main.py')).toBe(false);
    expect(parserLexicallySearchesPath('app/main.py')).toBe(true);
  });

  it('includes non-TS extensions in searchable extensions', () => {
    const extensions = searchableParserExtensions();
    for (const extension of ['.py', '.go', '.rs', '.c', '.cpp']) {
      expect(extensions).toContain(extension);
    }
  });

  it('creates only a truthful file node for Python', async () => {
    const repo = root();
    mkdirSync(join(repo, 'app'), { recursive: true });
    writeFileSync(
      join(repo, 'app', 'main.py'),
      ['def authenticate(user):', '    return user is not None', ''].join('\n')
    );
    const parsed = await parseCodeFile('project', repo, 'app/main.py');
    expect(parsed.symbols).toHaveLength(1);
    expect(parsed.symbols[0].type).toBe('file');
    expect(parsed.symbols[0].metadata?.structuralParser).toBe(false);
    expect(parsed.imports).toEqual([]);
    expect(parsed.calls).toEqual([]);
  });

  it('indexes Python as a file node without fake graph edges', async () => {
    const repo = root();
    writeFileSync(
      join(repo, 'auth.py'),
      ['def authentication_flow():', '    return "token"'].join('\n')
    );
    const result = await new RepositoryIndexer().index('project', repo);
    const files = result.graph.allSymbols('project').filter((symbol) => symbol.type === 'file');
    expect(files.map((symbol) => symbol.filePath)).toContain('auth.py');
    expect(result.graph.allEdges('project')).toHaveLength(0);
  });

  it('feeds lexical-only files into bounded chunks', async () => {
    const repo = root();
    writeFileSync(
      join(repo, 'service.go'),
      ['package service', '', 'func AuthenticationFlow() string {', '  return "bearer"', '}'].join(
        '\n'
      )
    );
    const parsed = await parseCodeFile('project', repo, 'service.go');
    const chunks = await new SmartCodeChunker().build('project', repo, parsed.symbols);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].content).toContain('AuthenticationFlow');
  });

  it('defines optional LSP servers without automatic download', () => {
    expect(LSP_COMMANDS.map((item) => item.command)).toEqual(
      expect.arrayContaining(['pyright-langserver', 'gopls', 'rust-analyzer', 'clangd'])
    );
  });
});
