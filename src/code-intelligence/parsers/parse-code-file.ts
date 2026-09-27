import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { CodeSymbol } from '../../core/types.js';
import type { ParsedFile } from '../types.js';
import { parserCapabilityForPath } from './capabilities.js';
import { parseTypeScriptFile } from './typescript-parser.js';
import { findStructuralAdapter, parseWithStructuralAdapter } from './registry.js';
import type { ParserLanguage } from './capabilities.js';

function makeId(projectId: string, value: string): string {
  return createHash('sha256').update(`${projectId}:${value}`).digest('hex').slice(0, 24);
}

async function parseLexicalOnlyFile(
  projectId: string,
  rootPath: string,
  filePath: string
): Promise<ParsedFile> {
  const capability = parserCapabilityForPath(filePath);
  if (!capability || !capability.lexicalSearch) {
    throw new Error(`Unsupported code file: ${filePath}`);
  }
  const text = await readFile(join(rootPath, filePath), 'utf8');
  const lineCount = Math.max(1, text.split(/\r?\n/u).length);
  const fileSymbol: CodeSymbol = {
    id: makeId(projectId, `file:${filePath}`),
    projectId,
    name: filePath,
    qualifiedName: filePath,
    type: 'file',
    filePath,
    startLine: 1,
    endLine: lineCount,
    metadata: {
      language: capability.language,
      structuralParser: false,
      lexicalSearch: true,
      lexicalEngine: capability.lexicalEngine,
      ...(capability.lspServer ? { lspServer: capability.lspServer } : {}),
    },
  };
  return {
    filePath,
    symbols: [fileSymbol],
    imports: [],
    calls: [],
    heritage: [],
  };
}

export async function parseCodeFile(
  projectId: string,
  rootPath: string,
  filePath: string
): Promise<ParsedFile> {
  const capability = parserCapabilityForPath(filePath);
  if (!capability) {
    throw new Error(`No parser capability for: ${filePath}`);
  }

  // TypeScript/JavaScript via TypeScript Compiler API.
  if (capability.engine === 'typescript-compiler-api') {
    return parseTypeScriptFile(projectId, rootPath, filePath);
  }

  // Tree-sitter structural languages (Python, Go, Rust, C, C++).
  if (capability.engine === 'tree-sitter') {
    const text = await readFile(join(rootPath, filePath), 'utf8');
    const parsed = await parseWithStructuralAdapter({
      projectId,
      rootPath,
      filePath,
      source: text,
      language: capability.language,
    });
    if (parsed) {
      return parsed;
    }
    // Grammar unavailable — fall back to lexical.
    return parseLexicalOnlyFile(projectId, rootPath, filePath);
  }

  // Lexical-only fallback.
  if (capability.lexicalSearch) {
    return parseLexicalOnlyFile(projectId, rootPath, filePath);
  }

  throw new Error(`Structural and lexical parsing unsupported for: ${filePath}`);
}

export async function parseCodeFileRaw(
  projectId: string,
  rootPath: string,
  filePath: string,
  source: string
): Promise<ParsedFile> {
  const capability = parserCapabilityForPath(filePath);
  if (!capability) {
    throw new Error(`No parser capability for: ${filePath}`);
  }

  if (capability.engine === 'typescript-compiler-api') {
    return parseTypeScriptFile(projectId, rootPath, filePath);
  }

  if (capability.engine === 'tree-sitter') {
    const parsed = await parseWithStructuralAdapter({
      projectId,
      rootPath,
      filePath,
      source,
      language: capability.language,
    });
    if (parsed) {
      return parsed;
    }
    return parseLexicalOnlyFile(projectId, rootPath, filePath);
  }

  if (capability.lexicalSearch) {
    return parseLexicalOnlyFile(projectId, rootPath, filePath);
  }

  throw new Error(`Structural and lexical parsing unsupported for: ${filePath}`);
}

export function getLanguageForPath(filePath: string): ParserLanguage | undefined {
  return parserCapabilityForPath(filePath)?.language;
}
