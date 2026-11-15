import { describe, expect, it } from 'vitest';

import {
  AuthorityError,
  createAuthorityState,
  restoreAuthorityState,
  type AuthorityCommitRequest,
  type AuthoritySeed,
} from '../../src/v0.7/authority-state.js';

const NOW = 1_700_000_000_000;

function seed(): AuthoritySeed {
  return {
    projectId: 'project-a',
    projectName: 'Project A',
    branch: 'main',
    codeRevision: 'sha-1',
    tasks: [
      { id: 'T1', title: 'Schema', status: 'pending' },
      { id: 'T8', title: 'Retry handling', status: 'pending' },
      { id: 'T9', title: 'Docs', status: 'pending' },
    ],
    rules: [
      {
        id: 'no-secrets',
        text: 'Never log secrets.',
        mandatory: true,
        verified: true,
        provenance: 'user',
      },
    ],
    flows: [
      {
        id: 'api',
        description: 'API -> Queue -> DB',
        critical: true,
        verified: true,
        provenance: 'code',
      },
    ],
  };
}

function request(overrides: Partial<AuthorityCommitRequest> = {}): AuthorityCommitRequest {
  return {
    projectId: 'project-a',
    agentId: 'agy',
    operations: [{ type: 'decision.add', text: 'use R2 for history' }],
    expectedRevision: 0,
    now: NOW,
    ...overrides,
  };
}

describe('v0.7 authority state machine', () => {
  it('advances revisions atomically and records an acknowledged checkpoint', () => {
    const machine = createAuthorityState(seed(), NOW);

    const result = machine.commit(request());

    expect(result.acknowledged).toBe(true);
    expect(result.revision).toBe(1);
    expect(result.checkpoint.revision).toBe(1);
    expect(machine.snapshot().checkpoint?.sourceAgent).toBe('agy');
  });

  it('rejects a commit written against a stale revision and applies nothing', () => {
    const machine = createAuthorityState(seed(), NOW);

    machine.commit(request());

    expect(() =>
      machine.commit(
        request({ expectedRevision: 0, operations: [{ type: 'decision.add', text: 'x' }] })
      )
    ).toThrowError(/Expected revision 0/);

    const snapshot = machine.snapshot();

    expect(snapshot.revision).toBe(1);
    expect(snapshot.decisions).toEqual(['use R2 for history']);
  });

  it('returns the original ACK for a replayed idempotency key and rejects key reuse', () => {
    const machine = createAuthorityState(seed(), NOW);

    const first = machine.commit(request({ idempotencyKey: 'batch-1' }));
    const second = machine.commit(request({ idempotencyKey: 'batch-1' }));

    expect(second.duplicate).toBe(true);
    expect(second.revision).toBe(first.revision);
    expect(machine.snapshot().revision).toBe(1);

    expect(() =>
      machine.commit(
        request({
          idempotencyKey: 'batch-1',
          operations: [{ type: 'decision.add', text: 'different' }],
        })
      )
    ).toThrowError(/already used with a different payload/);
  });

  it('requires ownership before mutating a task', () => {
    const machine = createAuthorityState(seed(), NOW);
    expect(() =>
      machine.commit(
        request({
          operations: [{ type: 'task.file.touched', taskId: 'T8', path: 'a.ts' }],
        })
      )
    ).toThrowError(/has no active lease/);
  });

  it('refuses completion without a passing test, then verifies it once a test passes', () => {
    const machine = createAuthorityState(seed(), NOW);
    const lease = machine.acquireLease({
      projectId: 'project-a',
      taskId: 'T1',
      agentId: 'agy',
      ttlMs: 60_000,
      now: NOW,
    });

    expect(() =>
      machine.commit(
        request({
          expectedRevision: 0,
          leaseId: lease.lease.leaseId,
          fencingToken: lease.lease.fencingToken,
          operations: [{ type: 'task.status', taskId: 'T1', status: 'completed' }],
        })
      )
    ).toThrowError(/without a passing test/);

    expect(machine.snapshot().revision).toBe(0);
    expect(machine.snapshot().tasks.T1.status).toBe('pending');

    const recorded = machine.commit(
      request({
        expectedRevision: 0,
        leaseId: lease.lease.leaseId,
        fencingToken: lease.lease.fencingToken,
        operations: [
          { type: 'task.test.recorded', taskId: 'T1', name: 'schema test', outcome: 'pass' },
          { type: 'task.status', taskId: 'T1', status: 'completed' },
        ],
      })
    );

    expect(recorded.acknowledged).toBe(true);
    expect(machine.snapshot().tasks.T1.verification).toBe('verified');
  });

  it('fences a stale writer after another agent takes over an expired lease', () => {
    const machine = createAuthorityState(seed(), NOW);

    const agy = machine.acquireLease({
      projectId: 'project-a',
      taskId: 'T8',
      agentId: 'agy',
      ttlMs: 1_000,
      now: NOW,
    });

    const later = NOW + 10_000;

    const codex = machine.acquireLease({
      projectId: 'project-a',
      taskId: 'T8',
      agentId: 'codex',
      ttlMs: 60_000,
      now: later,
    });

    expect(codex.lease.fencingToken).toBe(agy.lease.fencingToken + 1);

    expect(() =>
      machine.commit(
        request({
          agentId: 'agy',
          now: later,
          leaseId: agy.lease.leaseId,
          fencingToken: agy.lease.fencingToken,
          operations: [{ type: 'task.file.touched', taskId: 'T8', path: 'stale.ts' }],
        })
      )
    ).toThrowError(/Stale writer rejected/);

    const accepted = machine.commit(
      request({
        agentId: 'codex',
        now: later,
        leaseId: codex.lease.leaseId,
        fencingToken: codex.lease.fencingToken,
        operations: [{ type: 'task.file.touched', taskId: 'T8', path: 'retry.ts' }],
      })
    );

    expect(accepted.acknowledged).toBe(true);
    expect(machine.snapshot().tasks.T8.filesTouched).toEqual(['retry.ts']);
  });

  it('keeps an unexpired lease exclusive to its owner', () => {
    const machine = createAuthorityState(seed(), NOW);

    machine.acquireLease({
      projectId: 'project-a',
      taskId: 'T8',
      agentId: 'agy',
      ttlMs: 60_000,
      now: NOW,
    });

    expect(() =>
      machine.acquireLease({
        projectId: 'project-a',
        taskId: 'T8',
        agentId: 'codex',
        ttlMs: 60_000,
        now: NOW + 1_000,
      })
    ).toThrowError(/is leased by agy/);
  });

  it('rejects cross-project commits and unknown projects', () => {
    const machine = createAuthorityState(seed(), NOW);

    expect(() => machine.commit(request({ projectId: 'project-b' }))).toThrowError(AuthorityError);

    const restored = restoreAuthorityState(machine.snapshot());

    expect(restored.projectId()).toBe('project-a');
  });

  it('continues revisions after a Durable Object cold start', () => {
    const machine = createAuthorityState(seed(), NOW);

    machine.commit(request());

    const restored = restoreAuthorityState(machine.snapshot());

    const next = restored.commit(
      request({ expectedRevision: 1, operations: [{ type: 'decision.add', text: 'use R2' }] })
    );

    expect(next.revision).toBe(2);
    expect(restored.snapshot().decisions).toEqual(['use R2 for history', 'use R2']);
  });

  it('rolls back the whole batch when one operation is invalid', () => {
    const machine = createAuthorityState(seed(), NOW);
    const lease = machine.acquireLease({
      projectId: 'project-a',
      taskId: 'T8',
      agentId: 'agy',
      ttlMs: 60_000,
      now: NOW,
    });

    expect(() =>
      machine.commit(
        request({
          leaseId: lease.lease.leaseId,
          fencingToken: lease.lease.fencingToken,
          operations: [
            { type: 'task.work', taskId: 'T8', done: ['retry implemented'] },
            { type: 'task.file.touched', taskId: 'T9', path: 'x.ts' },
          ],
        })
      )
    ).toThrowError(/has no active lease/);

    const snapshot = machine.snapshot();

    expect(snapshot.revision).toBe(0);
    expect(snapshot.tasks.T8.done).toEqual([]);
  });

  it('marks inferred knowledge unverified regardless of the caller claim', () => {
    const machine = createAuthorityState(seed(), NOW);

    machine.commit(
      request({
        operations: [
          {
            type: 'rule.upsert',
            rule: {
              id: 'guessed',
              text: 'Probably uses Redis.',
              mandatory: true,
              verified: true,
              provenance: 'inferred',
            },
          },
        ],
      })
    );

    const rule = machine.snapshot().rules.find((item) => item.id === 'guessed');

    expect(rule?.verified).toBe(false);
  });
});
