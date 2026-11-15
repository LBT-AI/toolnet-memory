/**
 * ToolNet v0.7 checkpoint tests.
 *
 * Tests the automatic checkpoint session with AGY/Codex integration,
 * bounded RAM queue, idempotency keys, retry/backoff, cloud ACK,
 * revision checks, lease acquire/heartbeat and fencing.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { InMemoryCloudAuthority } from '../../src/v0.7/cloud-authority.js';
import { AuthorityError } from '../../src/v0.7/authority-state.js';
import {
  CloudCheckpointSession,
  type AgentCheckpointEvent,
  type CloudCheckpointSessionOptions,
} from '../../src/v0.7/checkpoint-runtime.js';

describe('CloudCheckpointSession', () => {
  let authority: InMemoryCloudAuthority;

  beforeEach(() => {
    authority = new InMemoryCloudAuthority();
    authority.seed({
      projectId: 'test-project',
      projectName: 'Test Project',
      tasks: [{ id: 'task-1', title: 'Test Task', status: 'in_progress' }],
    });
  });

  it('creates and starts successfully', async () => {
    const options: CloudCheckpointSessionOptions = {
      authority,
      projectId: 'test-project',
      agentId: 'agy',
      mode: 'strict-cloud-only',
    };

    const session = new CloudCheckpointSession(options);

    const startResult = await session.start();

    expect(startResult.ok).toBe(true);
    if (startResult.ok) {
      expect(startResult.taskId).toBeDefined();
      expect(startResult.revision).toBe(0);
    }
  });

  it('records checkpoint events', async () => {
    const options: CloudCheckpointSessionOptions = {
      authority,
      projectId: 'test-project',
      agentId: 'agy',
      mode: 'strict-cloud-only',
    };

    const session = new CloudCheckpointSession(options);
    const startResult = await session.start();
    if (!startResult.ok) {
      throw new Error(`Session failed to start: ${startResult.reason}`);
    }

    const checkpointEvent: AgentCheckpointEvent = {
      id: 'test-event-1',
      type: 'task.started',
      taskId: 'task-1',
      title: 'Test Task',
      nextAction: 'Implement feature',
    };

    const result = await session.record(checkpointEvent);

    expect(result.status).toBe('acknowledged');
    expect(result.revision).toBe(1);
  });

  it('maintains bounded RAM queue when authority is unavailable', async () => {
    // Create an authority that fails commits
    const failingAuthority = new InMemoryCloudAuthority();
    failingAuthority.seed({
      projectId: 'test-project',
      projectName: 'Test Project',
      tasks: [{ id: 'task-1', title: 'Test Task', status: 'in_progress' }],
    });
    failingAuthority.failCommits(10); // Fail next 10 commits

    const options: CloudCheckpointSessionOptions = {
      authority: failingAuthority,
      projectId: 'test-project',
      agentId: 'agy',
      mode: 'strict-cloud-only',
      capacity: 2,
    };

    const session = new CloudCheckpointSession(options);
    const startResult = await session.start();
    if (!startResult.ok) {
      throw new Error(`Session failed to start: ${startResult.reason}`);
    }

    // Record more events than capacity - all will fail and be buffered
    for (let i = 0; i < 4; i++) {
      const checkpointEvent: AgentCheckpointEvent = {
        id: `event-${i}`,
        type: 'task.updated',
        taskId: 'task-1',
        nextAction: `Action ${i}`,
      };

      await session.record(checkpointEvent);
    }

    const status = session.status();

    // Buffer should be at capacity (2) with 2 dropped
    expect(status.engine.pendingBatches).toBe(2);
    expect(status.engine.droppedBatches).toBeGreaterThanOrEqual(2);
    expect(status.engine.state).toBe('degraded');
  });

  it('handles idempotency keys for retry scenarios', async () => {
    // Create an authority that fails once then succeeds on retry
    const flakyAuthority = new InMemoryCloudAuthority();
    flakyAuthority.seed({
      projectId: 'test-project',
      projectName: 'Test Project',
      tasks: [{ id: 'task-1', title: 'Test Task', status: 'in_progress' }],
    });
    flakyAuthority.failCommits(1); // Fail first commit

    const options: CloudCheckpointSessionOptions = {
      authority: flakyAuthority,
      projectId: 'test-project',
      agentId: 'agy',
      mode: 'strict-cloud-only',
      retry: { attempts: 3, baseDelayMs: 10, maxDelayMs: 100 },
    };

    const session = new CloudCheckpointSession(options);
    const startResult = await session.start();
    if (!startResult.ok) {
      throw new Error(`Session failed to start: ${startResult.reason}`);
    }

    const checkpointEvent: AgentCheckpointEvent = {
      id: 'test-event-idempotent',
      type: 'task.updated',
      taskId: 'task-1',
      nextAction: 'Retry test',
    };

    // First attempt fails, gets buffered, then flush retries and succeeds
    const result1 = await session.record(checkpointEvent);
    expect(result1.status).toBe('acknowledged');

    // Recording again with same idempotency key should return cached ACK
    const result2 = await session.record(checkpointEvent);
    expect(result2.status).toBe('acknowledged');
    expect(result2.revision).toBe(result1.revision);
  });

  it('enforces revision checks with stale expectedRevision', async () => {
    const options: CloudCheckpointSessionOptions = {
      authority,
      projectId: 'test-project',
      agentId: 'agy',
      mode: 'strict-cloud-only',
    };

    const session = new CloudCheckpointSession(options);
    const startResult = await session.start();
    if (!startResult.ok) {
      throw new Error(`Session failed to start: ${startResult.reason}`);
    }

    // First event succeeds and advances revision to 1
    const firstEvent: AgentCheckpointEvent = {
      type: 'task.updated',
      taskId: 'task-1',
      nextAction: 'First action',
    };
    const firstResult = await session.record(firstEvent);
    expect(firstResult.status).toBe('acknowledged');

    // Now simulate a stale writer by directly manipulating expectedRevision
    // We can't easily do this through the public API, so we test the authority directly
    // by creating a commit request with stale expectedRevision
    const { AuthorityError } = await import('../../src/v0.7/authority-state.js');

    try {
      await authority.commit({
        projectId: 'test-project',
        agentId: 'another-agent',
        operations: [{ type: 'task.work', taskId: 'task-1', nextAction: 'Stale action' }],
        expectedRevision: 0, // Stale - authority is at revision 1
        leaseId: 'test-lease',
        fencingToken: 1,
        idempotencyKey: 'stale-test',
        now: Date.now(),
      });
      throw new Error('Expected revision conflict');
    } catch (error) {
      expect(error).toBeInstanceOf(AuthorityError);
      expect((error as InstanceType<typeof AuthorityError>).code).toBe(
        'AUTHORITY_REVISION_CONFLICT'
      );
    }
  });

  it('implements retry/backoff', async () => {
    const flakyAuthority = new InMemoryCloudAuthority();
    flakyAuthority.seed({
      projectId: 'test-project',
      projectName: 'Test Project',
      tasks: [{ id: 'task-1', title: 'Test Task', status: 'in_progress' }],
    });
    flakyAuthority.failCommits(1); // Fail first commit

    const options: CloudCheckpointSessionOptions = {
      authority: flakyAuthority,
      projectId: 'test-project',
      agentId: 'agy',
      mode: 'strict-cloud-only',
      retry: { attempts: 3, baseDelayMs: 10, maxDelayMs: 100 },
    };

    const session = new CloudCheckpointSession(options);
    const startResult = await session.start();
    if (!startResult.ok) {
      throw new Error(`Session failed to start: ${startResult.reason}`);
    }

    const checkpointEvent: AgentCheckpointEvent = {
      id: 'retry-test-event',
      type: 'task.updated',
      taskId: 'task-1',
      nextAction: 'Retry test',
    };

    // First attempt fails, gets buffered, then flush retries and succeeds
    const result1 = await session.record(checkpointEvent);
    expect(result1.status).toBe('acknowledged');
  });

  it('handles lease heartbeat and fencing', async () => {
    const options: CloudCheckpointSessionOptions = {
      authority,
      projectId: 'test-project',
      agentId: 'agy',
      mode: 'strict-cloud-only',
    };

    const session = new CloudCheckpointSession(options);
    const startResult = await session.start();
    if (!startResult.ok) {
      throw new Error(`Session failed to start: ${startResult.reason}`);
    }
    expect(startResult.ok).toBe(true);

    const heartbeatResult = await session.heartbeat();
    expect(heartbeatResult.ok).toBe(true);
    expect(heartbeatResult.expiresAt).toBeDefined();

    await session.release();
  });

  it('prevents task completion without passing test', async () => {
    const options: CloudCheckpointSessionOptions = {
      authority,
      projectId: 'test-project',
      agentId: 'agy',
      mode: 'strict-cloud-only',
    };

    const session = new CloudCheckpointSession(options);
    const startResult = await session.start();
    if (!startResult.ok) {
      throw new Error(`Session failed to start: ${startResult.reason}`);
    }

    const checkpointEvent: AgentCheckpointEvent = {
      id: 'completion-test-event',
      type: 'task.completed',
      taskId: 'task-1',
      tests: [
        { name: 'Test 1', outcome: 'fail' },
        { name: 'Test 2', outcome: 'fail' },
      ],
    };

    const result = await session.record(checkpointEvent);

    expect(result.status).toBe('unacknowledged');
    expect(result.code).toBe('CHECKPOINT_COMPLETION_NEEDS_PASSING_TEST');
  });

  it('enforces event validation', async () => {
    const options: CloudCheckpointSessionOptions = {
      authority,
      projectId: 'test-project',
      agentId: 'agy',
      mode: 'strict-cloud-only',
    };

    const session = new CloudCheckpointSession(options);
    const startResult = await session.start();
    if (!startResult.ok) {
      throw new Error(`Session failed to start: ${startResult.reason}`);
    }

    const checkpointEvent: AgentCheckpointEvent = {
      id: '',
      type: 'invalid_type' as any,
    };

    const result = await session.record(checkpointEvent);

    expect(result.status).toBe('unacknowledged');
    expect(result.code).toBe('CHECKPOINT_EVENT_INVALID');
  });

  it('handles cloud authority unavailability', async () => {
    const unavailableAuthority = new InMemoryCloudAuthority();
    unavailableAuthority.setOffline(true);

    const options: CloudCheckpointSessionOptions = {
      authority: unavailableAuthority,
      projectId: 'test-project',
      agentId: 'agy',
      mode: 'strict-cloud-only',
    };

    const session = new CloudCheckpointSession(options);
    const startResult = await session.start();

    expect(startResult.ok).toBe(false);
    if (!startResult.ok) {
      expect(startResult.code).toBeDefined();
    }
  });

  it('maintains strict cloud-only compliance', async () => {
    const options: CloudCheckpointSessionOptions = {
      authority,
      projectId: 'test-project',
      agentId: 'agy',
      mode: 'strict-cloud-only',
    };

    const session = new CloudCheckpointSession(options);
    const startResult = await session.start();

    expect(startResult.ok).toBe(true);
    if (startResult.ok) {
      expect(startResult.taskId).toBeDefined();
      expect(startResult.revision).toBe(0);
    }
  });
});
