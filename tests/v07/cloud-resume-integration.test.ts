import { describe, expect, it } from 'vitest';

import { InMemoryCloudAuthority } from '../../src/v0.7/cloud-authority.js';
import { resumeFromCloud } from '../../src/v0.7/resume.js';
import type { AuthoritySeed } from '../../src/v0.7/authority-state.js';

describe('v0.7 cloud resume integration', () => {
  it('compiles a resume packet from an acknowledged checkpoint', async () => {
    const authority = new InMemoryCloudAuthority();
    const projectId = 'project-a';
    authority.seed({
      projectId,
      projectName: 'Project A',
      branch: 'main',
      codeRevision: 'rev-1',
      tasks: [
        { id: 'T1', title: 'Task 1', status: 'completed' },
        { id: 'T8', title: 'Implement feature X', status: 'in_progress' },
        { id: 'T9', title: 'Task 9', status: 'pending' },
        { id: 'T10', title: 'Task 10', status: 'pending' },
      ],
      rules: [
        {
          id: 'R1',
          text: 'Never commit secrets',
          mandatory: true,
          provenance: 'user',
          verified: true,
        },
      ],
      flows: [
        { id: 'F1', description: 'Auth flow', critical: true, provenance: 'code', verified: true },
      ],
      decisions: ['Use cloud authority'],
    });

    // T1 needs a passing test before completion is allowed.
    const t1Lease = await authority.acquireLease({
      projectId,
      taskId: 'T1',
      agentId: 'agy',
      ttlMs: 60_000,
      now: Date.now(),
    });
    const snap0 = await authority.fetchSnapshot(projectId);
    await authority.commit({
      projectId,
      agentId: 'agy',
      expectedRevision: snap0.revision,
      leaseId: t1Lease.lease.leaseId,
      fencingToken: t1Lease.lease.fencingToken,
      operations: [{ type: 'task.test.recorded', taskId: 'T1', name: 't1-test', outcome: 'pass' }],
      now: Date.now(),
    });
    const snap1 = await authority.fetchSnapshot(projectId);
    const t1Lease2 = await authority.acquireLease({
      projectId,
      taskId: 'T1',
      agentId: 'agy',
      ttlMs: 60_000,
      now: Date.now(),
    });
    await authority.commit({
      projectId,
      agentId: 'agy',
      expectedRevision: snap1.revision,
      leaseId: t1Lease2.lease.leaseId,
      fencingToken: t1Lease2.lease.fencingToken,
      operations: [{ type: 'task.status', taskId: 'T1', status: 'completed' }],
      now: Date.now(),
    });

    // T8 in progress with work + file touched -> checkpoint.
    const t8Lease = await authority.acquireLease({
      projectId,
      taskId: 'T8',
      agentId: 'agy',
      ttlMs: 60_000,
      now: Date.now(),
    });
    const snap2 = await authority.fetchSnapshot(projectId);
    const cp = await authority.commit({
      projectId,
      agentId: 'agy',
      expectedRevision: snap2.revision,
      leaseId: t8Lease.lease.leaseId,
      fencingToken: t8Lease.lease.fencingToken,
      operations: [
        {
          type: 'task.work',
          taskId: 'T8',
          done: ['half'],
          remaining: ['finish'],
          nextAction: 'continue X',
        },
        { type: 'task.file.touched', taskId: 'T8', path: 'src/x.ts' },
      ],
      now: Date.now(),
    });
    expect(cp.acknowledged).toBe(true);

    const result = await resumeFromCloud({
      authority,
      projectId,
      mode: 'standard',
      budgetTokens: 1_500,
    });

    expect(result.available).toBe(true);
    if (result.available) {
      expect(result.text).toContain('Project A');
      expect(result.text).toContain('Never commit secrets');
      expect(result.text).toContain('Auth flow');
      expect(result.text).toContain('T8');
      expect(result.text).toContain('T1');
      expect(result.revision).toBeGreaterThan(0);
    }
  });

  it('returns unavailable when cloud has no checkpoint', async () => {
    const authority = new InMemoryCloudAuthority();
    authority.seed({ projectId: 'p2', projectName: 'P2' });
    const result = await resumeFromCloud({ authority, projectId: 'p2' });
    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.code).toBe('NO_ACKNOWLEDGED_CHECKPOINT');
    }
  });

  it('returns unavailable when cloud is unreachable (no fallback)', async () => {
    const authority = new InMemoryCloudAuthority();
    authority.seed({ projectId: 'p3', projectName: 'P3' });
    authority.setOffline(true);
    const result = await resumeFromCloud({ authority, projectId: 'p3' });
    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.code).toBe('AUTHORITY_UNAVAILABLE');
    }
  });
});
