/*
 * Phase 82 — Test Intelligence barrel.
 *
 *   change/contract -> discovery -> relationships -> selection
 *                                      |
 *                                      +-> explicit execution -> verification
 *
 * Selection and discovery are read-only. Execution is explicit only. A passing
 * selected-test run is evidence, never authorisation: safeToMerge and
 * safeToDeploy are always false.
 */

export * from './types.js';

export { TEST_INTELLIGENCE_LIMITS, resolveTestLimits } from './limits.js';

export {
  TEST_SELECTION_ALGORITHM_VERSION,
  testExecutionFingerprint,
  testSelectionFingerprint,
  testSelectionId,
  type TestExecutionFingerprintInput,
  type TestSelectionFingerprintInput,
} from './fingerprint.js';

export {
  adapterFor,
  detectFramework,
  isContainedTestPath,
  isTestPath,
  resolveLocalBinary,
  TEST_FRAMEWORK_ADAPTERS,
  type ParsedTestResult,
  type ParsedTestSymbol,
  type TestCommandPlan,
  type TestFrameworkAdapter,
} from './frameworks.js';

export {
  discoverTests,
  looksLikeTestPath,
  testDescriptorId,
  type TestDiscoveryResult,
} from './discovery.js';

export {
  buildTestRelationships,
  DIRECT_EDGES,
  TRANSITIVE_EDGES,
  type RelationshipInput,
  type TestRelationship,
} from './relationships.js';

export { INTEGRATION_REASONS, selectTests, TIER, type TestSelectionResult } from './selection.js';

export {
  defaultTestSpawn,
  runSelectedTests,
  sanitizeOutput,
  type RunTestsInput,
  type TestSpawnFn,
  type TestSpawnPlan,
  type TestSpawnResult,
} from './execution.js';

export { ingestCoverage, type CoverageIngestInput } from './coverage.js';

export { TestIntelligenceStore } from './store.js';

export {
  buildTestSelection,
  buildTestVerification,
  type BuildSelectionInput,
  type BuildSelectionResult,
  type BuildVerificationInput,
} from './report.js';

export {
  buildProjectTestFacts,
  changedEntitiesFromChange,
  contractChangesFromReport,
  type ProjectTestFactsInput,
  type TestCoverageProvider,
} from './project-facts.js';
