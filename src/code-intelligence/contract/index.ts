/*
 * Phase 81 — Contract Intelligence barrel.
 *
 *   Phase 80 change paths -> discovery -> structural diff -> consumers -> guard
 *
 * Analysis only. The static graph stays the structural authority; git describes
 * the change; consumers are graph/Fleet evidence; runtime traces corroborate and
 * ADRs constrain. Nothing here executes source, runs protoc/npm, fetches a
 * remote $ref or publishes an artifact.
 */

export * from './types.js';

export { CONTRACT_LIMITS, resolveContractLimits } from './limits.js';

export {
  canonicalType,
  contractId,
  entryCanonicalJson,
  normalizeEntry,
  normalizeField,
  normalizeShape,
  sortFields,
} from './shape.js';

export {
  contractReportFingerprint,
  contractSnapshotFingerprint,
  makeSnapshot,
  type ContractReportFingerprintInput,
} from './fingerprint.js';

export {
  contractKindForPath,
  parseContractFile,
  SUPPORTED_CONTRACT_KINDS,
  type ContractParseInput,
  type ContractParseResult,
} from './parsers/index.js';

export { parseYamlSubset, YamlUnsupportedError } from './parsers/yaml.js';

export { discoverContracts, type ContractDiscoveryResult } from './discover.js';

export { diffContracts } from './diff.js';

export { findConsumers, type ConsumerDiscoveryResult } from './consumers.js';

export {
  evaluateContractGuard,
  type ContractGuardEvaluation,
  type ContractGuardInput,
} from './guard.js';

export { analyzeContracts, type AnalyzeContractsInput } from './report.js';

export {
  buildProjectContractFacts,
  readBaselineFile,
  type ContractCoverageProvider,
  type ProjectContractFactsInput,
} from './project-facts.js';
