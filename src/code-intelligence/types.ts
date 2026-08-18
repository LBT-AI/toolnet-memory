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
}

export interface ParsedHeritage {
  fromId: string;
  targetName: string;

  type: 'INHERITS' | 'IMPLEMENTS';
}

export interface ParsedFile {
  filePath: string;

  symbols: CodeSymbol[];

  imports: ParsedImport[];

  calls: ParsedCall[];

  heritage: ParsedHeritage[];
}

export interface CodeGraphSnapshot {
  version: 1;
  projectId: string;
  updatedAt: string;

  files: number;

  symbols: CodeSymbol[];

  edges: GraphEdge[];
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

