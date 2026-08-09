export type ResolutionKind = 'CALL' | 'REFERENCE' | 'EXTENDS' | 'IMPLEMENTS';

export interface TypeResolution {
  id: string;
  projectId: string;

  kind: ResolutionKind;

  sourceFile: string;
  sourceLine: number;

  expression: string;

  targetFile?: string;
  targetLine?: number;

  targetName?: string;
  targetQualifiedName?: string;

  targetSymbolId?: string;

  confidence: 'exact' | 'high' | 'fallback';

  resolver: 'typescript-checker' | 'graph-fallback';
}

export interface TypeResolutionSnapshot {
  version: 1;

  projectId: string;
  updatedAt: string;

  total: number;

  exact: number;
  high: number;
  fallback: number;

  resolutions: TypeResolution[];
}
