/*
 * Phase 74 — ToolNet Graph Query Language (TGQL).
 *
 * A bounded, deterministic, READ-ONLY graph query subset. It is inspired by
 * Cypher syntax but is not Cypher: the supported clause set is deliberately
 * small and unsupported constructs fail clearly.
 *
 * No LLM. No embeddings. No vector database. No eval. No graph mutation.
 */

import type { CodeSymbol } from '../../core/types.js';

import type { GraphEdgeType } from '../graph/edge-semantic-registry.js';
import type { CrossProjectEdgeType } from '../fleet/types.js';
import type { GraphCapability, GraphCoverageStatus } from '../graph-coverage/types.js';

/* ------------------------------------------------------------------ *
 * Scope
 * ------------------------------------------------------------------ */

export const QUERY_SCOPES = ['project', 'fleet'] as const;

export type QueryScope = (typeof QUERY_SCOPES)[number];

/* ------------------------------------------------------------------ *
 * Node model
 * ------------------------------------------------------------------ */

export const QUERY_NODE_TYPES = [
  /* Project-scope symbol node types. */
  'File',
  'Module',
  'Class',
  'Interface',
  'Function',
  'Method',
  'Route',
  'Property',
  'Service',
  'EventChannel',
  /* Fleet-scope resource node types. */
  'Project',
  'Package',
  'HttpCall',
  'PackageDependency',
] as const;

export type QueryNodeType = (typeof QUERY_NODE_TYPES)[number];

/**
 * Canonical symbol type -> query node type.
 *
 * This is the single mapping used by both the schema registry and the project
 * adapter; node types are never re-declared per call site.
 */
export const SYMBOL_NODE_TYPE: Readonly<Record<CodeSymbol['type'], QueryNodeType>> = {
  file: 'File',
  module: 'Module',
  class: 'Class',
  interface: 'Interface',
  function: 'Function',
  method: 'Method',
  route: 'Route',
  property: 'Property',
  service: 'Service',
  event: 'EventChannel',
};

export type QueryPropertyValue = string | number | boolean;

export interface QueryNode {
  id: string;
  type: QueryNodeType;
  scope: QueryScope;

  name: string;
  qualifiedName?: string;
  filePath?: string;
  line?: number;
  language?: string;

  /** Owning project for fleet resources; current project otherwise. */
  projectId?: string;

  /** Allowlisted, sanitized properties only. */
  properties: Record<string, QueryPropertyValue>;
}

/* ------------------------------------------------------------------ *
 * Edge model
 * ------------------------------------------------------------------ */

export type QueryEdgeType = GraphEdgeType | CrossProjectEdgeType;

export interface QueryEdgeEvidence {
  kind: string;
  detail?: string;
}

export interface QueryEdge {
  id: string;
  type: QueryEdgeType;
  scope: QueryScope;

  from: string;
  to: string;

  /** Project graph that owns the edge (project scope) / originating project. */
  projectId?: string;

  /* Fleet-only. */
  fromProjectId?: string;
  toProjectId?: string;
  protocol?: string;

  /* Phase 71 provenance, preserved verbatim. */
  origin?: string;
  evidence?: string[];
  certainty?: 'deterministic' | 'reference';

  crossEvidence?: QueryEdgeEvidence[];

  generation?: string;
  filePath?: string;
  line?: number;
  language?: string;
}

/* ------------------------------------------------------------------ *
 * Parameters
 * ------------------------------------------------------------------ */

export type QueryParameter = string | number | boolean | string[];

export type QueryParameters = Record<string, QueryParameter>;

/* ------------------------------------------------------------------ *
 * AST
 * ------------------------------------------------------------------ */

export interface NodePattern {
  alias?: string;
  type?: QueryNodeType;
  /** True for `(f)` with no alias; such a node can never be projected. */
  anonymous: boolean;
}

export interface EdgePattern {
  /** Empty means any edge type. */
  types: QueryEdgeType[];
  direction: 'outgoing' | 'incoming' | 'undirected';
  minHops: number;
  maxHops: number;
  /** True for `[:CALLS*1..3]`. */
  variableLength: boolean;
}

export interface PatternElement {
  node: NodePattern;
  /** Edge to the next node; absent on the last element. */
  edge?: EdgePattern;
}

export interface MatchPattern {
  /** Path alias from `MATCH p = ...`. */
  pathAlias?: string;
  elements: PatternElement[];
}

export type QueryOperand =
  | { kind: 'property'; variable: string; property: string }
  | { kind: 'literal'; value: string | number | boolean | null }
  | { kind: 'parameter'; name: string };

export type QueryExpression =
  | {
      kind: 'comparison';
      op: '=' | '!=' | '<' | '<=' | '>' | '>=';
      left: QueryOperand;
      right: QueryOperand;
    }
  | { kind: 'logical'; op: 'AND' | 'OR'; operands: QueryExpression[] }
  | { kind: 'not'; operand: QueryExpression }
  | { kind: 'in'; left: QueryOperand; values: QueryOperand[] }
  | { kind: 'null'; operand: QueryOperand; negated: boolean }
  | {
      kind: 'string';
      op: 'STARTS WITH' | 'ENDS WITH' | 'CONTAINS';
      left: QueryOperand;
      right: QueryOperand;
    };

export interface ProjectionItem {
  /** Node/edge/path variable being projected. */
  variable: string;
  /** Optional property of that variable. */
  property?: string;
  /** Output column name. */
  alias: string;
}

export interface OrderByItem {
  variable: string;
  property?: string;
  direction: 'ASC' | 'DESC';
}

export interface QueryAst {
  distinct: boolean;
  match: MatchPattern[];
  where?: QueryExpression;
  projection: ProjectionItem[];
  orderBy: OrderByItem[];
  limit?: number;
  skip?: number;
}

/* ------------------------------------------------------------------ *
 * Errors
 * ------------------------------------------------------------------ */

export type QueryErrorCode =
  | 'QUERY_SYNTAX_ERROR'
  | 'UNKNOWN_NODE_TYPE'
  | 'UNKNOWN_EDGE_TYPE'
  | 'UNSUPPORTED_CLAUSE'
  | 'INVALID_PROPERTY'
  | 'READ_ONLY_VIOLATION'
  | 'QUERY_TOO_COMPLEX'
  | 'QUERY_LIMIT_EXCEEDED'
  | 'UNSUPPORTED_SCOPE'
  | 'CURSOR_INVALID'
  | 'CURSOR_STALE'
  | 'QUERY_EXECUTION_ABORTED';

export class QueryError extends Error {
  readonly code: QueryErrorCode;
  readonly line?: number;
  readonly column?: number;

  constructor(code: QueryErrorCode, message: string, location?: { line: number; column: number }) {
    super(message);
    this.name = 'QueryError';
    this.code = code;
    if (location) {
      this.line = location.line;
      this.column = location.column;
    }
  }
}

/* ------------------------------------------------------------------ *
 * Result model
 * ------------------------------------------------------------------ */

export interface QueryNodeOutput {
  id: string;
  type: QueryNodeType;
  scope: QueryScope;
  name: string;
  qualifiedName?: string;
  filePath?: string;
  line?: number;
  language?: string;
  projectId?: string;
}

export interface QueryEdgeOutput {
  id: string;
  type: QueryEdgeType;
  scope: QueryScope;
  from: string;
  to: string;
  projectId?: string;
  fromProjectId?: string;
  toProjectId?: string;
  protocol?: string;
  origin?: string;
  evidence?: string[];
  certainty?: 'deterministic' | 'reference';
  crossEvidence?: QueryEdgeEvidence[];
}

export interface QueryPathOutput {
  nodes: QueryNodeOutput[];
  edges: QueryEdgeOutput[];
}

export type QueryRowValue =
  string | number | boolean | null | QueryNodeOutput | QueryEdgeOutput | QueryPathOutput;

export type QueryRow = Record<string, QueryRowValue>;

export interface QueryDiagnostic {
  code: QueryErrorCode;
  message: string;
  line?: number;
  column?: number;
}

export interface QueryCoverageCapability {
  status: GraphCoverageStatus;
  negativeClaimSafe: boolean;
  reasons: string[];
}

export interface QueryFleetCoverage {
  status: GraphCoverageStatus;
  negativeClaimSafe: boolean;
  reasons: string[];
  projects: string[];
  missingProjects: string[];
  staleProjects: string[];
}

export interface QueryCoverage {
  status: GraphCoverageStatus;
  negativeClaimSafe: boolean;
  capabilities: Record<string, QueryCoverageCapability>;
  fleet?: QueryFleetCoverage;
  impactMayBeUnderreported?: boolean;
}

export interface QueryGeneration {
  project?: string;
  fleet?: string;
}

export interface QueryPlan {
  scope: QueryScope;
  startingIndex: string;
  edgeTypes: QueryEdgeType[];
  patternCount: number;
  maxDepth: number;
  estimatedOperations: number;
  estimatedExpansions: number;
  requiredCapabilities: GraphCapability[];
  usesIndex: boolean;
}

export interface QueryResult {
  schemaVersion: number;
  queryFingerprint: string;
  schemaFingerprint: string;

  scope: QueryScope;
  generation: QueryGeneration;

  columns: string[];
  rows: QueryRow[];
  rowCount: number;
  truncated: boolean;
  nextCursor?: string;

  coverage?: QueryCoverage;
  plan?: QueryPlan;
  diagnostics?: QueryDiagnostic[];
  explain?: boolean;
}
