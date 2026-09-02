import { describe, expect, it } from 'vitest';

import { selectSnapshotGcCandidates } from '../../src/retention/snapshot-planner.js';

import { retentionPolicy } from '../../src/retention/policy.js';

function snapshot(id: string, createdAt: string) {
  return {
    version: 1 as const,
    id,
    projectId: 'project',
    createdAt,
    reason: 'test',
    objects: [],
  };
}

describe('snapshot retention', () => {
  it('always protects newest N snapshots', () => {
    const snapshots = [
      snapshot('s3', '2026-01-03T00:00:00.000Z'),
      snapshot('s2', '2026-01-02T00:00:00.000Z'),
      snapshot('s1', '2026-01-01T00:00:00.000Z'),
    ];

    const result = selectSnapshotGcCandidates(
      snapshots,
      retentionPolicy({
        keepSnapshots: 2,
      }),
      Date.parse('2026-02-01T00:00:00.000Z')
    );

    expect(result.candidates.map((item) => item.snapshotId)).toEqual(['s1']);
  });

  it('respects optional snapshot age guard', () => {
    const snapshots = [
      snapshot('new', '2026-01-10T00:00:00.000Z'),
      snapshot('old', '2026-01-01T00:00:00.000Z'),
    ];

    const result = selectSnapshotGcCandidates(
      snapshots,
      retentionPolicy({
        keepSnapshots: 1,
        snapshotMaxAgeDays: 30,
      }),
      Date.parse('2026-01-20T00:00:00.000Z')
    );

    expect(result.candidates).toHaveLength(0);
  });
});
