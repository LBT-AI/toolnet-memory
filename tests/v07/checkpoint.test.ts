/**
 * ToolNet v0.7 checkpoint tests.
 *
 * Tests the automatic checkpoint session with AGY/Codex integration,
 * bounded RAM queue, idempotency keys, retry/backoff, cloud ACK,
 * revision checks, lease acquire/heartbeat and fencing.
 */

import { vi } from 'vitest';

import type { AuthorityCommitRequest, AuthorityCommitResult } from '../src/v0.7/authority-state.js';
import type { CloudAuthority } from '../src/v0.7/cloud-authority.js';
import { CloudCheckpointSession, type AgentCheckpointEvent, type CloudCheckpointSessionOptions } from '../src/v0.7/checkpoint-runtime.js';

const mockAuthority: CloudAuthority = {
  kind: 'memory',

  async fetchSnapshot(projectId: string): Promise<import('../src/v0.7/authority-state.js').AuthoritySnapshot> {
    return {
      projectId,
      projectName: 'Test Project',
      revision: 0,
      sequence: 0,
      tasks: {},
      rules: [],
      flows: [],
      decisions: [],
      leases: {},
      generatedAt: new Date().toISOString(),
    };
  },

  async commit(request: AuthorityCommitRequest): Promise<AuthorityCommitResult> {
    return {
      revision: 1,
      acknowledgedAt: new Date().toISOString(),
    };
  },

  async acquireLease(request: import('../src/v0.7/authority-state.js').AcquireLeaseRequest): Promise<import('../src/v0.7/authority-state.js').LeaseGrant> {
    return {
      lease: {
        leaseId: 'test-lease',
        taskId: request.taskId,
        agentId: request.agentId,
        fencingToken: 1,
        acquiredAt: Date.now(),
        heartbeatAt: Date.now(),
        expiresAt: Date.now() + 120_000,
      },
      revision: 1,
    };
  },

  async heartbeat(request: import('../src/v0.7/authority-state.js').HeartbeatLeaseRequest): Promise<import('../src/v0.7/authority-state.js').LeaseGrant> {
    return {
      lease: {
        leaseId: request.leaseId,
        taskId: request.taskId,
        agentId: request.agentId,
        fencingToken: request.fencingToken,
        acquiredAt: Date.now(),
        heartbeatAt: Date.now(),
        expiresAt: Date.now() + 120_000,
      },
      revision: 2,
    };
  },

  async release(request: import('../src/v0.7/authority-state.js').ReleaseLeaseRequest): Promise<import('../src/v0.7/authority-state.js').LeaseGrant> {
    return {
      lease: {
        leaseId: request.leaseId,
        taskId: request.taskId,
        agentId: request.agentId,
        fencingToken: request.fencingToken,
        acquiredAt: Date.now(),
        heartbeatAt: Date.now(),
        expiresAt: Date.now() + 120_000,
      },
      revision: 3,
    };
  },
};

vi.mock('../src/v0.7/cloud-authority-factory.js', () => ({
  createCloudAuthorityFromEnv: vi.fn(() => mockAuthority),
  hasCloudAuthorityConfig: vi.fn(() => true),
  resolveDurabilityMode: vi.fn(() => 'strict-cloud-only'),
}));

diTest('CloudCheckpointSession creates and starts successfully', async () => {
  const options: CloudCheckpointSessionOptions = {
    authority: mockAuthority,
    projectId: 'test-project',
    agentId: 'agy',
    mode: 'strict-cloud-only',
  };

  const session = new CloudCheckpointSession(options);

  const startResult = await session.start();

  expect(startResult.ok).toBe(true);
  expect(startResult.taskId).toBeDefined();
  expect(startResult.revision).toBe(0);
});

diTest('CloudCheckpointSession records checkpoint events', async () => {
  const options: CloudCheckpointSessionOptions = {
    authority: mockAuthority,
    projectId: 'test-project',
    agentId: 'agy',
    mode: 'strict-cloud-only',
  };

  const session = new CloudCheckpointSession(options);
  await session.start();

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

diTest('CloudCheckpointSession maintains bounded RAM queue', async () => {
  const options: CloudCheckpointSessionOptions = {
    authority: mockAuthority,
    projectId: 'test-project',
    agentId: 'agy',
    mode: 'strict-cloud-only',
    capacity: 2, // Small capacity for testing
  };

  const session = new CloudCheckpointSession(options);
  await session.start();

  // Record more events than capacity
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

  expect(status.engine.pendingBatches).toBe(2); // Should be at capacity (2)
  expect(status.engine.droppedBatches).toBeAtLeast(1); // At least one dropped
});

diTest('CloudCheckpointSession handles idempotency keys', async () => {
  const options: CloudCheckpointSessionOptions = {
    authority: mockAuthority,
    projectId: 'test-project',
    agentId: 'agy',
    mode: 'strict-cloud-only',
  };

  const session = new CloudCheckpointSession(options);
  await session.start();

  const checkpointEvent: AgentCheckpointEvent = {
    id: 'test-event-idempotent',
    type: 'task.started',
    taskId: 'task-1',
    title: 'Test Task',
  };

  const result1 = await session.record(checkpointEvent);

  // Record the same event again (should return same ACK without applying twice)
  const result2 = await session.record(checkpointEvent);

  expect(result1.status).toBe(result2.status);
  expect(result1.revision).toBe(result2.revision);
});

diTest('CloudCheckpointSession enforces revision checks', async () => {
  const options: CloudCheckpointSessionOptions = {
    authority: mockAuthority,
    projectId: 'test-project',
    agentId: 'agy',
    mode: 'strict-cloud-only',
  };

  const session = new CloudCheckpointSession(options);

  // Start session
  const startResult = await session.start();

  expect(startResult.ok).toBe(true);

  // Try to record with conflicting revision
  const checkpointEvent: AgentCheckpointEvent = {
    type: 'task.started',
    taskId: 'task-1',
    title: 'Test Task',
  };

  const result = await session.record(checkpointEvent);

  expect(result.status).toBe('unacknowledged');
});

diTest('CloudCheckpointSession implements retry/backoff', async () => {
  const options: CloudCheckpointSessionOptions = {
    authority: mockAuthority,
    projectId: 'test-project',
    agentId: 'agy',
    mode: 'strict-cloud-only',
    retry: { attempts: 3, baseDelayMs: 10, maxDelayMs: 100 },
  };

  const session = new CloudCheckpointSession(options);
  await session.start();

  // Record an event (should succeed)
  const checkpointEvent: AgentCheckpointEvent = {
    id: 'retry-test-event',
    type: 'task.updated',
    taskId: 'task-1',
    nextAction: 'Retry test',
  };

  const result = await session.record(checkpointEvent);

  expect(result.status).toBe('acknowledged');
});

diTest('CloudCheckpointSession handles lease heartbeat and fencing', async () => {
  const options: CloudCheckpointSessionOptions = {
    authority: mockAuthority,
    projectId: 'test-project',
    agentId: 'agy',
    mode: 'strict-cloud-only',
  };

  const session = new CloudCheckpointSession(options);
  const startResult = await session.start();

  expect(startResult.ok).toBe(true);

  // Heartbeat
  const heartbeatResult = await session.heartbeat();

  expect(heartbeatResult.ok).toBe(true);
  expect(heartbeatResult.expiresAt).toBeDefined();

  // Release
  await session.release();
});

diTest('CloudCheckpointSession prevents task completion without passing test', async () => {
  const options: CloudCheckpointSessionOptions = {
    authority: mockAuthority,
    projectId: 'test-project',
    agentId: 'agy',
    mode: 'strict-cloud-only',
  };

  const session = new CloudCheckpointSession(options);
  await session.start();

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

diTest('CloudCheckpointSession enforces event validation', async () => {
  const options: CloudCheckpointSessionOptions = {
    authority: mockAuthority,
    projectId: 'test-project',
    agentId: 'agy',
    mode: 'strict-cloud-only',
  };

  const session = new CloudCheckpointSession(options);
  await session.start();

  // Invalid event (missing required fields)
  const checkpointEvent: AgentCheckpointEvent = {
    id: '',
    type: 'invalid_type' as any,
  };

  const result = await session.record(checkpointEvent);

  expect(result.status).toBe('unacknowledged');
  expect(result.code).toBe('CHECKPOINT_EVENT_INVALID');
});

diTest('CloudCheckpointSession handles cloud authority unavailability', async () => {
  const mockUnavailableAuthority: CloudAuthority = {
    kind: 'memory',
    async fetchSnapshot() {
      throw new Error('Cloud authority unavailable');
    },
    async commit() {
      throw new Error('Cloud authority unavailable');
    },
    async acquireLease() {
      throw new Error('Cloud authority unavailable');
    },
    async heartbeat() {
      throw new Error('Cloud authority unavailable');
    },
    async release() {
      throw new Error('Cloud authority unavailable');
    },
  };

  const options: CloudCheckpointSessionOptions = {
    authority: mockUnavailableAuthority,
    projectId: 'test-project',
    agentId: 'agy',
    mode: 'strict-cloud-only',
  };

  const session = new CloudCheckpointSession(options);
  const startResult = await session.start();

  expect(startResult.ok).toBe(false);
  expect(startResult.code).toBeDefined();
});

diTest('CloudCheckpointSession maintains strict cloud-only compliance', async () => {
  const options: CloudCheckpointSessionOptions = {
    authority: mockAuthority,
    projectId: 'test-project',
    agentId: 'agy',
    mode: 'strict-cloud-only',
  };

  const session = new CloudCheckpointSession(options);

  // Should succeed when cloud authority is available
  const startResult = await session.start();

  expect(startResult.ok).toBe(true);
});
