import type { ParserLanguage } from '../parsers/capabilities.js';

export type ResolutionStatus = 'resolved' | 'ambiguous' | 'unresolved' | 'unsupported';

export type ResolutionKind =
  'call' | 'import' | 'type' | 'inheritance' | 'implementation' | 'member';

export interface SymbolReference {
  projectId: string;
  filePath: string;
  sourceSymbolId?: string;
  kind: ResolutionKind;
  name: string;
  qualifier?: string;
  moduleSpecifier?: string;
  line?: number;
  language: ParserLanguage;
}

export type ResolutionEvidence =
  | { kind: 'same_lexical_scope'; scopeSymbolId: string }
  | { kind: 'explicit_import'; module: string; importedName: string }
  | { kind: 'module_export'; moduleFile: string }
  | { kind: 'receiver_type'; typeSymbolId: string }
  | { kind: 'namespace_qualification'; symbolId: string }
  | { kind: 'inheritance_member'; typeSymbolId: string };

export type ResolutionReason =
  | 'NO_CANDIDATE'
  | 'MULTIPLE_CANDIDATES'
  | 'UNRESOLVED_IMPORT'
  | 'UNKNOWN_RECEIVER_TYPE'
  | 'DYNAMIC_REFERENCE'
  | 'INDIRECT_CALL'
  | 'UNSUPPORTED_LANGUAGE_FEATURE'
  | 'EXTERNAL_DEPENDENCY'
  | 'PARSE_PARTIAL';

export interface ResolutionResult {
  status: ResolutionStatus;
  targetSymbolId?: string;
  candidates?: string[];
  evidence: ResolutionEvidence[];
  reason?: ResolutionReason;
  kind?: ResolutionKind;
  sourceFile?: string;
  sourceLine?: number;
  expression?: string;
}

/**
 * Aggregated resolution quality used as graph-coverage evidence.
 *
 * External dependencies are deliberately excluded: importing `react` or
 * `fmt` is expected and must never degrade project coverage.
 */
export interface ResolutionCoverageInput {
  unresolvedCallReferences: number;
  ambiguousCallTargets: number;
  unknownReceiverTypes: number;
  unresolvedImports: number;
  indirectCalls: number;
}

export interface ResolutionSnapshot {
  version: 1;
  projectId: string;
  generation: string;
  resolvedAt: string;
  fingerprint: string;
  stats: {
    total: number;
    resolved: number;
    ambiguous: number;
    unresolved: number;
    external: number;
  };
  byLanguage: Record<
    string,
    {
      total: number;
      resolved: number;
      ambiguous: number;
      unresolved: number;
    }
  >;
  results: ResolutionResult[];
  unresolvedReferences?: Array<{
    projectId: string;
    filePath: string;
    sourceSymbolId?: string;
    kind: ResolutionKind;
    name: string;
    qualifier?: string;
    line?: number;
    reason: ResolutionReason;
  }>;
}

export type TypeResolution = {
  id: string;
  projectId: string;
  kind: ResolutionKind;
  /**
   * Original `kind` value observed before normalization. Set only when a
   * legacy snapshot (legacy vocabulary) was read, so nothing is lost.
   */
  legacyKind?: string;
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
};

export type TypeResolutionSnapshot = {
  /** On-disk format marker. Shared with the legacy vocabulary; the legacy
   *  kind domain is normalized on read (see `legacy.ts`). */
  version: 1;
  projectId: string;
  updatedAt: string;
  total: number;
  exact: number;
  high: number;
  fallback: number;
  resolutions: TypeResolution[];
};
