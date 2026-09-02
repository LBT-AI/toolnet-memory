export type GcScope = 'local' | 'remote';

export type GcCategory =
  | 'runtime-lock'
  | 'runtime-temp'
  | 'snapshot'
  | 'protected-memory'
  | 'protected-work'
  | 'protected-context'
  | 'protected-journal'
  | 'protected-wal'
  | 'protected-legacy-session'
  | 'protected-remote-operation';

export interface RetentionPolicy {
  /**
   * Always keep at least this many newest snapshots.
   */
  keepSnapshots: number;

  /**
   * Optional additional age guard.
   *
   * When configured, snapshots outside keepSnapshots
   * are deleted only after reaching this age.
   */
  snapshotMaxAgeDays?: number;

  /**
   * Temporary runtime artifacts must be older than
   * this before becoming GC candidates.
   */
  runtimeDays: number;

  /**
   * Local lock must be older than this before it can
   * be considered stale.
   */
  staleLockMinutes: number;
}

export interface GcCandidate {
  id: string;
  scope: GcScope;
  category: GcCategory;
  target: string;
  reason: string;
  action: 'delete-file' | 'delete-snapshot';
  ageMs?: number;
  size?: number;
  expectedMtimeMs?: number;
  snapshotId?: string;
}

export interface GcProtectedEntry {
  scope: GcScope;
  category: GcCategory;
  target: string;
  reason: string;
}

export interface GcPlan {
  version: 1;
  generatedAt: string;
  projectId: string;
  projectRoot: string;
  policy: RetentionPolicy;
  candidates: GcCandidate[];
  protected: GcProtectedEntry[];
  estimatedBytes: number;
}

export interface GcExecutionItem {
  candidate: GcCandidate;
  status: 'deleted' | 'skipped' | 'failed';
  detail?: string;
}

export interface GcExecutionResult {
  dryRun: boolean;
  deleted: number;
  skipped: number;
  failed: number;
  bytesFreed: number;
  items: GcExecutionItem[];
}
