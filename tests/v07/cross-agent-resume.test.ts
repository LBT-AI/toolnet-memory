import { describe, expect, it } from 'vitest';

import type { AuthorityOperation } from '../../src/v0.7/authority-state.js';

import { CheckpointEngine } from '../../src/v0.7/checkpoint.js';

import { InMemoryCloudAuthority } from '../../src/v0.7/cloud-authority.js';

import { resumeFromCloud } from '../../src/v0.7/resume.js';

const NOW = 1_700_000_000_000;

const TASK_TITLES: Record<string, string> = {
  T1: 'Define order schema',
  T2: 'Create migrations',
  T3: 'Implement order API',
  T4: 'Add queue worker',
  T5: 'Write unit tests for order API',
  T6: 'Add authentication guard',
  T7: 'Deploy staging worker',
  T8: 'Fix worker retry handling',
  T9: 'Write operations runbook',
  T10: 'Load test the queue',
};

interface Harness {
  clock: { value: number };
  authority: InMemoryCloudAuthority;
  engine: CheckpointEngine;
  revision: { value: number };
  commit: (input: {
    agentId: string;
    operations: AuthorityOperation[];
    lease?: { leaseId: string; fencingToken: number };
    codeRevision?: string;
  }) => Promise<void>;
}

function harness(): Harness {
  const clock = { value: NOW };
  const authority = new InMemoryCloudAuthority({ now: () => clock.value });

  authority.seed({
    projectId: 'project-a',
    projectName: 'Project A',
    branch: 'main',
    codeRevision: 'sha-agy',
    tasks: Object.entries(TASK_TITLES).map(([id, title]) => ({
      id,
      title,
      status: 'pending' as const,
    })),
    rules: [
      {
        id: 'no-secret-logs',
        text: 'Never log raw access tokens.',
        mandatory: true,
        verified: true,
        provenance: 'user',
      },
      {
        id: 'public-api',
        text: 'Preserve the public API contract.',
        mandatory: true,
        verified: true,
        provenance: 'code',
      },
    ],
    flows: [
      {
        id: 'order-flow',
        description: 'API -> Queue -> Worker -> DB',
        critical: true,
        verified: true,
        provenance: 'code',
      },
      {
        id: 'admin-flow',
        description: 'Admin UI -> Admin API -> DB',
        critical: false,
        verified: true,
        provenance: 'code',
      },
    ],
    decisions: ['Worker retries use exponential backoff with jitter'],
  });

  const engine = new CheckpointEngine({
    authority,
    mode: 'strict-cloud-only',
    now: () => clock.value,
  });

  const revision = { value: 0 };

  return {
    clock,
    authority,
    engine,
    revision,
    async commit(input) {
      const result = await engine.submit({
        projectId: 'project-a',
        agentId: input.agentId,
        operations: input.operations,
        expectedRevision: revision.value,
        now: clock.value,
        codeRevision: input.codeRevision ?? 'sha-agy',
        ...(input.lease ?? {}),
      });

      expect(result.status, JSON.stringify(result)).toBe('acknowledged');
      revision.value = result.revision ?? revision.value;
    },
  };
}

async function runAgyTasksOneToSeven(input: Harness): Promise<void> {
  for (const id of ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']) {
    const grant = await input.authority.acquireLease({
      projectId: 'project-a',
      taskId: id,
      agentId: 'agy',
      ttlMs: 60_000,
      now: input.clock.value,
    });

    await input.commit({
      agentId: 'agy',
      lease: { leaseId: grant.lease.leaseId, fencingToken: grant.lease.fencingToken },
      operations: [
        { type: 'task.test.recorded', taskId: id, name: `${id} verified`, outcome: 'pass' },
        { type: 'task.status', taskId: id, status: 'completed' },
      ],
    });

    await input.authority.release({
      projectId: 'project-a',
      taskId: id,
      agentId: 'agy',
      leaseId: grant.lease.leaseId,
      fencingToken: grant.lease.fencingToken,
      now: input.clock.value,
    });
  }
}

describe('v0.7 acceptance: AGY is killed during T8 and Codex takes over', () => {
  it('resumes the exact task board, rules, flow, files and next action without a manual handoff', async () => {
    const input = harness();

    await runAgyTasksOneToSeven(input);

    const agyLease = await input.authority.acquireLease({
      projectId: 'project-a',
      taskId: 'T8',
      agentId: 'agy',
      ttlMs: 60_000,
      now: input.clock.value,
    });

    await input.commit({
      agentId: 'agy',
      lease: { leaseId: agyLease.lease.leaseId, fencingToken: agyLease.lease.fencingToken },
      operations: [
        {
          type: 'task.status',
          taskId: 'T8',
          status: 'in_progress',
          nextAction: 'Finish retry error propagation and run the integration suite.',
        },
        {
          type: 'task.work',
          taskId: 'T8',
          done: ['Retry loop implemented'],
          remaining: ['Finish retry error propagation', 'Run integration tests'],
        },
        { type: 'task.file.touched', taskId: 'T8', path: 'src/worker/retry.ts' },
        {
          type: 'task.evidence.add',
          taskId: 'T8',
          ref: 'test-run:42',
          summary: 'unit tests for retry pass; integration suite not run',
        },
        { type: 'task.test.recorded', taskId: 'T8', name: 'retry unit', outcome: 'pass' },
      ],
    });

    /*
     * SIGKILL boundary: the last event never reached the cloud. It must stay
     * unacknowledged and must not appear in the resumed state.
     */
    input.authority.setOffline(true);

    const unacknowledged = await input.engine.submit({
      projectId: 'project-a',
      agentId: 'agy',
      operations: [{ type: 'task.file.touched', taskId: 'T8', path: 'src/worker/unverified.ts' }],
      expectedRevision: input.revision.value,
      now: input.clock.value,
      leaseId: agyLease.lease.leaseId,
      fencingToken: agyLease.lease.fencingToken,
      codeRevision: 'sha-agy',
    });

    expect(unacknowledged.status).toBe('unacknowledged');
    expect(input.engine.status().state).toBe('unavailable');

    input.authority.setOffline(false);

    const afterKill = await input.authority.fetchSnapshot('project-a');

    expect(afterKill.tasks.T8.filesTouched).toEqual(['src/worker/retry.ts']);

    /* The agent process is gone; its lease expires and a new agent takes over. */
    input.clock.value += 10 * 60_000;

    const codexLease = await input.authority.acquireLease({
      projectId: 'project-a',
      taskId: 'T8',
      agentId: 'codex',
      ttlMs: 60_000,
      now: input.clock.value,
    });

    expect(codexLease.lease.fencingToken).toBe(agyLease.lease.fencingToken + 1);

    /* A zombie AGY writer must not be able to overwrite Codex work. */
    await expect(
      input.authority.commit({
        projectId: 'project-a',
        agentId: 'agy',
        operations: [{ type: 'task.file.touched', taskId: 'T8', path: 'stale.ts' }],
        expectedRevision: input.revision.value,
        now: input.clock.value,
        leaseId: agyLease.lease.leaseId,
        fencingToken: agyLease.lease.fencingToken,
        codeRevision: 'sha-agy',
      })
    ).rejects.toMatchObject({ code: 'AUTHORITY_LEASE_FENCED' });

    /* A fresh Codex session reads only from the cloud. */
    const resumed = await resumeFromCloud({
      authority: input.authority,
      projectId: 'project-a',
      mode: 'standard',
      budgetTokens: 1_500,
      currentCodeRevision: 'sha-codex',
    });

    expect(resumed.available).toBe(true);

    if (!resumed.available) {
      throw new Error(`expected a resume packet, got ${resumed.code}`);
    }

    expect(resumed.text).toContain('completed=T1; T2; T3; T4; T5; T6; T7');
    expect(resumed.text).toContain('active=T8 (in_progress)');
    expect(resumed.text).toContain('pending=T9; T10');
    expect(resumed.text).toContain('Fix worker retry handling');
    expect(resumed.text).toContain('Retry loop implemented');
    expect(resumed.text).toContain('Finish retry error propagation');
    expect(resumed.text).toContain('src/worker/retry.ts');
    expect(resumed.text).toContain('Never log raw access tokens.');
    expect(resumed.text).toContain('Preserve the public API contract.');
    expect(resumed.text).toContain('API -> Queue -> Worker -> DB');
    expect(resumed.text).toContain('Finish retry error propagation and run the integration suite.');
    expect(resumed.warnings.some((warning) => warning.includes('Code moved from sha-agy'))).toBe(
      true
    );
    expect(resumed.warnings).toContain(
      'CODE_REVISION_MISMATCH: verify working tree before editing'
    );

    /* The new writer can proceed; the stale writer cannot. */
    await input.commit({
      agentId: 'codex',
      lease: { leaseId: codexLease.lease.leaseId, fencingToken: codexLease.lease.fencingToken },
      operations: [
        { type: 'task.work', taskId: 'T8', remaining: ['Run integration tests'] },
        { type: 'task.file.touched', taskId: 'T8', path: 'src/worker/retry.ts' },
      ],
      codeRevision: 'sha-codex',
    });

    const final = await input.authority.fetchSnapshot('project-a');

    expect(final.revision).toBe(input.revision.value);
    expect(final.tasks.T8.filesTouched).toEqual(['src/worker/retry.ts']);
    expect(final.tasks.T8.status).toBe('in_progress');
    expect(final.tasks.T9.status).toBe('pending');
    expect(final.tasks.T10.status).toBe('pending');
  });

  it('never completes a task whose verification was not recorded', async () => {
    const input = harness();

    const grant = await input.authority.acquireLease({
      projectId: 'project-a',
      taskId: 'T1',
      agentId: 'agy',
      ttlMs: 60_000,
      now: input.clock.value,
    });

    const result = await input.engine.submit({
      projectId: 'project-a',
      agentId: 'agy',
      operations: [
        {
          type: 'task.status',
          taskId: 'T1',
          status: 'completed',
          nextAction: 'Ship it',
        },
      ],
      expectedRevision: 0,
      now: input.clock.value,
      leaseId: grant.lease.leaseId,
      fencingToken: grant.lease.fencingToken,
    });

    expect(result.status).toBe('unacknowledged');
    expect(result.code).toBe('AUTHORITY_COMPLETION_REQUIRES_PASSING_TEST');

    const snapshot = await input.authority.fetchSnapshot('project-a');

    expect(snapshot.tasks.T1.status).toBe('pending');
  });

  it('keeps projects isolated and refuses a resume from another project', async () => {
    const input = harness();

    await runAgyTasksOneToSeven(input);

    const other = await resumeFromCloud({ authority: input.authority, projectId: 'project-b' });

    expect(other.available).toBe(false);

    if (!other.available) {
      expect(other.code).toBe('AUTHORITY_PROJECT_UNKNOWN');
    }

    const failed = await (async () => {
      input.authority.setOffline(true);
      const result = await resumeFromCloud({ authority: input.authority, projectId: 'project-a' });
      input.authority.setOffline(false);
      return result;
    })();

    expect(failed.available).toBe(false);

    if (!failed.available) {
      expect(failed.code).toBe('AUTHORITY_UNAVAILABLE');
    }
  });
});
