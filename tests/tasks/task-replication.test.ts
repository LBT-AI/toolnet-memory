import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProjectManifest } from '../../src/core/types.js';
import type { StorageObject, StorageProvider } from '../../src/storage/types.js';
import { createTaskOperation, taskOperationLogPath } from '../../src/tasks/operation-log.js';
import { TaskStore } from '../../src/tasks/store.js';
import {
  convergeTaskOperations,
  createTaskReplicationBatch,
  replicationBatchId,
  taskProjectionHash,
  taskReplicationBatchKey,
  validateTaskReplicationBatch,
} from '../../src/tasks/replication/core.js';
import { downloadTaskOperations } from '../../src/tasks/replication/download.js';
import {
  importReplicatedTaskOperation,
  readAllReplicatedTaskOperations,
} from '../../src/tasks/replication/store.js';
import { uploadTaskOperations } from '../../src/tasks/replication/upload.js';
import type { TaskOperation } from '../../src/tasks/types.js';

class MemoryStorage implements StorageProvider {
  readonly name = 'replication-test';
  readonly objects = new Map<string, Uint8Array>();
  unavailable = false;

  async put(key: string, data: string | Uint8Array): Promise<void> {
    if (this.unavailable) {
      throw new Error('REMOTE_UNAVAILABLE');
    }
    const value = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data);
    const existing = this.objects.get(key);
    if (existing && !Buffer.from(existing).equals(value)) {
      throw new Error('TASK_REPLICATION_IMMUTABLE_CONFLICT');
    }
    this.objects.set(key, value);
  }

  async get(key: string): Promise<Uint8Array | null> {
    if (this.unavailable) {
      throw new Error('REMOTE_UNAVAILABLE');
    }
    const value = this.objects.get(key);
    return value ? new Uint8Array(value) : null;
  }

  async getText(key: string): Promise<string | null> {
    const value = await this.get(key);
    return value ? Buffer.from(value).toString('utf8') : null;
  }

  async exists(key: string): Promise<boolean> {
    if (this.unavailable) {
      throw new Error('REMOTE_UNAVAILABLE');
    }
    return this.objects.has(key);
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }

  async list(prefix = ''): Promise<StorageObject[]> {
    if (this.unavailable) {
      throw new Error('REMOTE_UNAVAILABLE');
    }
    return [...this.objects.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => ({ key, size: value.length }));
  }
}

const roots: string[] = [];
const originalHost = process.env.TOOLNET_HOST_ID;

function project(
  rootPath = mkdtempSync(join(tmpdir(), 'toolnet-task-replication-'))
): ProjectManifest {
  roots.push(rootPath);
  return {
    id: 'task-replication-project',
    name: 'task-replication-project',
    remote: 'task-replication-project',
    rootPath,
    createdAt: '2026-09-06T00:00:00.000Z',
    updatedAt: '2026-09-06T00:00:00.000Z',
    graphVersion: 0,
    memoryVersion: 0,
  };
}

function op(
  hostId: string,
  sequence: number,
  operationId: string,
  payload: TaskOperation['payload'],
  occurredAt = `2026-09-06T00:0${sequence}:00.000Z`
): TaskOperation {
  return createTaskOperation({
    projectId: 'task-replication-project',
    hostId,
    sequence,
    operationId,
    occurredAt,
    actor: { kind: 'agent', id: hostId },
    payload,
  });
}

function created(hostId: string, sequence: number, id: string, title: string): TaskOperation {
  return op(hostId, sequence, `${hostId}-create-${id}`, {
    type: 'task.created',
    task: {
      id,
      kind: 'task',
      title,
      status: 'pending',
      priority: 'normal',
      labels: [],
      order: sequence,
    },
  });
}

afterEach(() => {
  if (originalHost === undefined) {
    delete process.env.TOOLNET_HOST_ID;
  } else {
    process.env.TOOLNET_HOST_ID = originalHost;
  }
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('Phase 45 cross-host task replication', () => {
  it('creates deterministic batch identity and rejects a corrupt hash', () => {
    const operations = [created('host-a', 1, 'task-a', 'Task A')];
    const first = createTaskReplicationBatch(
      'task-replication-project',
      'host-a',
      operations,
      '2026-09-06T00:10:00.000Z'
    );
    const second = createTaskReplicationBatch(
      'task-replication-project',
      'host-a',
      operations,
      '2026-09-06T00:10:00.000Z'
    );
    expect(first.batchId).toBe(second.batchId);
    expect(first.batchId).toBe(
      replicationBatchId({
        projectId: first.projectId,
        hostId: first.hostId,
        firstLocalSequence: first.firstLocalSequence,
        lastLocalSequence: first.lastLocalSequence,
        operationsSha256: first.operationsSha256,
      })
    );
    expect(() =>
      validateTaskReplicationBatch({ ...first, operationsSha256: '0'.repeat(64) }, first.projectId)
    ).toThrow('TASK_REPLICATION_HASH_MISMATCH');
  });

  it('converges a task from host A and a later update from host B', async () => {
    const storage = new MemoryStorage();
    const hostA = project();
    const hostB = project();

    process.env.TOOLNET_HOST_ID = 'host-a';
    const task = await new TaskStore(hostA).createTask({ kind: 'task', title: 'Created on A' });
    const pushedA = await uploadTaskOperations(hostA, storage, 'host-a');
    expect(pushedA.operations).toBe(1);

    const pulledB = await downloadTaskOperations(hostB, storage, 'host-b');
    expect(pulledB.operations).toBe(1);
    expect(new TaskStore(hostB).getTask(task.id)?.title).toBe('Created on A');

    process.env.TOOLNET_HOST_ID = 'host-b';
    await new TaskStore(hostB).patchTask(task.id, { title: 'Updated on B' });
    await uploadTaskOperations(hostB, storage, 'host-b');

    process.env.TOOLNET_HOST_ID = 'host-a';
    await downloadTaskOperations(hostA, storage, 'host-a');
    expect(new TaskStore(hostA).getTask(task.id)?.title).toBe('Updated on B');
  });

  it('retains independent host-local sequence one operations', () => {
    const result = convergeTaskOperations('task-replication-project', [
      created('host-a', 1, 'task-a', 'A'),
      created('host-b', 1, 'task-b', 'B'),
    ]);
    expect(result.operations).toHaveLength(2);
    expect(result.projection.tasks['task-a']?.title).toBe('A');
    expect(result.projection.tasks['task-b']?.title).toBe('B');
  });

  it('deduplicates repeated imported operations and survives cursor restart', async () => {
    const storage = new MemoryStorage();
    const source = project();
    const target = project();
    process.env.TOOLNET_HOST_ID = 'host-a';
    await new TaskStore(source).createTask({ kind: 'task', title: 'Retry-safe' });
    await uploadTaskOperations(source, storage, 'host-a');
    const repeatedUpload = await uploadTaskOperations(source, storage, 'host-a');
    expect(repeatedUpload.operations).toBe(0);
    const first = await downloadTaskOperations(target, storage, 'host-b');
    const second = await downloadTaskOperations(target, storage, 'host-b');
    expect(first.operations).toBe(1);
    expect(second.operations).toBe(0);
    expect(readAllReplicatedTaskOperations(target)).toHaveLength(1);
    expect(
      importReplicatedTaskOperation(target, readAllReplicatedTaskOperations(target)[0]!)
    ).toEqual({
      imported: false,
      collision: false,
    });
  });

  it('keeps local mutation successful while remote upload is unavailable', async () => {
    const storage = new MemoryStorage();
    storage.unavailable = true;
    const local = project();
    process.env.TOOLNET_HOST_ID = 'offline-host';
    const task = await new TaskStore(local).createTask({ kind: 'task', title: 'Offline task' });
    const upload = await uploadTaskOperations(local, storage, 'offline-host').catch(
      (error) => error
    );
    expect(upload).toBeInstanceOf(Error);
    expect(new TaskStore(local).getTask(task.id)?.title).toBe('Offline task');
  });

  it('converges the same conflict-free three-host set for every sync order', () => {
    const operations = [
      created('host-a', 1, 'task-a', 'Task A'),
      created('host-b', 1, 'task-b', 'Task B'),
      op('host-c', 1, 'host-c-patch-a', {
        type: 'task.patched',
        taskId: 'task-a',
        patch: { title: 'Task A with C evidence' },
      }),
    ];
    const permutations = [
      [operations[0]!, operations[1]!, operations[2]!],
      [operations[2]!, operations[0]!, operations[1]!],
      [operations[1]!, operations[2]!, operations[0]!],
    ];
    const hashes = permutations.map((items) =>
      taskProjectionHash(convergeTaskOperations('task-replication-project', items).projection)
    );
    expect(new Set(hashes).size).toBe(1);
  });

  it('surfaces lifecycle and lease conflicts without dropping authored inputs', () => {
    const base = created('host-a', 1, 'task-conflict', 'Conflict task');
    const completed = op('host-a', 2, 'host-a-completed', {
      type: 'task.lifecycle.transition',
      taskId: 'task-conflict',
      status: 'completed',
    });
    const blocked = op('host-b', 1, 'host-b-blocked', {
      type: 'task.lifecycle.transition',
      taskId: 'task-conflict',
      status: 'blocked',
      blockerReason: 'Dependency is unavailable',
    });
    const claimedA = op('host-a', 3, 'host-a-claim', {
      type: 'task.agent.claim',
      taskId: 'task-conflict',
      agentId: 'codex',
      leaseId: 'lease-a',
      leaseExpiresAt: '2026-09-07T00:00:00.000Z',
    });
    const claimedB = op('host-b', 2, 'host-b-claim', {
      type: 'task.agent.claim',
      taskId: 'task-conflict',
      agentId: 'opencode',
      leaseId: 'lease-b',
      leaseExpiresAt: '2026-09-07T00:00:00.000Z',
    });
    const result = convergeTaskOperations('task-replication-project', [
      base,
      completed,
      blocked,
      claimedA,
      claimedB,
    ]);
    expect(result.operations).toHaveLength(5);
    expect(result.conflicts.map((item) => item.code)).toEqual(
      expect.arrayContaining(['TASK_LIFECYCLE_CONFLICT', 'TASK_LEASE_CONFLICT'])
    );
  });

  it('rejects wrong-project replication batches and keeps remote keys project scoped', () => {
    const batch = createTaskReplicationBatch(
      'task-replication-project',
      'host-a',
      [created('host-a', 1, 'secure-task', 'Secure')],
      '2026-09-06T00:20:00.000Z'
    );
    expect(taskReplicationBatchKey(batch)).toContain('/tasks/v1/hosts/host-a/batches/');
    expect(() => validateTaskReplicationBatch(batch, 'another-project')).toThrow(
      'TASK_REPLICATION_PROJECT_MISMATCH'
    );
  });

  it('uses separate host identity even when local sequences and TODO order match', () => {
    const result = convergeTaskOperations('task-replication-project', [
      created('host-a', 1, 'session-a-todo-1', 'Refactor SessionStore'),
      created('host-b', 1, 'session-b-todo-1', 'Fix Docker'),
    ]);
    expect(Object.keys(result.projection.tasks)).toEqual(
      expect.arrayContaining(['session-a-todo-1', 'session-b-todo-1'])
    );
    expect(taskOperationLogPath(project())).toContain('.toolnet/tasks/events.jsonl');
  });
});
