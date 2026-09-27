/*
 * Phase 77 — CodeIntelligenceRuntime.
 *
 * MCP tools depend on this interface instead of knowing whether the shared
 * runtime is served by the local coordination daemon or by an in-process
 * fallback. That keeps `if (daemon) ... else ...` out of every tool.
 */

import type { QueryResult, QueryScope } from '../query-v2/types.js';

import type { EvidenceBundle, EvidenceRequest } from '../evidence/types.js';

import type { ChangeAnalysisRequest, ChangeIntelligenceReport } from '../change/types.js';

import type { ContractAnalysisRequest, ContractIntelligenceReport } from '../contract/types.js';

import type { ReleaseAnalysisInput, ReleaseReadinessReport } from '../release/types.js';

import type {
  RunSelectedTestsRequest,
  TestSelection,
  TestSelectionRequest,
  TestVerificationReport,
} from '../test-intelligence/types.js';

import type {
  FleetParticipantRef,
  RuntimeTraceImportInput,
  RuntimeTraceImportResult,
} from '../runtime-trace/types.js';

export interface RuntimeProjectRef {
  id: string;
  name: string;
  rootPath: string;
  remote?: string;
}

export interface RuntimeReadiness {
  generation?: string;
  via: 'local' | 'hydrated' | 'indexed';
}

export interface RuntimeQueryInput {
  query: string;
  scope?: QueryScope;
  parameters?: Record<string, unknown>;
  limit?: number;
  cursor?: string;
  explain?: boolean;
}

export interface RuntimeTraceIngestInput {
  projectId: string;
  /** Generation the observations are validated against. */
  graphGeneration?: string;
  input: RuntimeTraceImportInput;
  /** Registered Fleet participants, for exact cross-project identity only. */
  fleetParticipants?: FleetParticipantRef[];
  now?: () => Date;
}

/**
 * Phase 80 change-intelligence input.
 *
 * The change mode/revisions are explicit; an explicit patch payload is passed
 * verbatim (never a filesystem path). Reading a live git working tree happens
 * inside the runtime against the project root, read-only.
 */
export interface RuntimeChangeInput {
  request: ChangeAnalysisRequest;
  /** Explicit patch payload for `mode: "patch"`. */
  patch?: string;
}

/**
 * Phase 81 contract-intelligence input.
 *
 * The Phase 80 change paths plus read-only baseline/candidate content are read
 * inside the runtime against the project root; nothing is written and no remote
 * ref is fetched.
 */
export interface RuntimeContractInput {
  request: ContractAnalysisRequest;
  /** The Phase 80 change input describing the change (never re-parsed). */
  change: ChangeAnalysisRequest;
  /** Explicit patch payload for `change.mode: "patch"`. */
  patch?: string;
  /** Baseline revision for read-only `git show`; defaults to HEAD. */
  baseRevision?: string;
}

/**
 * Phase 82 test-selection input.
 *
 * The Phase 80 change input is reused (never re-parsed) and an optional Phase 81
 * contract analysis may be attached for contract-test selection.
 */
export interface RuntimeTestSelectionInput {
  request: TestSelectionRequest;
  change: ChangeAnalysisRequest;
  contract?: ContractAnalysisRequest;
  /** Explicit patch payload for `change.mode: "patch"`. */
  patch?: string;
}

/** Phase 82 explicit test-execution input. */
export interface RuntimeTestRunInput {
  request: RunSelectedTestsRequest;
}

export interface RuntimeProjectStatus {
  projectId: string;
  state: string;
  generation?: string;
  resident: boolean;
}

export interface CodeIntelligenceRuntime {
  readonly kind: 'local' | 'daemon';

  /** Ensure the project's shared derived runtime is usable. */
  ensureProjectReady(project: RuntimeProjectRef): Promise<RuntimeReadiness>;

  /** Execute a bounded Phase 74 query against the shared runtime. */
  query(project: RuntimeProjectRef, input: RuntimeQueryInput): Promise<QueryResult>;

  /**
   * Phase 78: run a profile-driven evidence request against the shared runtime.
   *
   * Evidence is derived state; the runtime only reads its own project snapshot
   * and never mutates Memory, Tasks or ADR authority.
   */
  evidence(project: RuntimeProjectRef, request: EvidenceRequest): Promise<EvidenceBundle>;

  /**
   * Phase 79: import an explicit runtime trace session into the project's
   * derived trace evidence store.
   *
   * Traces are derived, observational state. Importing one never mutates the
   * static graph, Memory, Tasks, Sessions or ADRs, and concurrent identical
   * imports are coordinated so observation counts are never inflated.
   */
  ingestTraces(
    project: RuntimeProjectRef,
    input: RuntimeTraceIngestInput
  ): Promise<RuntimeTraceImportResult>;

  /**
   * Phase 80: run a deterministic change-intelligence analysis against the
   * shared project runtime. Derived analysis only; it never mutates the graph,
   * never executes source or tests, and never publishes an artifact.
   */
  change(project: RuntimeProjectRef, input: RuntimeChangeInput): Promise<ChangeIntelligenceReport>;

  /**
   * Phase 81: run a deterministic contract-compatibility analysis against the
   * shared project runtime. Derived analysis only; it never mutates the graph,
   * never rewrites source/schema, never runs protoc/npm and never publishes an
   * artifact.
   */
  contract(
    project: RuntimeProjectRef,
    input: RuntimeContractInput
  ): Promise<ContractIntelligenceReport>;

  /**
   * Phase 82: compute a deterministic change-to-test selection. Read-only; it
   * never executes a test.
   */
  testSelection(
    project: RuntimeProjectRef,
    input: RuntimeTestSelectionInput
  ): Promise<TestSelection>;

  /**
   * Phase 82: explicitly execute a selection. Runs only through validated
   * framework adapters; never an arbitrary command.
   */
  runTests(project: RuntimeProjectRef, input: RuntimeTestRunInput): Promise<TestVerificationReport>;

  /** Phase 82: bounded read-only status of derived test-run evidence. */
  testStatus(project: RuntimeProjectRef, limit?: number): Promise<unknown>;

  /**
   * Phase 83: run deterministic release-readiness analysis for a project root.
   * Read-only: it never commits, tags, bumps a version or publishes, and it
   * never mutates Memory, Tasks, ADRs, the graph or artifacts.
   */
  release(project: RuntimeProjectRef, input: ReleaseAnalysisInput): Promise<ReleaseReadinessReport>;

  /** Bounded project/daemon status. */
  status(project?: RuntimeProjectRef): Promise<unknown>;

  close(): Promise<void>;
}
