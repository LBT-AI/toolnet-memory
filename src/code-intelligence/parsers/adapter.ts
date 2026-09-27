import { createHash } from 'node:crypto';

import type { ParserLanguage } from './capabilities.js';
import type { ParsedFile } from '../types.js';
import type { StructuralParserAdapter, StructuralParseInput, ParserEngine } from './engine.js';

/**
 * Symbol identity factory.
 *
 * Deterministic identity based on project, file, kind, qualifiedName,
 * and lexical parent — not line numbers.
 */
export function makeSymbolId(
  projectId: string,
  filePath: string,
  kind: string,
  qualifiedName: string
): string {
  return createHash('sha256')
    .update(`${projectId}:${filePath}:${kind}:${qualifiedName}`)
    .digest('hex')
    .slice(0, 24);
}

/**
 * File symbol factory.
 */
export function makeFileSymbol(
  projectId: string,
  filePath: string,
  language: ParserLanguage,
  lineCount: number
): ParsedFile['symbols'][number] {
  return {
    id: makeSymbolId(projectId, filePath, 'file', filePath),
    projectId,
    name: filePath,
    qualifiedName: filePath,
    type: 'file',
    filePath,
    startLine: 1,
    endLine: lineCount,
    metadata: {
      language,
      structuralParser: true,
      lexicalSearch: true,
    },
  };
}

/**
 * Add a symbol to the symbols array with deterministic ID.
 */
export function addSymbol(
  symbols: ParsedFile['symbols'],
  projectId: string,
  filePath: string,
  name: string,
  type: ParsedFile['symbols'][number]['type'],
  qualifiedName: string,
  startLine: number,
  endLine: number,
  metadata?: Record<string, unknown>
): string {
  const id = makeSymbolId(projectId, filePath, type, qualifiedName);
  symbols.push({
    id,
    projectId,
    name,
    qualifiedName,
    type,
    filePath,
    startLine,
    endLine,
    metadata,
  });
  return id;
}

/**
 * Base adapter class for structural parsers.
 */
export abstract class BaseStructuralAdapter implements StructuralParserAdapter {
  abstract readonly id: string;
  abstract readonly languages: readonly ParserLanguage[];
  abstract readonly engine: ParserEngine;

  supports(language: ParserLanguage): boolean {
    return this.languages.includes(language);
  }

  capability(): { parserId: string; engine: ParserEngine; structural: true; lexicalSearch: true } {
    return {
      parserId: this.id,
      engine: this.engine,
      structural: true,
      lexicalSearch: true,
    };
  }

  abstract parse(input: StructuralParseInput): Promise<ParsedFile>;
}
