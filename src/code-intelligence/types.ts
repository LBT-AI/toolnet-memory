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
