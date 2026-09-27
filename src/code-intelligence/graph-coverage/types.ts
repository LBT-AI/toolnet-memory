/*
 * Phase 68 — Graph Coverage & Trust Contract
 *
 * Deterministic coverage state for the code graph.
 *
 * No LLM. No embeddings. No vector database. No confidence scores.
 * Trust decisions are derived only from scan/parse/index state,
 * parser capabilities, and CodeManifest freshness.
 */

export type GraphCoverageStatus = 'complete' | 'partial' | 'stale' | 'unavailable';

export type GraphCapability =
  | 'lexical_search'
  | 'symbol_graph'
  | 'call_graph'
  | 'dependency_graph'
  | 'architecture'
  | 'impact_analysis'
  | 'cross_service_graph';

export const GRAPH_CAPABILITIES: readonly GraphCapability[] = [
  'lexical_search',
  'symbol_graph',
  'call_graph',
  'dependency_graph',
  'architecture',
  'impact_analysis',
  'cross_service_graph',
];

/*
 * Structural capabilities require the complete symbol/call/dependency
 * graph. Lexical-only languages (Python, Go, Rust, C/C++) never satisfy
 * them today.
 */
export const STRUCTURAL_CAPABILITIES: readonly GraphCapability[] = [
  'symbol_graph',
  'call_graph',
  'dependency_graph',
  'architecture',
  'impact_analysis',
  'cross_service_graph',
];

export type CoverageReasonCode =
  | 'INDEX_MISSING'
  | 'COVERAGE_MISSING'
  | 'PARSE_FAILURE'
  | 'STRUCTURAL_PARSE_FAILED'
  | 'STRUCTURAL_PARSER_UNAVAILABLE'
  | 'LEXICAL_ONLY_LANGUAGE'
  | 'CROSS_FILE_RESOLUTION_PENDING'
  | 'UNSUPPORTED_STRUCTURAL_LANGUAGE'
  | 'SKIPPED_OVERSIZED_SOURCE'
  | 'SKIPPED_UNREADABLE_SOURCE'
  | 'SKIPPED_SENSITIVE_SOURCE'
  | 'SOURCE_ADDED_AFTER_INDEX'
  | 'SOURCE_MODIFIED_AFTER_INDEX'
  | 'SOURCE_DELETED_AFTER_INDEX'
  | 'INDEX_STALE'
  | 'UNRESOLVED_CALL_REFERENCE'
  | 'AMBIGUOUS_CALL_TARGET'
  | 'UNRESOLVED_IMPORT'
  | 'UNKNOWN_RECEIVER_TYPE'
  | 'INDIRECT_CALL_TARGET'
  /* Phase 72 cross-service trust reasons. */
  | 'UNSUPPORTED_SERVICE_FRAMEWORK'
  | 'UNRESOLVED_HTTP_REFERENCE'
  | 'AMBIGUOUS_ENDPOINT'
  | 'DYNAMIC_ENDPOINT'
  | 'UNRESOLVED_EVENT_CHANNEL'
  | 'CROSS_SERVICE_UNRESOLVED';

export interface LanguageFileBreakdown {
  language: string;
  files: number;
  structural: boolean;
  lexicalSearch: boolean;
  crossFileResolution: 'complete' | 'pending';
  /** Parser engine/adaptor id that handled this language. */
  parser: string;
  /** Structurally scoped files that failed to parse. */
  parseFailures: number;
}

export interface CapabilityCoverage {
  status: GraphCoverageStatus;
  negativeClaimSafe: boolean;
  reasons: CoverageReasonCode[];
}

export interface GraphCoverageSnapshot {
  version: 1;
  projectId: string;
  indexedAt: string;
  files: {
    accepted: number;
    indexed: number;
    structural: number;
    lexicalOnly: number;
    parseFailures: number;
  };
  scan: {
    skippedOversized: number;
    skippedUnreadable: number;
    skippedSensitive: number;
    skippedGenerated: number;
    skippedSymlinks: number;
    skippedIgnoredDirectories: number;
  };
  languages: LanguageFileBreakdown[];
  capabilities: Record<GraphCapability, CapabilityCoverage>;
  scope: {
    ignoredDirectories: string[];
    generatedFilesExcluded: boolean;
    symlinksExcluded: boolean;
    sensitiveFilesExcluded: boolean;
  };
}
