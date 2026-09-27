/*
 * Phase 84B — storage compatibility model: central registry.
 *
 * Every persisted store is declared exactly once here: its class, its current
 * schema version, the legacy versions it can still read, its missing-version
 * policy and its source of truth. Store readers, the compatibility check and
 * the release analysis all resolve contracts from this table, so a store
 * cannot be classified one way in one place and another way somewhere else.
 */

import type {
  StorageKeyClassification,
  StorageSourceClassification,
  StorageSourceRole,
  StoreClass,
  StoreClassOrUnknown,
  StoreCompatibility,
  StoreKind,
  LegacyValueDomain,
} from './types.js';

export interface StoreContractDeclaration {
  kind: StoreKind;
  storeClass: StoreClass;
  schemaVersion: number;
  supportedLegacyVersions: readonly number[];
  compatibility: StoreCompatibility;
  missingVersionPolicy: 'accept' | 'assume_legacy' | 'reject';
  sourceOfTruth: string;
  legacyValueDomains: readonly LegacyValueDomain[];
  description: string;
}

/* ------------------------------------------------------------------ */
/* Contracts                                                           */
/* ------------------------------------------------------------------ */

const AUTHORITY_SOURCE = 'authority: never rebuilt, never dropped';

const DECLARATIONS: readonly StoreContractDeclaration[] = [
  /* --- authority --------------------------------------------------- */
  {
    kind: 'memory_records',
    storeClass: 'authority',
    schemaVersion: 1,
    supportedLegacyVersions: [1],
    compatibility: 'exact',
    missingVersionPolicy: 'accept',
    sourceOfTruth: AUTHORITY_SOURCE,
    legacyValueDomains: [],
    description: 'Long-term project memory records (projects/<id>/memories/current.json).',
  },
  {
    kind: 'task_operations',
    storeClass: 'authority',
    schemaVersion: 1,
    supportedLegacyVersions: [1],
    compatibility: 'exact',
    missingVersionPolicy: 'reject',
    sourceOfTruth: AUTHORITY_SOURCE,
    legacyValueDomains: [],
    description: 'Immutable task operation log (.toolnet/tasks/events.jsonl).',
  },
  {
    kind: 'task_replication_log',
    storeClass: 'authority',
    schemaVersion: 1,
    supportedLegacyVersions: [1],
    compatibility: 'exact',
    missingVersionPolicy: 'reject',
    sourceOfTruth: AUTHORITY_SOURCE,
    legacyValueDomains: [],
    description: 'Replicated task operations from other hosts.',
  },
  {
    kind: 'retrieval_feedback',
    storeClass: 'authority',
    schemaVersion: 1,
    supportedLegacyVersions: [1],
    compatibility: 'exact',
    missingVersionPolicy: 'accept',
    sourceOfTruth: AUTHORITY_SOURCE,
    legacyValueDomains: [],
    description: 'Retrieval feedback signals (.toolnet/retrieval/feedback.jsonl).',
  },
  {
    kind: 'retrieval_telemetry',
    storeClass: 'authority',
    schemaVersion: 1,
    supportedLegacyVersions: [1],
    compatibility: 'exact',
    missingVersionPolicy: 'accept',
    sourceOfTruth: AUTHORITY_SOURCE,
    legacyValueDomains: [],
    description: 'Retrieval telemetry samples (.toolnet/retrieval/telemetry.jsonl).',
  },
  {
    kind: 'retrieval_overrides',
    storeClass: 'authority',
    schemaVersion: 1,
    supportedLegacyVersions: [1],
    compatibility: 'exact',
    missingVersionPolicy: 'accept',
    sourceOfTruth: AUTHORITY_SOURCE,
    legacyValueDomains: [],
    description: 'Operator retrieval overrides (.toolnet/retrieval/overrides.json).',
  },
  {
    kind: 'session_wal',
    storeClass: 'authority',
    schemaVersion: 1,
    supportedLegacyVersions: [1],
    compatibility: 'exact',
    missingVersionPolicy: 'accept',
    sourceOfTruth: AUTHORITY_SOURCE,
    legacyValueDomains: [],
    description: 'Session write-ahead log (.toolnet/runtime/sources/).',
  },
  {
    kind: 'adr_state',
    storeClass: 'authority',
    schemaVersion: 1,
    supportedLegacyVersions: [1],
    compatibility: 'exact',
    missingVersionPolicy: 'reject',
    sourceOfTruth: AUTHORITY_SOURCE,
    legacyValueDomains: [],
    description: 'Architecture decision records (projects/<id>/knowledge/adr/state.v1.json).',
  },
  {
    kind: 'project_manifest',
    storeClass: 'authority',
    schemaVersion: 1,
    supportedLegacyVersions: [1],
    compatibility: 'backward_compatible',
    missingVersionPolicy: 'assume_legacy',
    sourceOfTruth: AUTHORITY_SOURCE,
    legacyValueDomains: [],
    description: 'Project identity manifest (.toolnet/project.json and the remote copy).',
  },
  {
    kind: 'recovery_backup',
    storeClass: 'authority',
    schemaVersion: 1,
    supportedLegacyVersions: [1],
    compatibility: 'exact',
    missingVersionPolicy: 'reject',
    sourceOfTruth: AUTHORITY_SOURCE,
    legacyValueDomains: [],
    description: 'Disaster-recovery backup manifest, version-gated on read.',
  },

  /* --- derived ----------------------------------------------------- */
  {
    kind: 'task_projection',
    storeClass: 'derived',
    schemaVersion: 1,
    supportedLegacyVersions: [1],
    compatibility: 'rebuild_required',
    missingVersionPolicy: 'accept',
    sourceOfTruth: 'task operations log',
    legacyValueDomains: [],
    description: 'Materialized task state; rebuilt from the operation log.',
  },
  {
    kind: 'code_graph',
    storeClass: 'derived',
    schemaVersion: 1,
    supportedLegacyVersions: [1],
    compatibility: 'rebuild_required',
    missingVersionPolicy: 'accept',
    sourceOfTruth: 'repository source',
    legacyValueDomains: [],
    description: 'Code graph snapshot (projects/<id>/graph/current.json).',
  },
  {
    kind: 'code_manifest',
    storeClass: 'derived',
    schemaVersion: 1,
    supportedLegacyVersions: [1],
    compatibility: 'rebuild_required',
    missingVersionPolicy: 'accept',
    sourceOfTruth: 'repository source',
    legacyValueDomains: [],
    description: 'Incremental file manifest (projects/<id>/graph/manifest.json).',
  },
  {
    kind: 'resolution_snapshot',
    storeClass: 'derived',
    schemaVersion: 1,
    supportedLegacyVersions: [1],
    compatibility: 'backward_compatible',
    missingVersionPolicy: 'assume_legacy',
    sourceOfTruth: 'repository source',
    legacyValueDomains: ['resolution_kind_uppercase'],
    description:
      'Symbol resolution snapshot (projects/<id>/graph/resolution/current.json); the legacy ' +
      'kind vocabulary (CALL/REFERENCE/EXTENDS/IMPLEMENTS) is normalized in memory on read.',
  },
  {
    kind: 'graph_coverage',
    storeClass: 'derived',
    schemaVersion: 1,
    supportedLegacyVersions: [1],
    compatibility: 'rebuild_required',
    missingVersionPolicy: 'accept',
    sourceOfTruth: 'code graph + resolution',
    legacyValueDomains: [],
    description: 'Graph coverage snapshot (projects/<id>/graph/coverage.json).',
  },
  {
    kind: 'cross_service',
    storeClass: 'derived',
    schemaVersion: 1,
    supportedLegacyVersions: [1],
    compatibility: 'rebuild_required',
    missingVersionPolicy: 'accept',
    sourceOfTruth: 'repository source + service extractors',
    legacyValueDomains: [],
    description: 'Cross-service linkage (projects/<id>/graph/cross-service.json).',
  },
  {
    kind: 'fleet_export',
    storeClass: 'derived',
    schemaVersion: 1,
    supportedLegacyVersions: [1],
    compatibility: 'rebuild_required',
    missingVersionPolicy: 'accept',
    sourceOfTruth: 'repository source',
    legacyValueDomains: [],
    description: 'Fleet export view (projects/<id>/graph/fleet-export.json).',
  },
  {
    kind: 'snapshot_archive',
    storeClass: 'derived',
    schemaVersion: 1,
    supportedLegacyVersions: [1],
    compatibility: 'rebuild_required',
    missingVersionPolicy: 'accept',
    sourceOfTruth: 'current project state',
    legacyValueDomains: [],
    description: 'Point-in-time project snapshots; never part of authority backups.',
  },
  {
    kind: 'code_artifacts',
    storeClass: 'derived',
    schemaVersion: 1,
    supportedLegacyVersions: [1],
    compatibility: 'rebuild_required',
    missingVersionPolicy: 'reject',
    sourceOfTruth: 'repository source + semantic registry',
    legacyValueDomains: [],
    description: 'Portable code-intelligence artifacts, gated by the artifact fingerprint matrix.',
  },
  {
    kind: 'code_chunks',
    storeClass: 'derived',
    schemaVersion: 1,
    supportedLegacyVersions: [1],
    compatibility: 'rebuild_required',
    missingVersionPolicy: 'accept',
    sourceOfTruth: 'repository source',
    legacyValueDomains: [],
    description: 'Code chunk snapshot (projects/<id>/code/chunks/current.json).',
  },
  {
    kind: 'code_vectors',
    storeClass: 'derived',
    schemaVersion: 1,
    supportedLegacyVersions: [1],
    compatibility: 'rebuild_required',
    missingVersionPolicy: 'accept',
    sourceOfTruth: 'code chunks',
    legacyValueDomains: [],
    description: 'Code vector index (projects/<id>/code/vectors/current.json).',
  },
  {
    kind: 'memory_vectors',
    storeClass: 'derived',
    schemaVersion: 1,
    supportedLegacyVersions: [1],
    compatibility: 'rebuild_required',
    missingVersionPolicy: 'accept',
    sourceOfTruth: 'memory records',
    legacyValueDomains: [],
    description: 'Deterministic memory vector index (projects/<id>/vectors/current.json).',
  },
  {
    kind: 'architecture_snapshot',
    storeClass: 'derived',
    schemaVersion: 1,
    supportedLegacyVersions: [1],
    compatibility: 'rebuild_required',
    missingVersionPolicy: 'accept',
    sourceOfTruth: 'code graph',
    legacyValueDomains: [],
    description: 'Architecture snapshot (projects/<id>/code/architecture).',
  },
  {
    kind: 'code_analysis',
    storeClass: 'derived',
    schemaVersion: 1,
    supportedLegacyVersions: [1],
    compatibility: 'rebuild_required',
    missingVersionPolicy: 'accept',
    sourceOfTruth: 'code graph',
    legacyValueDomains: [],
    description: 'Code analysis snapshot (projects/<id>/code/analysis).',
  },
  {
    kind: 'visualization_graph',
    storeClass: 'derived',
    schemaVersion: 1,
    supportedLegacyVersions: [1],
    compatibility: 'rebuild_required',
    missingVersionPolicy: 'accept',
    sourceOfTruth: 'code graph',
    legacyValueDomains: [],
    description: 'Visualization graph (projects/<id>/code/visualization/graph.json).',
  },
  {
    kind: 'runtime_traces',
    storeClass: 'derived',
    schemaVersion: 1,
    supportedLegacyVersions: [1],
    compatibility: 'rebuild_required',
    missingVersionPolicy: 'accept',
    sourceOfTruth: 'observed session activity',
    legacyValueDomains: [],
    description: 'Runtime trace sessions plus their recomputed observation index.',
  },
  {
    kind: 'journal',
    storeClass: 'derived',
    schemaVersion: 1,
    supportedLegacyVersions: [1],
    compatibility: 'rebuild_required',
    missingVersionPolicy: 'accept',
    sourceOfTruth: 'session activity',
    legacyValueDomains: [],
    description: 'Local session journal (.toolnet/journal).',
  },

  /* --- ephemeral --------------------------------------------------- */
  {
    kind: 'task_replication_cursor',
    storeClass: 'ephemeral',
    schemaVersion: 1,
    supportedLegacyVersions: [1],
    compatibility: 'rebuild_required',
    missingVersionPolicy: 'accept',
    sourceOfTruth: 'task replication log',
    legacyValueDomains: [],
    description: 'Replication cursor (.toolnet/tasks/replication/cursor.json).',
  },
  {
    kind: 'runtime_locks',
    storeClass: 'ephemeral',
    schemaVersion: 1,
    supportedLegacyVersions: [1],
    compatibility: 'rebuild_required',
    missingVersionPolicy: 'accept',
    sourceOfTruth: 'process lifetime',
    legacyValueDomains: [],
    description: 'Runtime lock files (.toolnet/runtime/locks).',
  },
  {
    kind: 'daemon_state',
    storeClass: 'ephemeral',
    schemaVersion: 1,
    supportedLegacyVersions: [1],
    compatibility: 'rebuild_required',
    missingVersionPolicy: 'accept',
    sourceOfTruth: 'running daemon',
    legacyValueDomains: [],
    description: 'Daemon coordination state (daemon-state.json).',
  },
  {
    kind: 'daemon_runtime_files',
    storeClass: 'ephemeral',
    schemaVersion: 1,
    supportedLegacyVersions: [1],
    compatibility: 'rebuild_required',
    missingVersionPolicy: 'accept',
    sourceOfTruth: 'running daemon',
    legacyValueDomains: [],
    description: 'Daemon socket, pid, lock and logs.',
  },
  {
    kind: 'artifact_staging',
    storeClass: 'ephemeral',
    schemaVersion: 1,
    supportedLegacyVersions: [1],
    compatibility: 'rebuild_required',
    missingVersionPolicy: 'accept',
    sourceOfTruth: 'repository source',
    legacyValueDomains: [],
    description: 'Artifact staging area (.toolnet/cache/artifacts/staging).',
  },
  {
    kind: 'test_run_cache',
    storeClass: 'ephemeral',
    schemaVersion: 1,
    supportedLegacyVersions: [1],
    compatibility: 'rebuild_required',
    missingVersionPolicy: 'accept',
    sourceOfTruth: 'test execution',
    legacyValueDomains: [],
    description: 'In-memory only derived test-run store.',
  },
];

/** Frozen, deterministically ordered contract list. */
export const STORE_CONTRACTS: readonly StoreContractDeclaration[] = Object.freeze(
  DECLARATIONS.slice().sort((left, right) => left.kind.localeCompare(right.kind))
);

const BY_KIND = new Map<StoreKind, StoreContractDeclaration>(
  STORE_CONTRACTS.map((contract) => [contract.kind, contract])
);

/** Resolve the declared contract for a store kind. */
export function storeContract(kind: StoreKind): StoreContractDeclaration {
  const contract = BY_KIND.get(kind);

  if (!contract) {
    throw new Error(`STORE_CONTRACT_MISSING ${kind}`);
  }

  return contract;
}

/** Every declared store kind, deterministically ordered. */
export function storeKinds(): StoreKind[] {
  return STORE_CONTRACTS.map((contract) => contract.kind);
}

/** Declared kinds for one class, deterministically ordered. */
export function storeKindsByClass(storeClass: StoreClass): StoreKind[] {
  return STORE_CONTRACTS.filter((contract) => contract.storeClass === storeClass).map(
    (contract) => contract.kind
  );
}

/* ------------------------------------------------------------------ */
/* Persisted key -> store kind                                         */
/* ------------------------------------------------------------------ */

const PROJECT = 'projects/[^/]+';

interface KeyRule {
  pattern: RegExp;
  kind: StoreKind;
}

/*
 * Ordered, most specific first. This is the ONLY place a persisted key is
 * mapped to a store: readers and release analysis must not repeat it.
 */
const KEY_RULES: readonly KeyRule[] = [
  /* local session/task authority */
  { pattern: /^\.toolnet\/tasks\/events\.jsonl$/u, kind: 'task_operations' },
  { pattern: /^\.toolnet\/tasks\/replication\/replicated(\/|$)/u, kind: 'task_replication_log' },
  { pattern: /^\.toolnet\/tasks\/replication\/cursor\.json$/u, kind: 'task_replication_cursor' },
  { pattern: /^\.toolnet\/tasks\/state\.json$/u, kind: 'task_projection' },
  { pattern: /^\.toolnet\/tasks(\/|$)/u, kind: 'task_projection' },
  { pattern: /^\.toolnet\/retrieval\/feedback\.jsonl$/u, kind: 'retrieval_feedback' },
  { pattern: /^\.toolnet\/retrieval\/telemetry\.jsonl$/u, kind: 'retrieval_telemetry' },
  { pattern: /^\.toolnet\/retrieval\/overrides\.json$/u, kind: 'retrieval_overrides' },
  { pattern: /^\.toolnet\/retrieval(\/|$)/u, kind: 'retrieval_overrides' },
  { pattern: /^\.toolnet\/runtime\/sources(\/|$)/u, kind: 'session_wal' },
  { pattern: /^\.toolnet\/runtime\/locks(\/|$)/u, kind: 'runtime_locks' },
  { pattern: /^\.toolnet\/runtime(\/|$)/u, kind: 'session_wal' },
  { pattern: /^\.toolnet\/journal(\/|$)/u, kind: 'journal' },
  { pattern: /^\.toolnet\/cache\/artifacts\/staging(\/|$)/u, kind: 'artifact_staging' },
  { pattern: /^\.toolnet\/cache(\/|$)/u, kind: 'artifact_staging' },
  { pattern: /^\.toolnet\/project\.json$/u, kind: 'project_manifest' },

  /* project-scoped authority */
  { pattern: new RegExp(`^${PROJECT}/memories(/|$)`, 'u'), kind: 'memory_records' },
  { pattern: new RegExp(`^${PROJECT}/knowledge/adr(/|$)`, 'u'), kind: 'adr_state' },
  { pattern: new RegExp(`^${PROJECT}/project\\.json$`, 'u'), kind: 'project_manifest' },

  /* derived, most specific first */
  { pattern: new RegExp(`^${PROJECT}/graph/artifacts(/|$)`, 'u'), kind: 'code_artifacts' },
  { pattern: new RegExp(`^${PROJECT}/graph/resolution(/|$)`, 'u'), kind: 'resolution_snapshot' },
  { pattern: new RegExp(`^${PROJECT}/graph/coverage\\.json$`, 'u'), kind: 'graph_coverage' },
  { pattern: new RegExp(`^${PROJECT}/graph/cross-service\\.json$`, 'u'), kind: 'cross_service' },
  { pattern: new RegExp(`^${PROJECT}/graph/fleet-export\\.json$`, 'u'), kind: 'fleet_export' },
  { pattern: new RegExp(`^${PROJECT}/graph/manifest\\.json$`, 'u'), kind: 'code_manifest' },
  { pattern: new RegExp(`^${PROJECT}/graph/current\\.json$`, 'u'), kind: 'code_graph' },
  { pattern: new RegExp(`^${PROJECT}/graph(/|$)`, 'u'), kind: 'code_graph' },
  { pattern: new RegExp(`^${PROJECT}/code/graph(/|$)`, 'u'), kind: 'code_graph' },
  { pattern: new RegExp(`^${PROJECT}/code/chunks(/|$)`, 'u'), kind: 'code_chunks' },
  { pattern: new RegExp(`^${PROJECT}/code/vectors(/|$)`, 'u'), kind: 'code_vectors' },
  { pattern: new RegExp(`^${PROJECT}/code/architecture(/|$)`, 'u'), kind: 'architecture_snapshot' },
  { pattern: new RegExp(`^${PROJECT}/code/analysis(/|$)`, 'u'), kind: 'code_analysis' },
  { pattern: new RegExp(`^${PROJECT}/code/visualization(/|$)`, 'u'), kind: 'visualization_graph' },
  { pattern: new RegExp(`^${PROJECT}/vectors(/|$)`, 'u'), kind: 'memory_vectors' },
  { pattern: new RegExp(`^${PROJECT}/memory(/|$)`, 'u'), kind: 'memory_records' },
  { pattern: new RegExp(`^${PROJECT}/runtime-traces(/|$)`, 'u'), kind: 'runtime_traces' },
  { pattern: new RegExp(`^${PROJECT}/snapshots(/|$)`, 'u'), kind: 'snapshot_archive' },
  { pattern: /(^|\/)snapshots\/[^/]+\/(memories|vectors|graph)\//u, kind: 'snapshot_archive' },

  /* daemon runtime directory (absolute or suffixed) */
  { pattern: /(^|\/)daemon-state\.json$/u, kind: 'daemon_state' },
  { pattern: /(^|\/)(daemon\.lock|daemon\.pid|daemon\.sock)$/u, kind: 'daemon_runtime_files' },
  { pattern: /(^|\/)logs\/daemon\.log$/u, kind: 'daemon_runtime_files' },
];

/** Classify a persisted storage key or local state path. */
export function classifyStorageKey(key: string): StorageKeyClassification {
  const normalized = key.replace(/^\/+/u, '');

  for (const rule of KEY_RULES) {
    if (rule.pattern.test(normalized)) {
      return {
        key: normalized,
        kind: rule.kind,
        storeClass: storeContract(rule.kind).storeClass,
        matched: true,
      };
    }
  }

  return { key: normalized, kind: null, storeClass: 'unknown', matched: false };
}

/* ------------------------------------------------------------------ */
/* Repository source path -> role                                      */
/* ------------------------------------------------------------------ */

interface SourceRule {
  pattern: RegExp;
  role: StorageSourceRole;
  kind: StoreKind | null;
}

/*
 * Ordered, most specific first. A repository file under `src/storage` is
 * classified by the contract it implements — never by a generic "the
 * directory was touched" rule.
 */
const SOURCE_RULES: readonly SourceRule[] = [
  { pattern: /^src\/storage\/index\.ts$/u, role: 'barrel', kind: null },
  { pattern: /^src\/storage\/compatibility\//u, role: 'infrastructure', kind: null },
  {
    pattern:
      /^src\/storage\/(types|provider|retrying-provider|encrypted-provider|cleanup-health)\.ts$/u,
    role: 'infrastructure',
    kind: null,
  },
  {
    pattern: /^src\/storage\/(local|s3|huggingface|github|google-drive)\//u,
    role: 'infrastructure',
    kind: null,
  },
  {
    pattern: /^src\/storage\/(test-connection|list-bucket-raw|list-bucket-tree)\.ts$/u,
    role: 'infrastructure',
    kind: null,
  },
  {
    pattern: /^src\/storage\/project\/(migrate|migrate-layout-v2|cleanup-layout-v1)\.ts$/u,
    role: 'migration',
    kind: null,
  },
  { pattern: /^src\/storage\/project\/layout\.ts$/u, role: 'migration', kind: null },
  { pattern: /^src\/storage\/project\//u, role: 'store', kind: 'project_manifest' },
  { pattern: /^src\/storage\/memory-store\.ts$/u, role: 'store', kind: 'memory_records' },
  {
    pattern: /^src\/storage\/type-resolution-store\.ts$/u,
    role: 'store',
    kind: 'resolution_snapshot',
  },
  { pattern: /^src\/storage\/code-graph-store\.ts$/u, role: 'store', kind: 'code_graph' },
  { pattern: /^src\/storage\/code-manifest-store\.ts$/u, role: 'store', kind: 'code_manifest' },
  { pattern: /^src\/storage\/graph-coverage-store\.ts$/u, role: 'store', kind: 'graph_coverage' },
  { pattern: /^src\/storage\/cross-service-store\.ts$/u, role: 'store', kind: 'cross_service' },
  { pattern: /^src\/storage\/fleet-export-store\.ts$/u, role: 'store', kind: 'fleet_export' },
  { pattern: /^src\/storage\/code-chunk-store\.ts$/u, role: 'store', kind: 'code_chunks' },
  { pattern: /^src\/storage\/code-vector-store\.ts$/u, role: 'store', kind: 'code_vectors' },
  { pattern: /^src\/storage\/vector-store\.ts$/u, role: 'store', kind: 'memory_vectors' },
  {
    pattern: /^src\/storage\/architecture-store\.ts$/u,
    role: 'store',
    kind: 'architecture_snapshot',
  },
  { pattern: /^src\/storage\/code-analysis-store\.ts$/u, role: 'store', kind: 'code_analysis' },
  {
    pattern: /^src\/storage\/visualization-store\.ts$/u,
    role: 'store',
    kind: 'visualization_graph',
  },
];

/** Classify a repository path (relative to the project root). */
export function classifyStorageSourcePath(path: string): StorageSourceClassification {
  const normalized = path.replace(/^\.?\//u, '').replace(/\\/gu, '/');

  for (const rule of SOURCE_RULES) {
    if (rule.pattern.test(normalized)) {
      const storeClass: StoreClassOrUnknown = rule.kind
        ? storeContract(rule.kind).storeClass
        : rule.role === 'migration'
          ? 'authority'
          : 'unknown';

      return { path: normalized, role: rule.role, kind: rule.kind, storeClass };
    }
  }

  return { path: normalized, role: 'unclassified', kind: null, storeClass: 'unknown' };
}

/** True when a source role carries no persisted data contract. */
export function isContractFreeRole(role: StorageSourceRole): boolean {
  return role === 'barrel' || role === 'infrastructure';
}
