/*
 * Phase 75 — Architecture Decision Records (ADR).
 *
 * ADRs are structured, project-scoped, persistent engineering knowledge. They
 * are NOT chat history, raw transcripts, task state or AI-inferred summaries.
 *
 * The structured store is the authority. Markdown is a deterministic
 * projection/export only.
 */

export const ADR_SCHEMA = 'toolnet.adr.v1' as const;
export const ADR_RECORD_SCHEMA = 'toolnet.adr-record.v1' as const;

/**
 * ADR lifecycle status. A boolean `active` flag is deliberately avoided: the
 * lifecycle is explicit so callers cannot confuse "deprecated" with
 * "superseded".
 */
export type AdrStatus = 'proposed' | 'accepted' | 'deprecated' | 'superseded' | 'rejected';

export const ADR_STATUSES: readonly AdrStatus[] = [
  'proposed',
  'accepted',
  'deprecated',
  'superseded',
  'rejected',
];

/**
 * Deterministic, project-scoped human identifier: `ADR-0001`.
 *
 * Numbers are never reused, even after a record is superseded/deprecated.
 */
export type AdrHumanId = string;

export interface AdrAlternative {
  title: string;
  description?: string;
  rejectedBecause?: string;
}

export interface AdrConsequences {
  positive: string[];
  negative: string[];
  neutral: string[];
}

export type AdrReferenceKind = 'file' | 'url' | 'adr' | 'commit' | 'spec';

export interface AdrReference {
  kind: AdrReferenceKind;
  target: string;
  note?: string;
}

export type AdrProvenanceSource = 'manual' | 'migration' | 'import';

export interface AdrProvenance {
  source: AdrProvenanceSource;
  /** Optional agent/session identifier. Never a transcript. */
  actor?: string;
}

/**
 * Canonical ADR record.
 *
 * The canonical key is `<projectId>:ADR-0001`; the human id (`ADR-0001`) is
 * what users read and write.
 */
export interface ArchitectureDecisionRecord {
  schema: typeof ADR_RECORD_SCHEMA;

  /** Canonical key: `<projectId>:<humanId>`. */
  id: string;

  projectId: string;

  /** Monotonic project-scoped number. Never reused. */
  number: number;

  /** Human identifier, e.g. `ADR-0001`. */
  humanId: AdrHumanId;

  title: string;

  status: AdrStatus;

  context: string;
  decision: string;

  consequences: AdrConsequences;

  alternatives: AdrAlternative[];

  /** Project-relative affected paths. Never absolute, never escaping the root. */
  affectedPaths: string[];

  /** Affected symbol identifiers or qualified names (exact match only). */
  affectedSymbols: string[];

  tags: string[];

  references: AdrReference[];

  /** Human ids of ADRs this record supersedes. */
  supersedes: string[];

  /** Human id of the ADR that superseded this record, when applicable. */
  supersededBy?: AdrHumanId;

  /** Monotonic revision. Increments on every mutation. */
  revision: number;

  createdAt: string;
  updatedAt: string;

  provenance: AdrProvenance;
}

export type AdrOperation =
  'created' | 'updated' | 'sections_updated' | 'status_changed' | 'superseded' | 'imported';

/**
 * Append-only audit event. `requestHash` enables deterministic idempotency:
 * replaying the exact same intent does not append a second event.
 */
export interface AdrHistoryEvent {
  /** Deterministic id: hash of adrId + afterRevision + operation. */
  id: string;

  adrId: string;
  humanId: AdrHumanId;

  operation: AdrOperation;

  at: string;

  beforeRevision: number;
  afterRevision: number;

  changedFields: string[];

  /** Deterministic hash of the canonical request payload. */
  requestHash: string;
}

export interface AdrStateV1 {
  schema: typeof ADR_SCHEMA;
  version: 1;
  projectId: string;

  /** Next ADR number to allocate. Numbers are never reused. */
  nextNumber: number;

  records: ArchitectureDecisionRecord[];
  history: AdrHistoryEvent[];

  createdAt: string;
  updatedAt: string;
}

export interface AdrCreateInput {
  title: string;
  context?: string;
  decision?: string;
  status?: AdrStatus;
  consequences?: Partial<AdrConsequences>;
  alternatives?: AdrAlternative[];
  affectedPaths?: string[];
  affectedSymbols?: string[];
  tags?: string[];
  references?: AdrReference[];
  /** Explicit project-scoped number, used by deterministic import. */
  number?: number;
  provenance?: AdrProvenance;
  /** Optional caller supplied idempotency material. */
  requestId?: string;
}

export type AdrUpdatableSections = {
  title?: string;
  context?: string;
  decision?: string;
  consequences?: Partial<AdrConsequences>;
  alternatives?: AdrAlternative[];
  affectedPaths?: string[];
  affectedSymbols?: string[];
  tags?: string[];
  references?: AdrReference[];
};

export interface AdrMutationResult {
  record: ArchitectureDecisionRecord;
  /** True when the request was a deterministic replay and nothing changed. */
  idempotent: boolean;
  /** History event appended by this mutation (absent on idempotent replay). */
  event?: AdrHistoryEvent;
}

export interface AdrListFilter {
  status?: AdrStatus | 'all';
  tag?: string;
  limit?: number;
  offset?: number;
}

export interface AdrSearchResult {
  record: ArchitectureDecisionRecord;
  score: number;
}
