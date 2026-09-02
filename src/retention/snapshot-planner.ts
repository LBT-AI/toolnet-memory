import type { SnapshotManifest } from '../snapshot/types.js';

import type { GcCandidate, GcProtectedEntry, RetentionPolicy } from './types.js';

export interface SnapshotGcSelection {
  candidates: GcCandidate[];
  protected: GcProtectedEntry[];
}

function snapshotAgeMs(createdAt: string, nowMs: number): number | null {
  const timestamp = Date.parse(createdAt);

  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return Math.max(0, nowMs - timestamp);
}

export function selectSnapshotGcCandidates(
  snapshots: SnapshotManifest[],
  policy: RetentionPolicy,
  nowMs = Date.now()
): SnapshotGcSelection {
  const ordered = [...snapshots].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  );

  const candidates: GcCandidate[] = [];

  const protectedEntries: GcProtectedEntry[] = [];

  const ageGuardMs =
    policy.snapshotMaxAgeDays === undefined ? undefined : policy.snapshotMaxAgeDays * 86_400_000;

  for (let index = 0; index < ordered.length; index += 1) {
    const snapshot = ordered[index];

    const age = snapshotAgeMs(snapshot.createdAt, nowMs);

    if (index < policy.keepSnapshots) {
      protectedEntries.push({
        scope: 'remote',
        category: 'snapshot',
        target: snapshot.id,
        reason: `one of newest ${policy.keepSnapshots} snapshots`,
      });
      continue;
    }

    if (age === null) {
      protectedEntries.push({
        scope: 'remote',
        category: 'snapshot',
        target: snapshot.id,
        reason: 'snapshot timestamp is invalid; uncertain data is retained',
      });
      continue;
    }

    if (ageGuardMs !== undefined && age < ageGuardMs) {
      protectedEntries.push({
        scope: 'remote',
        category: 'snapshot',
        target: snapshot.id,
        reason: `snapshot has not reached ${policy.snapshotMaxAgeDays} day age guard`,
      });
      continue;
    }

    candidates.push({
      id: `snapshot:${snapshot.id}`,
      scope: 'remote',
      category: 'snapshot',
      target: snapshot.id,
      snapshotId: snapshot.id,
      reason:
        policy.snapshotMaxAgeDays === undefined
          ? `snapshot exceeds keep limit ${policy.keepSnapshots}`
          : `snapshot exceeds keep limit ${policy.keepSnapshots} and age guard ${policy.snapshotMaxAgeDays} days`,
      action: 'delete-snapshot',
      ageMs: age,
    });
  }

  /*
   * Explicit permanent protection boundary.
   * Remote multi-host operation log is not listed,
   * compacted, rewritten or deleted by this subsystem.
   */
  protectedEntries.push({
    scope: 'remote',
    category: 'protected-remote-operation',
    target: 'projects/<project>/operations/**',
    reason: 'append-only multi-host operations are outside GC authority',
  });

  return {
    candidates,
    protected: protectedEntries,
  };
}
