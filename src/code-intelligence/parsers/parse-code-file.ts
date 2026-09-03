import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { CodeSymbol } from '../../core/types.js';
import type { ParsedFile } from '../types.js';
import { parserCapabilityForPath } from './capabilities.js';
import { parseTypeScriptFile } from './typescript-parser.js';

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
  if (capability.supported) {
    return parseTypeScriptFile(projectId, rootPath, filePath);
  }
  if (capability.lexicalSearch) {
    return parseLexicalOnlyFile(projectId, rootPath, filePath);
  }
  throw new Error(`Structural and lexical parsing unsupported for: ${filePath}`);
}
