/*
 * Phase 77 — Local Coordination Daemon.
 *
 * The daemon owns RUNTIME COORDINATION ONLY.
 *
 * It is never an authority for Memory, Tasks, Sessions, the Task WAL, ADRs, the
 * Wiki or the Project Manual. Those remain in their persistent project stores.
 * Killing the daemon must always be recoverable from source + persistent
 * authority + derived artifacts.
 */

import type {
  QueryGeneration,
  QueryResult,
  QueryScope,
} from '../code-intelligence/query-v2/types.js';

import type { EvidenceBundle, EvidenceRequest } from '../code-intelligence/evidence/types.js';

import type { RuntimeTraceImportResult } from '../code-intelligence/runtime-trace/types.js';

import type {
  RuntimeChangeInput,
  RuntimeContractInput,
  RuntimeTestRunInput,
  RuntimeTestSelectionInput,
  RuntimeTraceIngestInput,
} from '../code-intelligence/runtime/types.js';

import type { ChangeIntelligenceReport } from '../code-intelligence/change/types.js';

import type { ContractIntelligenceReport } from '../code-intelligence/contract/types.js';

import type {
  TestSelection,
  TestVerificationReport,
} from '../code-intelligence/test-intelligence/types.js';

/** Explicit IPC protocol version. A mismatch is fatal, never best-effort. */
export const DAEMON_PROTOCOL_VERSION = 1;

/** Daemon runtime state directory layout version. */
export const DAEMON_RUNTIME_LAYOUT_VERSION = 1;

export type DaemonDiagnosticCode =
  | 'DAEMON_NOT_RUNNING'
  | 'DAEMON_BUILD_MISMATCH'
  | 'DAEMON_PROTOCOL_MISMATCH'
  | 'DAEMON_LOCKED'
  | 'DAEMON_START_FAILED'
  | 'DAEMON_RUNTIME_DIR_INSECURE'
  | 'DAEMON_SHUTTING_DOWN'
  | 'DAEMON_UPGRADE_BLOCKED_ACTIVE_SESSIONS'
  | 'PROJECT_NOT_ATTACHED'
  | 'PROJECT_RUNTIME_FAILED'
  | 'INDEX_ALREADY_RUNNING'
  | 'INDEX_CANCELLED'
  | 'SOURCE_CHANGED_DURING_INDEX'
  | 'ARTIFACT_HYDRATION_FAILED'
  | 'CLIENT_LIMIT_EXCEEDED'
  | 'REQUEST_LIMIT_EXCEEDED'
  | 'MESSAGE_TOO_LARGE'
  | 'PROTOCOL_MALFORMED'
  | 'SESSION_UNKNOWN'
  | 'INVALID_REQUEST'
  | 'QUERY_FAILED';

export class DaemonError extends Error {
  constructor(
    public readonly code: DaemonDiagnosticCode,
    message: string
  ) {
    super(message);
    this.name = 'DaemonError';
  }
}

/**
 * Runtime build fingerprint.
 *
 * Package version alone is NOT sufficient: during phased development the source
 * tree can carry uncommitted work while the package version stays unchanged.
 * Admission therefore compares a deterministic digest over the protocol version,
 * the packaged runtime marker and every schema fingerprint the runtime depends
 * on.
 */
export interface DaemonBuildFingerprint {
  protocolVersion: number;
  /** Resolved by src/runtime/build-identity.ts: one version truth per runtime. */
  packageVersion: string;
  /** Digest over the runtime marker + all schema fingerprints. */
  buildHash: string;
  schema: {
    parser: string;
    resolver: string;
    graphSemantics: string;
    querySchema: string;
    artifactSchema: string;
  };
  runtimeRoot: string;
}

export interface DaemonInstanceInfo {
  instanceId: string;
  pid: number;
  startedAt: string;
  socketPath: string;
  runtimeRoot: string;
  protocolVersion: number;
  buildHash: string;
}

/** A project as the daemon sees it. Never carries credentials. */
export interface DaemonProjectRef {
  id: string;
  name: string;
  rootPath: string;
  remote?: string;
}

export interface DaemonClientIdentity {
  /** Stable client type key (e.g. `mcp`, `cli`, `opencode`). Never a display name. */
  type: string;
  pid?: number;
  label?: string;
}

export interface DaemonSessionRecord {
  sessionId: string;
  client: DaemonClientIdentity;
  startedAt: string;
  lastHeartbeatAt: string;
  fingerprint: string;
  /** Projects this session is attached to. */
  projects: string[];
}

export type ProjectRuntimeState = 'idle' | 'hydrating' | 'ready' | 'indexing' | 'stale' | 'failed';

export interface DaemonProjectStatus {
  projectId: string;
  state: ProjectRuntimeState;
  generation?: string;
  sourceManifestHash?: string;
  /** Session ids currently attached. */
  sessions: string[];
  watcherActive: boolean;
  activeJobId?: string;
  resident: boolean;
  updatedAt: string;
  diagnostics: DaemonDiagnosticCode[];
}

export interface DaemonStatusReport {
  instance: DaemonInstanceInfo;
  uptimeMs: number;
  fingerprint: DaemonBuildFingerprint;
  sessions: number;
  projects: number;
  activeJobs: number;
  residentProjects: string[];
  watchers: number;
  draining: boolean;
  /** Progress events dropped under backpressure (responses are never dropped). */
  droppedProgress: number;
  memory: {
    rssBytes: number;
    heapUsedBytes: number;
  };
  diagnostics: DaemonDiagnosticCode[];
}

export type DaemonProgressPayload =
  | {
      kind: 'stage';
      stage: string;
      state: 'start' | 'complete';
      durationMs?: number;
    }
  | {
      kind: 'source';
      phase: 'scan' | 'parse';
      current: number;
      total: number;
      file?: string;
    }
  | {
      kind: 'stage-progress';
      stage: string;
      current: number;
      total: number;
      phase?: string;
      detail?: string;
    }
  | {
      kind: 'job';
      projectId: string;
      state: 'started' | 'complete' | 'failed' | 'cancelled';
      error?: string;
    };

export type DaemonProgressEvent = DaemonProgressPayload & { jobId: string };

/* ------------------------------------------------------------------ *
 * Requests
 * ------------------------------------------------------------------ */

export interface DaemonHelloRequest {
  type: 'hello';
  protocolVersion: number;
  fingerprint: string;
  client: DaemonClientIdentity;
}

export interface DaemonHeartbeatRequest {
  type: 'heartbeat';
  sessionId: string;
}

export interface DaemonAttachProjectRequest {
  type: 'attach_project';
  sessionId: string;
  project: DaemonProjectRef;
}

export interface DaemonDetachProjectRequest {
  type: 'detach_project';
  sessionId: string;
  projectId: string;
}

export interface DaemonProjectStatusRequest {
  type: 'project_status';
  sessionId: string;
  project: DaemonProjectRef;
}

export interface DaemonEnsureReadyRequest {
  type: 'ensure_ready';
  sessionId: string;
  project: DaemonProjectRef;
}

export interface DaemonQueueIndexRequest {
  type: 'index_project';
  sessionId: string;
  project: DaemonProjectRef;
}

export interface DaemonArtifactStatusRequest {
  type: 'artifact_status';
  sessionId: string;
  project: DaemonProjectRef;
}

export interface DaemonHydrateRequest {
  type: 'hydrate_artifact';
  sessionId: string;
  project: DaemonProjectRef;
}

export interface DaemonQueryRequest {
  type: 'query';
  sessionId: string;
  project: DaemonProjectRef;
  query: string;
  scope?: QueryScope;
  parameters?: Record<string, unknown>;
  limit?: number;
  cursor?: string;
  explain?: boolean;
}

export interface DaemonEvidenceRequest {
  type: 'evidence';
  sessionId: string;
  project: DaemonProjectRef;
  /** Explicit Phase 78 evidence request; never inferred from prose. */
  evidence: EvidenceRequest;
}

export interface DaemonIngestTracesRequest {
  type: 'ingest_traces';
  sessionId: string;
  project: DaemonProjectRef;
  /** Explicit Phase 79 trace ingest request; never inferred, never auto-collected. */
  ingest: RuntimeTraceIngestInput;
}

export interface DaemonChangeRequest {
  type: 'change';
  sessionId: string;
  project: DaemonProjectRef;
  /** Explicit Phase 80 change analysis request; never inferred from prose. */
  change: RuntimeChangeInput;
}

export interface DaemonContractRequest {
  type: 'contract';
  sessionId: string;
  project: DaemonProjectRef;
  /** Explicit Phase 81 contract analysis request; never inferred from prose. */
  contract: RuntimeContractInput;
}

export interface DaemonTestSelectionRequest {
  type: 'test_selection';
  sessionId: string;
  project: DaemonProjectRef;
  /** Explicit Phase 82 selection request; never inferred from prose. */
  selection: RuntimeTestSelectionInput;
}

export interface DaemonRunTestsRequest {
  type: 'run_tests';
  sessionId: string;
  project: DaemonProjectRef;
  /**
   * Explicit Phase 82 execution request. It can only reference a selection that
   * this project runtime computed; it never carries a command.
   */
  run: RuntimeTestRunInput;
}

export interface DaemonTestStatusRequest {
  type: 'test_status';
  sessionId: string;
  project: DaemonProjectRef;
  limit?: number;
}

export interface DaemonSubscribeRequest {
  type: 'subscribe_progress';
  sessionId: string;
  jobId: string;
}

export interface DaemonUnsubscribeRequest {
  type: 'unsubscribe_progress';
  sessionId: string;
  jobId: string;
}

export interface DaemonCancelRequest {
  type: 'cancel_job';
  sessionId: string;
  jobId: string;
}

export interface DaemonStatusRequest {
  type: 'daemon_status';
}

export interface DaemonShutdownRequest {
  type: 'shutdown';
  sessionId?: string;
  force?: boolean;
}

export type DaemonRequest =
  | DaemonHelloRequest
  | DaemonHeartbeatRequest
  | DaemonAttachProjectRequest
  | DaemonDetachProjectRequest
  | DaemonProjectStatusRequest
  | DaemonEnsureReadyRequest
  | DaemonQueueIndexRequest
  | DaemonArtifactStatusRequest
  | DaemonHydrateRequest
  | DaemonQueryRequest
  | DaemonEvidenceRequest
  | DaemonIngestTracesRequest
  | DaemonChangeRequest
  | DaemonContractRequest
  | DaemonTestSelectionRequest
  | DaemonRunTestsRequest
  | DaemonTestStatusRequest
  | DaemonSubscribeRequest
  | DaemonUnsubscribeRequest
  | DaemonCancelRequest
  | DaemonStatusRequest
  | DaemonShutdownRequest;

/** A framed envelope: every request carries a client-generated id. */
export interface DaemonRequestEnvelope {
  requestId: string;
  request: DaemonRequest;
}

/* ------------------------------------------------------------------ *
 * Responses
 * ------------------------------------------------------------------ */

export interface DaemonErrorResponse {
  ok: false;
  code: DaemonDiagnosticCode;
  error: string;
  /** Present when the failure is a build/protocol admission rejection. */
  daemonBuildHash?: string;
  clientBuildHash?: string;
}

export interface DaemonHelloResponse {
  ok: true;
  type: 'hello';
  sessionId: string;
  instance: DaemonInstanceInfo;
  fingerprint: DaemonBuildFingerprint;
  heartbeatIntervalMs: number;
}

export interface DaemonAckResponse {
  ok: true;
  type: 'ack';
}

export interface DaemonProjectStatusResponse {
  ok: true;
  type: 'project_status';
  status: DaemonProjectStatus;
}

export interface DaemonJobResponse {
  ok: true;
  type: 'job';
  jobId: string;
  /** Resolves when the shared job settles (already-running jobs return the same id). */
  reused: boolean;
}

export interface DaemonJobResultResponse {
  ok: true;
  type: 'job_result';
  jobId: string;
  jobKind: 'index' | 'hydrate';
  projectId: string;
  state: 'complete' | 'cancelled';
  generation?: string;
  /** Index result summary. */
  files?: number;
  symbols?: number;
  edges?: number;
  /** Hydration result summary. */
  hidrated?: boolean;
  fleetRepinned?: boolean;
}

export interface DaemonQueryResponse {
  ok: true;
  type: 'query';
  result: QueryResult;
}

export interface DaemonEvidenceResponse {
  ok: true;
  type: 'evidence';
  bundle: EvidenceBundle;
}

export interface DaemonIngestTracesResponse {
  ok: true;
  type: 'ingest_traces';
  result: RuntimeTraceImportResult;
}

export interface DaemonChangeResponse {
  ok: true;
  type: 'change';
  report: ChangeIntelligenceReport;
}

export interface DaemonContractResponse {
  ok: true;
  type: 'contract';
  report: ContractIntelligenceReport;
}

export interface DaemonTestSelectionResponse {
  ok: true;
  type: 'test_selection';
  selection: TestSelection;
}

export interface DaemonRunTestsResponse {
  ok: true;
  type: 'run_tests';
  verification: TestVerificationReport;
}

export interface DaemonTestStatusResponse {
  ok: true;
  type: 'test_status';
  status: unknown;
}

export interface DaemonArtifactStatusResponse {
  ok: true;
  type: 'artifact_status';
  status: unknown;
}

export interface DaemonStatusResponse {
  ok: true;
  type: 'daemon_status';
  status: DaemonStatusReport;
}

export interface DaemonShutdownResponse {
  ok: true;
  type: 'shutdown';
  accepted: boolean;
}

export type DaemonResponse =
  | DaemonErrorResponse
  | DaemonHelloResponse
  | DaemonAckResponse
  | DaemonProjectStatusResponse
  | DaemonJobResponse
  | DaemonJobResultResponse
  | DaemonQueryResponse
  | DaemonEvidenceResponse
  | DaemonIngestTracesResponse
  | DaemonChangeResponse
  | DaemonContractResponse
  | DaemonTestSelectionResponse
  | DaemonRunTestsResponse
  | DaemonTestStatusResponse
  | DaemonArtifactStatusResponse
  | DaemonStatusResponse
  | DaemonShutdownResponse;

export interface DaemonProgressMessage {
  kind: 'progress';
  event: DaemonProgressEvent;
}

export interface DaemonResponseEnvelope {
  requestId: string;
  response: DaemonResponse;
}

export type DaemonServerMessage = DaemonResponseEnvelope | DaemonProgressMessage;

/* ------------------------------------------------------------------ *
 * Injected runtime dependencies
 * ------------------------------------------------------------------ */

export interface DaemonIndexResult {
  generation: string;
  files: number;
  symbols: number;
  edges: number;
}

export interface DaemonHydrateResult {
  generation: string;
  files: number;
  symbols: number;
  edges: number;
  fleetRepinned: boolean;
}

export interface DaemonRuntimeDependencies {
  /** Cheap probe: does a usable local derived graph already exist? */
  probeLocalGraph(project: DaemonProjectRef): Promise<{ present: boolean; generation?: string }>;

  /** Load/verify the project's current derived state for querying. */
  loadProject(project: DaemonProjectRef): Promise<{ generation: string }>;

  /** Run the real index pipeline. Must respect the abort signal. */
  indexProject(
    project: DaemonProjectRef,
    signal: AbortSignal,
    report: (event: DaemonProgressPayload) => void
  ): Promise<DaemonIndexResult>;

  /** Attempt Phase 76 artifact hydration. */
  hydrateProject(project: DaemonProjectRef, signal: AbortSignal): Promise<DaemonHydrateResult>;

  /** Inspect artifact status for a project. */
  artifactStatus(project: DaemonProjectRef): Promise<unknown>;

  /** Execute a Phase 78 evidence run against the shared project runtime. */
  evidenceProject(project: DaemonProjectRef, request: EvidenceRequest): Promise<EvidenceBundle>;

  /**
   * Import a Phase 79 runtime trace session into the shared project runtime.
   *
   * Optional: a deployment that does not expose trace ingestion simply does not
   * provide it, and the caller degrades to a local import.
   */
  ingestTracesProject?(
    project: DaemonProjectRef,
    input: RuntimeTraceIngestInput
  ): Promise<RuntimeTraceImportResult>;

  /**
   * Execute a Phase 80 change-intelligence analysis against the shared project
   * runtime. Optional: a deployment that does not expose it degrades to a local
   * analysis.
   */
  changeProject?(
    project: DaemonProjectRef,
    input: RuntimeChangeInput
  ): Promise<ChangeIntelligenceReport>;

  /**
   * Execute a Phase 81 contract-compatibility analysis against the shared
   * project runtime. Optional: a deployment that does not expose it degrades to
   * a local analysis.
   */
  contractProject?(
    project: DaemonProjectRef,
    input: RuntimeContractInput
  ): Promise<ContractIntelligenceReport>;

  /**
   * Execute a Phase 82 test selection against the shared project runtime.
   * Optional: a deployment that does not expose it degrades to a local
   * selection.
   */
  selectTestsProject?(
    project: DaemonProjectRef,
    input: RuntimeTestSelectionInput
  ): Promise<TestSelection>;

  /**
   * Execute a Phase 82 selection through the shared project runtime. Only a
   * selection the same runtime computed can be executed.
   */
  runTestsProject?(
    project: DaemonProjectRef,
    input: RuntimeTestRunInput
  ): Promise<TestVerificationReport>;

  /** Read-only bounded Phase 82 run status. */
  testStatusProject?(project: DaemonProjectRef, limit?: number): Promise<unknown>;

  /** Execute a Phase 74 bounded query against the project runtime. */
  queryProject(
    project: DaemonProjectRef,
    input: {
      query: string;
      scope: QueryScope;
      parameters?: Record<string, unknown>;
      limit?: number;
      cursor?: string;
      explain?: boolean;
    }
  ): Promise<QueryResult>;

  /** Rebuild/refresh Fleet links for the given projects (coalesced). */
  refreshFleet(projectIds: string[]): Promise<void>;

  /** Release resident derived state for an evicted project. */
  releaseProject(projectId: string): Promise<void>;

  /** Observe source changes with a project-level debounce. */
  watchProject?(
    project: DaemonProjectRef,
    onChange: (paths: string[]) => void
  ): Promise<{ close(): void | Promise<void> }>;
}

export type { QueryGeneration, QueryResult, QueryScope };
