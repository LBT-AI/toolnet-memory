import type { ParserLanguage } from './capabilities.js';
import type { ParsedFile } from '../types.js';

/**
 * Parser engine model.
 *
 * Structural parsing is provided by one of:
 * - typescript-compiler-api (TypeScript / JavaScript)
 * - tree-sitter (Python, Go, Rust, C, C++)
 *
 * Lexical-only files fall back to unsupported.
 */
export type ParserEngine =
  'typescript-compiler-api' | 'tree-sitter' | 'lexical-only' | 'unsupported';

export interface ParserDiagnostic {
  code: 'SYNTAX_ERROR' | 'PARTIAL_AST' | 'UNSUPPORTED_CONSTRUCT' | 'GRAMMAR_UNAVAILABLE';
  severity: 'warning' | 'error';
  filePath: string;
  line?: number;
  message?: string;
}

export interface StructuralParseInput {
  projectId: string;
  rootPath: string;
  filePath: string;
  source: string;
  language: ParserLanguage;
}

export interface StructuralParserCapability {
  parserId: string;
  engine: ParserEngine;
  structural: true;
  lexicalSearch: true;
}

/**
 * Structural parser adapter contract.
 *
 * All adapters normalize to a common ParsedFile contract.
 */
export interface StructuralParserAdapter {
  readonly id: string;
  readonly languages: readonly ParserLanguage[];
  readonly engine: ParserEngine;
  supports(language: ParserLanguage): boolean;
  parse(input: StructuralParseInput): Promise<ParsedFile>;
  capability(): StructuralParserCapability;
}
