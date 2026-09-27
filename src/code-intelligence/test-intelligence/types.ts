/*
 * Phase 82 — Test Intelligence / Change-to-Test Selection & Verification.
 *
 * Turns a Phase 80 change (and an optional Phase 81 contract report) into a
 * deterministic test selection, an optional explicitly-requested execution, and
 * a verification report.
 *
 * Hard invariant: TEST PASS IS NEVER PROOF OF NO REGRESSION. A passing selected
 * test is evidence, never authorisation. The static graph, coverage, contract
 * analysis and Evidence Profiles still decide how strong a claim may be.
 *
 * This layer is derived, observational state. It never mutates the static
 * graph, Memory, Tasks, Sessions, ADRs or a graph artifact, never installs a
 * dependency and never runs an arbitrary command string.
 *
 * No LLM. No embeddings. No vector database.
 */

import type { EvidenceClaimKind, EvidenceProfile } from '../evidence/types.js';

export type TestFramework =
  'vitest' | 'jest' | 'node_test' | 'pytest' | 'go_test' | 'cargo_test' | 'other';

export type TestKind = 'unit' | 'integration' | 'contract' | 'e2e' | 'unknown';

export type TestSupport = 'supported' | 'partial' | 'unsupported';

/**
 * Canonical test identity. Every field is derived from a deterministic source
 * (path + suite + name + symbol), never from a random generator.
 */
export interface TestDescriptor {
  /** `path::suite>name` when a name exists, otherwise `path::symbol:<id>`. */
  id: string;
  projectId: string;
  path: string;
  framework: TestFramework;
  kind: TestKind;
  suite?: string;
  testName?: string;
  symbolId?: string;
  deterministicIdentity: string;
}

export type TestReasonCode =
  | 'EXPLICIT_TESTS_EDGE'
  | 'DIRECT_CALLS_CHANGED_SYMBOL'
  | 'TRANSITIVE_CALL_PATH'
  | 'IMPORTS_CHANGED_MODULE'
  | 'USES_CHANGED_TYPE'
  | 'TESTS_CHANGED_ROUTE'
  | 'TESTS_CHANGED_CONTRACT'
  | 'TESTS_EVENT_CHANNEL'
  | 'CROSS_SERVICE_CONSUMER_TEST'
  | 'CROSS_REPO_CONSUMER_TEST'
  | 'RUNTIME_OBSERVED_PATH_TEST';

export type TestCategory = 'direct' | 'contract' | 'integration' | 'transitive' | 'related' | 'e2e';

export interface TestPathStep {
  from: string;
  to: string;
  edgeType: string;
}

export interface SelectedTest {
  test: TestDescriptor;
  category: TestCategory;
  reasonCode: TestReasonCode;
  /** Deterministic tier rank used for ordering (direct < contract < integration < transitive < related). */
  tier: number;
  targetEntityId?: string;
  /** Semantic path from the test to the changed entity (never a bare score). */
  path: TestPathStep[];
  runtimeObserved?: boolean;
}

export interface UncoveredEntity {
  entityId: string;
  name?: string;
  filePath?: string;
  reasonCode: 'NO_KNOWN_TEST' | 'DISCOVERY_INCOMPLETE' | 'UNSUPPORTED_FRAMEWORK';
}

export interface TestSelectionCoverage {
  changedEntities: number;
  entitiesWithDirectTests: number;
  entitiesWithAnyKnownTest: number;
  uncoveredEntities: number;
}

export interface FrameworkDiscoverySupport {
  framework: TestFramework;
  support: TestSupport;
  files: number;
  symbols: number;
  note?: string;
}

export interface TestDiscoveryCoverage {
  testFiles: number;
  testSymbols: number;
  frameworks: FrameworkDiscoverySupport[];
  /** True only when every relevant framework/language was discoverable. */
  complete: boolean;
  reasons: string[];
}

export type TestSelectionReason =
  | 'TEST_DISCOVERY_COMPLETE'
  | 'TEST_DISCOVERY_PARTIAL'
  | 'UNSUPPORTED_TEST_FRAMEWORK'
  | 'COVERAGE_PARTIAL'
  | 'GRAPH_STALE'
  | 'TEST_SELECTION_INCOMPLETE'
  | 'SELECTION_INPUT_CHANGED'
  | 'SELECTION_LIMIT_REACHED'
  | 'FLEET_STALE'
  | 'FLEET_SCOPE_UNBOUNDED'
  | 'CROSS_REPO_TEST_MAPPING_UNSUPPORTED'
  | 'PROFILE_REQUIRES_VERIFY'
  | 'PROFILE_REQUIRES_AUDITOR'
  | 'NEGATIVE_TEST_CLAIM_NOT_SAFE'
  | 'NO_KNOWN_TESTS_WITHIN_SCOPE';

export interface TestSelectionClaimSafety {
  decision: 'allowed' | 'provisional' | 'blocked';
  negativeClaimSafe: boolean;
  exhaustiveClaimSafe: boolean;
  reasons: string[];
}

export interface TestSelection {
  projectId: string;

  profile: EvidenceProfile;
  evidenceLevel: 'provisional' | 'verified' | 'audited';

  /** Deterministic selection identity, used by explicit execution. */
  selectionId: string;
  fingerprint: string;

  changeFingerprint?: string;
  contractFingerprint?: string;

  generations: { baseline?: string; candidate?: string; fleet?: string };

  categories: {
    direct: SelectedTest[];
    contract: SelectedTest[];
    integration: SelectedTest[];
    transitive: SelectedTest[];
    related: SelectedTest[];
    e2e: SelectedTest[];
  };

  /** Deterministic greedy cover of the changed entities (heuristic, not optimal). */
  minimal: SelectedTest[];

  uncoveredEntities: UncoveredEntity[];

  coverage: TestSelectionCoverage;
  discovery: TestDiscoveryCoverage;

  changedEntities: number;

  reasons: TestSelectionReason[];
  claimSafety: TestSelectionClaimSafety;

  /**
   * Relevant accepted ADRs, attached as architectural CONSTRAINTS.
   *
   * An ADR never changes what a test proves; it only records that a mandatory
   * test policy/architecture decision touches the change.
   */
  adrConstraints: TestAdrConstraint[];

  limitations: string[];
  diagnostics: string[];

  complete: boolean;
}

/* ------------------------------------------------------------------ *
 * Execution
 * ------------------------------------------------------------------ */

export type TestResultStatus = 'passed' | 'failed' | 'skipped' | 'todo' | 'errored';

export interface TestResultRecord {
  testId: string;
  status: TestResultStatus;
  durationMs?: number;
  /** Bounded, sanitized failure message. */
  failure?: string;
}

export type TestRunStatus = 'running' | 'passed' | 'failed' | 'cancelled' | 'errored';

export interface TestRunOutput {
  truncated: boolean;
  bytes: number;
  /** Bounded, sanitized excerpt. Never raw credential-bearing output. */
  excerpt?: string;
}

export interface TestRunEnvironment {
  networkAllowed: boolean;
  /** Honest network isolation state: ToolNet does not enforce it portably. */
  networkIsolation: 'enforced' | 'not_enforced';
}

export interface TestRun {
  id: string;
  projectId: string;
  changeFingerprint?: string;
  sourceGeneration?: string;
  selectionId: string;
  framework: TestFramework | 'mixed';
  selectedTests: string[];
  /** True when the caller ran an explicit subset of the recommended selection. */
  userSelectedSubset: boolean;
  startedAt: string;
  endedAt?: string;
  status: TestRunStatus;
  results: TestResultRecord[];
  output: TestRunOutput;
  environment: TestRunEnvironment;
  /** True when the change input no longer matches the run's fingerprint. */
  stale: boolean;
  errors: string[];
  /** Monotonic observed attempts (never hidden). */
  attempts: number;
}

export type TestExecutionErrorCode =
  | 'TEST_SELECTION_STALE'
  | 'TEST_SELECTION_NOT_FOUND'
  | 'TEST_ID_INVALID'
  | 'TEST_NOT_IN_SELECTION'
  | 'TEST_PATH_ESCAPE'
  | 'TEST_RUNNER_UNAVAILABLE'
  | 'TEST_RUNNER_ERROR'
  | 'TEST_RUN_TIMEOUT'
  | 'TEST_RUN_CANCELLED'
  | 'TEST_ENVIRONMENT_UNAVAILABLE'
  | 'TEST_OUTPUT_LIMIT_REACHED'
  | 'TEST_SELECTION_LIMIT_REACHED';

export class TestIntelligenceError extends Error {
  constructor(
    public readonly code: TestExecutionErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'TestIntelligenceError';
  }
}

/* ------------------------------------------------------------------ *
 * Verification
 * ------------------------------------------------------------------ */

export type TestVerificationBlocker =
  | 'CHANGED_ENTITY_WITHOUT_KNOWN_TEST'
  | 'CONTRACT_CHANGE_WITHOUT_KNOWN_TEST'
  | 'SELECTED_TEST_FAILED'
  | 'SELECTED_TEST_ERROR'
  | 'SELECTED_TEST_TIMEOUT'
  | 'TEST_RESULT_STALE'
  | 'TEST_SELECTION_INCOMPLETE'
  | 'TEST_RUNNER_UNAVAILABLE'
  | 'TEST_DISCOVERY_PARTIAL'
  | 'REQUIRED_TEST_SKIPPED';

export interface TestVerificationReport {
  selection: TestSelection;
  run?: TestRun;

  passed: TestDescriptor[];
  failed: Array<{ test: TestDescriptor; message?: string }>;
  skipped: TestDescriptor[];
  errors: Array<{ testId?: string; code: string }>;

  /** Passive code-coverage ingestion, when supplied. Never produced automatically. */
  coverage?: TestCoverageEvidence;

  stale: boolean;
  complete: boolean;
  blockers: TestVerificationBlocker[];
  limitations: string[];
  /**
   * Always false. A green selected-test run never authorises a merge or a
   * deployment; it only removes test-specific blockers.
   */
  safeToMerge: false;
  safeToDeploy: false;
}

/* ------------------------------------------------------------------ *
 * Coverage reports (passive ingestion only)
 * ------------------------------------------------------------------ */

export type TestCoverageFormat = 'lcov' | 'coverage_py_json' | 'go_coverprofile' | 'istanbul_json';

export interface TestCoverageFileEntry {
  path: string;
  linesFound: number;
  linesHit: number;
}

export interface TestCoverageEvidence {
  format: TestCoverageFormat;
  projectId: string;
  /** Generation the report claims to belong to, when declared. */
  sourceGeneration?: string;
  changeFingerprint?: string;
  testRunId?: string;
  files: TestCoverageFileEntry[];
  totals: { linesFound: number; linesHit: number };
  stale: boolean;
  reason?: 'SOURCE_GENERATION_MISMATCH' | 'CHANGE_FINGERPRINT_MISMATCH' | 'NO_GENERATION_DECLARED';
  truncated: boolean;
}

/* ------------------------------------------------------------------ *
 * Facts — the injectable surface
 * ------------------------------------------------------------------ */

export interface TestSymbol {
  id: string;
  name: string;
  qualifiedName?: string;
  type: string;
  filePath: string;
}

export interface TestEdge {
  id: string;
  type: string;
  from: string;
  to: string;
}

export interface TestGraphFacts {
  symbols(): readonly TestSymbol[];
  symbolById(id: string): TestSymbol | undefined;
  incoming(symbolId: string, edgeTypes: readonly string[]): readonly TestEdge[];
  outgoing(symbolId: string, edgeTypes: readonly string[]): readonly TestEdge[];
}

export interface TestCapabilityCoverage {
  available: boolean;
  status: string;
  negativeClaimSafe: boolean;
  reasons: string[];
}

export interface TestChangedEntity {
  id: string;
  symbolId?: string;
  name?: string;
  qualifiedName?: string;
  filePath: string;
  publicSurface: boolean;
  semantic: string[];
}

export interface TestContractChange {
  contractId: string;
  kind: string;
  identity: string;
  compatibility: 'compatible' | 'breaking' | 'potentially_breaking' | 'unknown';
  /** Changed contract source paths (used to reach type/route/event symbols). */
  sourcePaths: string[];
  /** Resolved target symbol ids when the contract maps to a graph node. */
  symbolIds: string[];
}

export interface TestRuntimeObservation {
  id: string;
  kind: string;
  validation: string;
  observationCount: number;
  compatibility: string;
  source: { symbolId?: string; name?: string };
  target: { symbolId?: string; name?: string };
}

export interface TestFleetFacts {
  generation?: string;
  registeredProjects: string[];
  staleProjects: string[];
  missingProjects: string[];
}

/** A deterministically-declared Fleet test for a cross-repo consumer. */
export interface FleetTestRef {
  projectId: string;
  testId: string;
  path: string;
  framework: TestFramework;
  /** Exact Fleet resource identity the test covers. */
  resourceId: string;
  reasonCode: 'CROSS_REPO_CONSUMER_TEST';
}

export interface TestAdrConstraint {
  id: string;
  title: string;
  status: string;
}

export interface TestSelectionRequest {
  projectId: string;
  claim?: EvidenceClaimKind;
  profile?: EvidenceProfile;
  /** Include Fleet-aware integration/contract tests. */
  includeFleet?: boolean;
  /** Attach Phase 79 runtime-observed-path relevance. */
  includeRuntimeEvidence?: boolean;
  maxTests?: number;
  maxDepth?: number;
}

export interface RunSelectedTestsRequest {
  selectionId: string;
  /** Re-check the live change fingerprint before running. */
  changeFingerprint?: string;
  /** Explicit subset of the selection's test ids. */
  tests?: string[];
  timeoutMs?: number;
  networkAllowed?: boolean;
}

export interface TestSelectionFacts {
  projectId: string;
  rootPath: string;

  generation: string;
  candidateGeneration?: string;
  currentGeneration(): string;

  graph: TestGraphFacts;

  coverageAvailable: boolean;
  coverageFor(capability: string): TestCapabilityCoverage;

  fleet?: TestFleetFacts | null;

  /** Changed entities from the Phase 80 change report. */
  changedEntities: readonly TestChangedEntity[];
  /** Change fingerprint from Phase 80, used for pinning. */
  changeFingerprint?: string;
  /** Contract changes from Phase 81, when available. */
  contractChanges?: readonly TestContractChange[];
  contractFingerprint?: string;

  runtime?(symbolIds: readonly string[]): readonly TestRuntimeObservation[];

  /** Deterministically declared Fleet tests for cross-repo consumers. */
  fleetTests?(resourceIds: readonly string[]): readonly FleetTestRef[] | null;

  adr?(input: {
    filePaths: string[];
    symbols: string[];
  }): readonly TestAdrConstraint[] | Promise<readonly TestAdrConstraint[]>;

  /** Already-resolved accepted ADR constraints (never a resolver). */
  adrConstraints?: readonly TestAdrConstraint[];

  /** Bounded project-contained source read (sensitive files refused). */
  readSource?(path: string, maxBytes: number): string | null;

  /** Re-read the raw change snapshot id (mid-run change detection). */
  recheckSnapshot?(): Promise<string>;

  /** Framework command override resolver (never a free-form command string). */
  runnerPlan?(
    framework: TestFramework,
    testPath: string
  ): { command: string; args: string[] } | null;
}

/** The injectable selection surface. `TestFacts` is the short alias. */
export type TestFacts = TestSelectionFacts;

export interface TestIntelligenceLimits {
  maxTestFiles: number;
  maxTestSymbols: number;
  maxSelectedTests: number;
  maxDepth: number;
  maxSourceReadBytes: number;
  maxRunOutputBytes: number;
  maxProcesses: number;
  maxRetainedRuns: number;
  runTimeoutMs: number;
}

export const ALL_TEST_FRAMEWORKS: readonly TestFramework[] = [
  'vitest',
  'jest',
  'node_test',
  'pytest',
  'go_test',
  'cargo_test',
  'other',
];
