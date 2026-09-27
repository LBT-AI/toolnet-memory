import type { CodeSymbol, GraphEdge } from '../core/types.js';

export interface ImportBinding {
  localName: string;
  importedName: string;

  kind: 'named' | 'default' | 'namespace';
}

export interface ParsedImport {
  source: string;
  bindings: ImportBinding[];
}

export interface ParsedCall {
  callerId?: string;

  calleeName: string;
  qualifier?: string;

  line?: number;
  syntax?: {
    kind: 'direct' | 'member' | 'qualified' | 'indirect';
    language: string;
  };
}

export interface ParsedHeritage {
  fromId: string;
  targetName: string;

  type: 'INHERITS' | 'IMPLEMENTS';
}

export interface ParserMetadata {
  id: string;
  engine: string;
  language: string;
  structural: boolean;
}

export interface ParserDiagnostic {
  code: 'SYNTAX_ERROR' | 'PARTIAL_AST' | 'UNSUPPORTED_CONSTRUCT' | 'GRAMMAR_UNAVAILABLE';
  severity: 'warning' | 'error';
  filePath: string;
  line?: number;
  message?: string;
}

export interface ParsedFile {
  filePath: string;

  symbols: CodeSymbol[];

  imports: ParsedImport[];

  calls: ParsedCall[];

  heritage: ParsedHeritage[];
  parser?: ParserMetadata;
  diagnostics?: ParserDiagnostic[];
}

export interface CodeGraphSnapshot {
  version: 1;
  projectId: string;
  updatedAt: string;

  files: number;

  symbols: CodeSymbol[];

  edges: GraphEdge[];

  /*
   * Phase 69 additive: identity of the structural parser generation that
   * produced this graph. Optional so graph snapshots written before Phase 69
   * remain readable (readers must treat a missing value as unknown/stale).
   */
  parserFingerprint?: string;

  /*
   * Phase 71 additive: identity of the graph semantic rules that produced
   * these edges. A snapshot from another semantic generation is stale.
   */
  semanticFingerprint?: string;
}

/**
 * Unified progress callback interface for all indexing engines.
 *
 * CRITICAL: Progress must be REAL, based on actual work completed.
 * - current: actual units of work completed (files, symbols, chunks, etc.)
 * - total: total units of work to complete
 * - phase: optional sub-phase name for detailed tracking
 * - detail: optional human-readable detail (e.g., current file name)
 *
 * DO NOT fake progress based on elapsed time or arbitrary percentages.
 * If an engine cannot measure progress accurately, do not provide current/total.
 */
export interface StageProgressEvent {
  current: number;
  total: number;
  phase?: string;
  detail?: string;
}

export type StageProgressCallback = (event: StageProgressEvent) => void;
