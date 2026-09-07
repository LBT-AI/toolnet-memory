import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProjectManifest } from '../../src/core/types.js';
import type { StorageObject, StorageProvider } from '../../src/storage/types.js';
import { createTaskOperation, taskOperationLogPath } from '../../src/tasks/operation-log.js';
import { importReplicatedTaskOperation } from '../../src/tasks/replication/store.js';
import { TaskReplicationService } from '../../src/tasks/replication/service.js';
import { TaskStateEngine } from '../../src/tasks/state-engine.js';
import { TaskStore, taskProjectionPath } from '../../src/tasks/store.js';
import type { TaskOperation } from '../../src/tasks/types.js';

class MemoryStorage implements StorageProvider {
  readonly name = 'phase58b-e2e';
  readonly objects = new Map<string, Uint8Array>();

  async put(key: string, data: string | Uint8Array): Promise<void> {
    const value = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data);
    const existing = this.objects.get(key);
    if (existing && !Buffer.from(existing).equals(value)) {
      throw new Error('IMMUTABLE_STORAGE_CONFLICT');
    }
    this.objects.set(key, value);
  }

  async get(key: string): Promise<Uint8Array | null> {
    const value = this.objects.get(key);
    return value ? new Uint8Array(value) : null;
  }

  async getText(key: string): Promise<string | null> {
    const value = await this.get(key);
    return value ? Buffer.from(value).toString('utf8') : null;
  }

  async exists(key: string): Promise<boolean> {
    return this.objects.has(key);
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }

  async list(prefix = ''): Promise<StorageObject[]> {
    return [...this.objects.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => ({ key, size: value.length }));
  }
}

const roots: string[] = [];
const originalHost = process.env.TOOLNET_HOST_ID;

function project(rootPath: string, id: string): ProjectManifest {
  roots.push(rootPath);
  mkdirSync(join(rootPath, '.toolnet'), { recursive: true });
  return {
    id,
    name: id,
    remote: id,
    rootPath,
    createdAt: '2026-09-08T00:00:00.000Z',
    updatedAt: '2026-09-08T00:00:00.000Z',
    graphVersion: 1,
    memoryVersion: 1,
  };
}

function tempProject(id: string): ProjectManifest {
  return project(mkdtempSync(join(tmpdir(), 'toolnet-phase58b-')), id);
}

function setHost(hostId: string): void {
  process.env.TOOLNET_HOST_ID = hostId;
}

function projectionHashes(services: TaskReplicationService[]): string[] {
  return services.map((service) => service.projectionHash());
}

function operation(
  projectId: string,
  hostId: string,
  sequence: number,
  operationId: string,
  payload: TaskOperation['payload'],
  occurredAt: string
): TaskOperation {
  return createTaskOperation({
    projectId,
    hostId,
    sequence,
    operationId,
    occurredAt,
    actor: {
      kind: 'agent',
      id: hostId,
    },
    payload,
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

describe('Phase 58B real multi-host E2E', () => {
  it('converges three independently diverged hosts and survives projection rebuild', async () => {
    const projectId = 'phase58b-three-host';
    const storage = new MemoryStorage();
    const projectA = tempProject(projectId);
    const projectB = tempProject(projectId);
    const projectC = tempProject(projectId);

    setHost('host-a');
    const storeA = new TaskStore(projectA);
    const stateA = new TaskStateEngine(storeA);
    const task = await storeA.createTask({
      id: 'shared-production-task',
      kind: 'task',
      title: 'Three-host production verification',
      priority: 'high',
    });
    await stateA.start(task.id);
    await stateA.setNextAction(task.id, 'Initial action from host A');

    const replicationA = new TaskReplicationService(projectA, storage, { hostId: 'host-a' });
    const replicationB = new TaskReplicationService(projectB, storage, { hostId: 'host-b' });
    const replicationC = new TaskReplicationService(projectC, storage, { hostId: 'host-c' });

    const initialPush = await replicationA.push();
    expect(initialPush.pushedOperations).toBeGreaterThanOrEqual(3);
    await replicationB.pull();
    await replicationC.pull();
    expect(new TaskStore(projectB).getTask(task.id)?.status).toBe('active');
    expect(new TaskStore(projectC).getTask(task.id)?.status).toBe('active');

    /*
     * Host B diverges.
     *
     * Host C does NOT receive these changes yet.
     */
    setHost('host-b');
    const storeB = new TaskStore(projectB);
    const stateB = new TaskStateEngine(storeB);
    await stateB.setNextAction(task.id, 'Host B deploy verification');
    await stateB.addEvidence(task.id, {
      kind: 'artifact',
      summary: 'Host B production deploy',
      artifact: {
        key: 'production-deploy',
        type: 'deploy',
        state: 'executed',
        command: 'npm run deploy',
        exitCode: 0,
      },
    });

    /*
     * Host C diverges independently.
     *
     * Host C does NOT know Host B changes yet.
     */
    setHost('host-c');
    const storeC = new TaskStore(projectC);
    const stateC = new TaskStateEngine(storeC);
    await stateC.touchFile(task.id, 'src/production/verify.ts');
    await stateC.recordTest(task.id, {
      name: 'production health check',
      outcome: 'pass',
      detail: 'HTTP 200',
    });
    await stateC.block(
      task.id,
      'Awaiting final external verification',
      'Resolve external verification'
    );

    /*
     * B and C publish independently.
     */
    const pushB = await replicationB.push();
    const pushC = await replicationC.push();
    expect(pushB.pushedOperations).toBeGreaterThan(0);
    expect(pushC.pushedOperations).toBeGreaterThan(0);

    /*
     * Every host now downloads the complete immutable set.
     */
    await replicationA.pull();
    await replicationB.pull();
    await replicationC.pull();

    const hashesBeforeRestart = projectionHashes([replicationA, replicationB, replicationC]);
    expect(new Set(hashesBeforeRestart).size).toBe(1);

    const conflictsA = replicationA.converged().conflicts;
    const conflictsB = replicationB.converged().conflicts;
    const conflictsC = replicationC.converged().conflicts;
    expect(conflictsA).toEqual([]);
    expect(conflictsB).toEqual([]);
    expect(conflictsC).toEqual([]);

    const finalA = new TaskStore(projectA).getTask(task.id);
    const finalB = new TaskStore(projectB).getTask(task.id);
    const finalC = new TaskStore(projectC).getTask(task.id);
    for (const finalTask of [finalA, finalB, finalC]) {
      expect(finalTask?.status).toBe('blocked');
      expect(finalTask?.blocker?.reason).toBe('Awaiting final external verification');
      expect(finalTask?.filesTouched).toContain('src/production/verify.ts');
      expect(
        finalTask?.tests.some(
          (test) => test.name === 'production health check' && test.outcome === 'pass'
        )
      ).toBe(true);
      expect(
        finalTask?.evidence.some(
          (evidence) =>
            evidence.artifact?.key === 'production-deploy' &&
            evidence.artifact?.state === 'executed'
        )
      ).toBe(true);
    }

    /*
     * Crash/restart:
     *
     * Delete only derived projection caches.
     * Immutable local + replicated operation logs remain.
     */
    for (const manifest of [projectA, projectB, projectC]) {
      rmSync(taskProjectionPath(manifest), { force: true });
    }
    setHost('host-a');
    const rebuiltA = new TaskStore(projectA).rebuildProjection();
    setHost('host-b');
    const rebuiltB = new TaskStore(projectB).rebuildProjection();
    setHost('host-c');
    const rebuiltC = new TaskStore(projectC).rebuildProjection();
    const rebuiltServices = [
      new TaskReplicationService(projectA, storage, { hostId: 'host-a' }),
      new TaskReplicationService(projectB, storage, { hostId: 'host-b' }),
      new TaskReplicationService(projectC, storage, { hostId: 'host-c' }),
    ];
    const hashesAfterRestart = projectionHashes(rebuiltServices);
    expect(new Set(hashesAfterRestart).size).toBe(1);
    expect(hashesAfterRestart[0]).toBe(hashesBeforeRestart[0]);
    expect(rebuiltA.tasks[task.id]?.status).toBe('blocked');
    expect(rebuiltB.tasks[task.id]?.status).toBe('blocked');
    expect(rebuiltC.tasks[task.id]?.status).toBe('blocked');
  });

  it('explains the actual canonical order when an operation is rejected', async () => {
    const projectId = 'phase58b-order-conflict';
    const manifest = tempProject(projectId);
    const storage = new MemoryStorage();

    /*
     * occurredAt intentionally lies:
     *
     * heartbeat appears older than create.
     *
     * Canonical ordering must still create Task first,
     * proving wall-clock time is NOT the merge key.
     */
    const create = operation(
      projectId,
      'host-a',
      1,
      'host-a-create',
      {
        type: 'task.created',
        task: {
          id: 'debug-task',
          kind: 'task',
          title: 'Replication debug Task',
          status: 'pending',
          priority: 'normal',
          labels: [],
          order: 0,
        },
      },
      '2026-09-08T10:00:00.000Z'
    );
    const invalidHeartbeat = operation(
      projectId,
      'host-b',
      1,
      'host-b-heartbeat',
      {
        type: 'task.agent.heartbeat',
        taskId: 'debug-task',
        agentId: 'opencode',
        leaseId: 'missing-lease',
        leaseExpiresAt: '2026-09-09T00:00:00.000Z',
      },
      '2026-09-01T00:00:00.000Z'
    );

    mkdirSync(dirname(taskOperationLogPath(manifest)), { recursive: true });
    writeFileSync(taskOperationLogPath(manifest), `${JSON.stringify(create)}\n`, 'utf8');
    const imported = importReplicatedTaskOperation(manifest, invalidHeartbeat);
    expect(imported.imported).toBe(true);

    const replication = new TaskReplicationService(manifest, storage, { hostId: 'host-a' });
    const explanation = replication.explainConflicts('debug-task', 50);
    expect(explanation.occurredAtUsedForOrdering).toBe(false);
    expect(explanation.orderingRules.join('\n')).toContain('occurredAt is informational only');
    const orderConflict = explanation.conflicts.find(
      (conflict) => conflict.code === 'TASK_REPLICATION_ORDER_CONFLICT'
    );
    expect(orderConflict).toBeDefined();
    expect(explanation.steps.map((step) => step.operationId)).toEqual([
      'host-a-create',
      'host-b-heartbeat',
    ]);
    expect(explanation.steps[0]?.outcome).toBe('applied');
    expect(explanation.steps[1]?.outcome).toBe('rejected');
    expect(explanation.steps[1]?.operationKey).toBe('host-b\u0000host-b-heartbeat');
    expect(explanation.steps[1]?.rejectionReason).toBeTruthy();

    /*
     * Debugging is read-only.
     *
     * Authored log remains byte-for-byte unchanged.
     */
    const authoredAfter = readFileSync(taskOperationLogPath(manifest), 'utf8');
    expect(authoredAfter).toBe(`${JSON.stringify(create)}\n`);
  });
});
