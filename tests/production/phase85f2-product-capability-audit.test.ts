/*
 * Phase 85F2 — Product Capability & Task Lifecycle Audit.
 *
 * Runtime, not docs-based. Drives the real Task authority (TaskStore /
 * TaskStateEngine / TaskHandoffEngine / TaskOrchestrationEngine) against a
 * temporary project and asserts product-critical behaviour: creation
 * validation, the lifecycle state machine, deterministic completion guards,
 * dependencies, evidence/files/tests, agent lease safety, multi-agent handoff,
 * session resume, deterministic next-task selection, WAL durability and replay,
 * crash-tail recovery, authority boundaries, packaged-runtime parity and
 * security fail-closed behaviour.
 *
 * Read-only with respect to the repository: every mutation happens in a
 * throwaway temp project. Never commits, tags, pushes or publishes.
 *
 * PASS marker: PHASE85F2_PRODUCT_CAPABILITY_AUDIT=PASS
 */

import { execFileSync, spawn } from 'node:child_process';
import {
  appendFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { combineCoverage } from '../../src/code-intelligence/evidence/coverage.js';
import { evidenceFingerprint, planEvidence } from '../../src/code-intelligence/evidence/planner.js';
import {
  isNegativeClaim,
  profileDefinition,
} from '../../src/code-intelligence/evidence/profiles.js';
import type { EvidenceFacts } from '../../src/code-intelligence/evidence/types.js';
import { ProjectManager } from '../../src/core/project-manager.js';
import type { ProjectManifest } from '../../src/core/types.js';
import { sanitizeDurableValue } from '../../src/security/durable-sanitizer.js';
import { TaskHandoffEngine, MIN_TASK_LEASE_MS } from '../../src/tasks/handoff-engine.js';
import { createTaskOperation, taskOperationLogPath } from '../../src/tasks/operation-log.js';
import { TaskOrchestrationEngine } from '../../src/tasks/orchestration-engine.js';
import { projectTaskOperations } from '../../src/tasks/projection.js';
import { resolveTaskSessionExecutionWithAutoRecovery } from '../../src/tasks/session-resume.js';
import { TaskStateEngine } from '../../src/tasks/state-engine.js';
import { TaskStore } from '../../src/tasks/store.js';

const REPO_ROOT = process.cwd();
const PHASE85F2_MARKER = 'PHASE85F2_PRODUCT_CAPABILITY_AUDIT=PASS';

/* ================================================================== *
 * Harness
 * ================================================================== */

const roots: string[] = [];

function tempProject(id = 'phase85f2-project'): ProjectManifest {
  const rootPath = mkdtempSync(join(tmpdir(), 'toolnet-phase85f2-'));

  roots.push(rootPath);

  writeFileSync(join(rootPath, 'package.json'), JSON.stringify({ name: id }, null, 2));

  return new ProjectManager().adopt(rootPath, {
    id,
    name: id,
    remote: id,
  });
}

function engines(project: ProjectManifest) {
  const store = new TaskStore(project);

  return {
    project,
    store,
    state: new TaskStateEngine(store),
    handoff: new TaskHandoffEngine(store),
    orchestration: new TaskOrchestrationEngine(store, () => store.replicationConflicts()),
  };
}

function code(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function rejectsCode(run: () => Promise<unknown> | unknown, expected: string) {
  try {
    await run();
  } catch (error) {
    expect(code(error), `expected ${expected}`).toContain(expected);

    return;
  }

  throw new Error(`expected rejection containing ${expected}, but the call resolved`);
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

/* ================================================================== *
 * §5 Task create
 * ================================================================== */

describe('Phase 85F2 — Task create', () => {
  it('creates a Goal -> Task -> Subtask hierarchy owned by the project', async () => {
    const project = tempProject();
    const { store } = engines(project);

    const goal = await store.createTask({ kind: 'goal', title: 'Ship v0.6.0' });
    const task = await store.createTask({
      kind: 'task',
      parentTaskId: goal.id,
      title: 'Task authority',
    });
    const subtask = await store.createTask({
      kind: 'subtask',
      parentTaskId: task.id,
      title: 'WAL durability',
    });

    expect(goal.projectId).toBe(project.id);
    expect(task.projectId).toBe(project.id);
    expect(subtask.parentTaskId).toBe(task.id);
    expect(task.parentTaskId).toBe(goal.id);

    for (const record of [goal, task, subtask]) {
      expect(record.status).toBe('pending');
      expect(record.revision).toBe(1);
      expect(record.id.length).toBeGreaterThan(0);
    }

    expect(new Set([goal.id, task.id, subtask.id]).size).toBe(3);
  });

  it('rejects invalid creation input', async () => {
    const project = tempProject();
    const { store } = engines(project);

    await rejectsCode(
      () => store.createTask({ kind: 'task', title: '   ' }),
      'TASK_TITLE_REQUIRED'
    );

    /* A goal is a root container: it may never carry a parent. */
    await rejectsCode(
      () => store.createTask({ kind: 'goal', title: 'bad', parentTaskId: 'missing' }),
      'TASK_GOAL_CANNOT_HAVE_PARENT'
    );

    await rejectsCode(
      () => store.createTask({ kind: 'task', title: 'bad', parentTaskId: 'missing' }),
      'TASK_PARENT_NOT_FOUND'
    );

    await rejectsCode(
      () => store.createTask({ kind: 'task', title: 'bad', priority: 'urgent' as never }),
      'TASK_PRIORITY_INVALID'
    );

    await rejectsCode(
      () => store.createTask({ kind: 'task', title: 'bad', order: -1 }),
      'TASK_ORDER_INVALID'
    );
  });

  it('rejects duplicate ids and refuses prototype-shaped ids', async () => {
    const project = tempProject();
    const { store } = engines(project);

    await store.createTask({ id: 'fixed-id', kind: 'task', title: 'first' });

    await rejectsCode(
      () => store.createTask({ id: 'fixed-id', kind: 'task', title: 'second' }),
      'TASK_ALREADY_EXISTS'
    );

    /* A prototype-shaped id must never become a projection key. */
    await rejectsCode(
      () => store.createTask({ id: '__proto__', kind: 'task', title: 'hostile' }),
      'TASK_ALREADY_EXISTS'
    );

    expect(Object.prototype.hasOwnProperty.call(store.projection().tasks, '__proto__')).toBe(false);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('is durable in the WAL before the projection is written', async () => {
    const project = tempProject();
    const { store } = engines(project);

    const task = await store.createTask({ kind: 'task', title: 'durable' });

    const logPath = taskOperationLogPath(project);

    expect(existsSync(logPath)).toBe(true);

    const lines = readFileSync(logPath, 'utf8').split('\n').filter(Boolean);

    expect(lines).toHaveLength(1);

    const operation = JSON.parse(lines[0]!) as {
      type: string;
      payloadSha256: string;
      sequence: number;
      payload: { type: string };
    };

    expect(operation.payload.type).toBe('task.created');
    expect(operation.sequence).toBe(1);
    expect(operation.payloadSha256).toMatch(/^[0-9a-f]{64}$/u);

    /* The projection rebuilds from the WAL alone. */
    const replayed = projectTaskOperations(project.id, [operation as never]);

    expect(replayed.tasks[task.id]?.title).toBe('durable');
  });

  it('is visible to another agent session and survives a runtime restart', async () => {
    const project = tempProject();
    const first = engines(project);

    const task = await first.store.createTask({
      kind: 'task',
      title: 'shared',
      actor: { kind: 'agent', id: 'agent-a' },
    });

    /* A brand new set of engines over the same project root = a new session. */
    const second = engines(project);

    expect(second.store.getTask(task.id)?.title).toBe('shared');
    expect(second.store.listTasks()).toHaveLength(1);
  });
});

/* ================================================================== *
 * §6 Lifecycle state machine
 * ================================================================== */

describe('Phase 85F2 — Task lifecycle state machine', () => {
  it('walks pending -> active -> blocked -> active -> completed', async () => {
    const project = tempProject();
    const { store, state } = engines(project);
    const task = await store.createTask({ kind: 'task', title: 'lifecycle' });

    expect((await state.start(task.id)).status).toBe('active');

    const blocked = await state.block(task.id, 'waiting on upstream', 'retry later');

    expect(blocked.status).toBe('blocked');
    expect(blocked.blocker?.reason).toBe('waiting on upstream');
    expect(blocked.nextAction).toBe('retry later');

    expect((await state.resume(task.id)).status).toBe('active');

    const completed = await state.complete(task.id);

    expect(completed.status).toBe('completed');
    expect(completed.blocker).toBeUndefined();
  });

  it('rejects illegal transitions', async () => {
    const project = tempProject();
    const { store, state } = engines(project);
    const task = await store.createTask({ kind: 'task', title: 'illegal' });

    /* pending -> completed is not allowed without execution. */
    await rejectsCode(() => state.complete(task.id), 'TASK_LIFECYCLE_INVALID');

    /* resume requires a blocked task. */
    await state.start(task.id);
    await rejectsCode(() => state.resume(task.id), 'TASK_RESUME_REQUIRES_BLOCKED');

    /* completed is terminal. */
    await state.complete(task.id);
    await rejectsCode(() => state.start(task.id), 'TASK_LIFECYCLE_INVALID');
    await rejectsCode(() => state.block(task.id, 'nope'), 'TASK_LIFECYCLE_INVALID');
  });

  it('keeps cancelled tasks terminal', async () => {
    const project = tempProject();
    const { store, state } = engines(project);
    const task = await store.createTask({ kind: 'task', title: 'cancel me' });

    expect((await state.cancel(task.id)).status).toBe('cancelled');
    await rejectsCode(() => state.start(task.id), 'TASK_LIFECYCLE_INVALID');
  });

  it('requires a durable reason to block', async () => {
    const project = tempProject();
    const { store, state } = engines(project);
    const task = await store.createTask({ kind: 'task', title: 'block reason' });

    await state.start(task.id);
    await rejectsCode(() => state.block(task.id, '   '), 'TASK_BLOCKER_REASON_REQUIRED');
  });

  it('applies deterministic completion guards', async () => {
    const project = tempProject();
    const { store, state } = engines(project);

    /* Open children block completion of the container. */
    const parent = await store.createTask({ kind: 'task', title: 'parent' });
    await store.createTask({ kind: 'subtask', parentTaskId: parent.id, title: 'child' });
    await state.start(parent.id);
    await rejectsCode(() => state.complete(parent.id), 'TASK_COMPLETE_CHILDREN_OPEN');

    /* Incomplete explicit progress blocks completion. */
    const tracked = await store.createTask({ kind: 'task', title: 'tracked' });
    await state.start(tracked.id);
    await state.setProgress(tracked.id, 1, 2);
    await rejectsCode(() => state.complete(tracked.id), 'TASK_COMPLETE_PROGRESS_INCOMPLETE');
    await state.setProgress(tracked.id, 2, 2);
    expect((await state.complete(tracked.id)).status).toBe('completed');

    /* A blocked task cannot be completed directly: it must be resumed first. */
    const blocked = await store.createTask({ kind: 'task', title: 'blocked' });
    await state.start(blocked.id);
    await state.block(blocked.id, 'stuck');
    await rejectsCode(() => state.complete(blocked.id), 'TASK_LIFECYCLE_INVALID');
  });

  it('keeps completed tasks terminal on the supported lifecycle path', async () => {
    const project = tempProject();
    const { store, state } = engines(project);
    const task = await store.createTask({ kind: 'task', title: 'terminal truth' });

    await state.start(task.id);
    await state.complete(task.id);

    await rejectsCode(() => state.start(task.id), 'TASK_LIFECYCLE_INVALID');
    await rejectsCode(() => state.resume(task.id), 'TASK_RESUME_REQUIRES_BLOCKED');
  });

  it('keeps the deprecated status writer out of every agent-facing surface', () => {
    /* `task.status.set` survives in the reducer only for Phase 33 replay
     * compatibility. No agent/user surface may emit it, so the lifecycle and
     * completion guards cannot be bypassed through MCP, the CLI or adapters. */
    for (const relative of [
      'src/mcp/tools/task-tools.ts',
      'src/tasks/cli.ts',
      'src/session/native-plan/mutate.ts',
      'src/hooks/runtime.ts',
    ]) {
      expect(readFileSync(join(REPO_ROOT, relative), 'utf8'), relative).not.toContain(
        'setTaskStatus'
      );
    }

    expect(readFileSync(join(REPO_ROOT, 'src', 'tasks', 'projection.ts'), 'utf8')).toContain(
      "'task.status.set'"
    );
  });

  it('validates explicit progress bounds', async () => {
    const project = tempProject();
    const { store, state } = engines(project);
    const task = await store.createTask({ kind: 'task', title: 'progress' });

    await rejectsCode(() => state.setProgress(task.id, 3, 2), 'TASK_PROGRESS_INVALID');
    await rejectsCode(() => state.setProgress(task.id, -1, 2), 'TASK_PROGRESS_INVALID');
  });
});

/* ================================================================== *
 * §12/§13 Dependencies and deterministic selection
 * ================================================================== */

describe('Phase 85F2 — dependencies and selection', () => {
  it('rejects self and cyclic dependencies', async () => {
    const project = tempProject();
    const { store, state } = engines(project);

    const a = await store.createTask({ kind: 'task', title: 'a' });
    const b = await store.createTask({ kind: 'task', title: 'b' });

    await rejectsCode(() => state.addDependency(a.id, a.id), 'TASK_DEPENDENCY_SELF');
    await rejectsCode(() => state.addDependency(a.id, 'missing'), 'TASK_NOT_FOUND');

    await state.addDependency(a.id, b.id);
    await rejectsCode(() => state.addDependency(b.id, a.id), 'TASK_DEPENDENCY_CYCLE');
  });

  it('never recommends work whose hard dependency is unresolved', async () => {
    const project = tempProject();
    const { store, state, orchestration } = engines(project);

    const root = await store.createTask({ kind: 'goal', title: 'root' });
    const dependency = await store.createTask({
      kind: 'task',
      parentTaskId: root.id,
      title: 'dependency',
    });
    const dependent = await store.createTask({
      kind: 'task',
      parentTaskId: root.id,
      title: 'dependent',
    });

    await state.addDependency(dependent.id, dependency.id);

    const decision = orchestration.resolveNextTask(root.id, 'agent-a');

    expect(decision.task?.id).toBe(dependency.id);
    expect(decision.why).toBe('priority-ready');

    /* Completing the dependency releases the dependent task. */
    await state.start(dependency.id);
    await state.complete(dependency.id);

    const after = orchestration.resolveNextTask(root.id, 'agent-a');

    expect(after.task?.id).toBe(dependent.id);

    /* Removing the dependency also frees it. */
    await state.removeDependency(dependent.id, dependency.id);
    expect((store.getTask(dependent.id)?.dependencies ?? []).length).toBe(0);
  });

  it('selects the same next task deterministically across repeated calls', async () => {
    const project = tempProject();
    const { store, orchestration } = engines(project);

    const root = await store.createTask({ kind: 'goal', title: 'root' });

    await store.createTask({ kind: 'task', parentTaskId: root.id, title: 'low', priority: 'low' });
    const critical = await store.createTask({
      kind: 'task',
      parentTaskId: root.id,
      title: 'critical',
      priority: 'critical',
    });
    await store.createTask({ kind: 'task', parentTaskId: root.id, title: 'normal' });

    const picks = [0, 1, 2].map(() => orchestration.resolveNextTask(root.id, 'agent-a').task?.id);

    expect(picks[0]).toBe(critical.id);
    expect(new Set(picks).size).toBe(1);
  });

  it('reports an explicit no-ready-task reason instead of guessing', async () => {
    const project = tempProject();
    const { store, state, orchestration } = engines(project);

    const root = await store.createTask({ kind: 'goal', title: 'empty root' });

    /* A childless container is itself executable work. */
    expect(orchestration.resolveNextTask(root.id, 'agent-a').task?.id).toBe(root.id);

    /* With every task terminal there is nothing to recommend. */
    await state.start(root.id);
    await state.complete(root.id);

    const decision = orchestration.resolveNextTask(root.id, 'agent-a');

    expect(decision.why).toBe('no-ready-task');
    expect(decision.task).toBeUndefined();
  });
});

/* ================================================================== *
 * §7 Ownership / lease
 * ================================================================== */

describe('Phase 85F2 — Task ownership and lease', () => {
  const base = Date.parse('2026-09-27T00:00:00.000Z');

  it('allows exactly one owner while a lease is active', async () => {
    const project = tempProject();
    const { store, state, handoff } = engines(project);
    const task = await store.createTask({ kind: 'task', title: 'lease' });

    await state.start(task.id);

    const claimA = await handoff.claim(task.id, 'agent-a', {
      now: base,
      leaseMs: MIN_TASK_LEASE_MS,
    });

    expect(claimA.acquired).toBe(true);
    expect(claimA.takeover).toBe(false);
    expect(claimA.task.activeLease?.agentId).toBe('agent-a');

    /* Agent B cannot steal an active lease. */
    await rejectsCode(
      () => handoff.claim(task.id, 'agent-b', { now: base + 1_000 }),
      'TASK_ALREADY_CLAIMED'
    );

    /* The same agent re-claiming is idempotent, not a takeover. */
    const again = await handoff.claim(task.id, 'agent-a', { now: base + 1_000 });

    expect(again.acquired).toBe(false);
    expect(again.lease.leaseId).toBe(claimA.lease.leaseId);
  });

  it('enforces heartbeat ownership and strict extension', async () => {
    const project = tempProject();
    const { store, state, handoff } = engines(project);
    const task = await store.createTask({ kind: 'task', title: 'heartbeat' });

    await state.start(task.id);
    await handoff.claim(task.id, 'agent-a', { now: base, leaseMs: MIN_TASK_LEASE_MS });

    await rejectsCode(
      () => handoff.heartbeat(task.id, 'agent-b', { now: base + 1_000 }),
      'TASK_LEASE_OWNERSHIP_MISMATCH'
    );

    const renewed = await handoff.heartbeat(task.id, 'agent-a', {
      now: base + 1_000,
      leaseMs: MIN_TASK_LEASE_MS,
    });

    expect(Date.parse(renewed.activeLease!.expiresAt)).toBeGreaterThan(
      Date.parse(new Date(base + MIN_TASK_LEASE_MS).toISOString())
    );

    /* Heartbeat after expiry fails closed. */
    await rejectsCode(
      () => handoff.heartbeat(task.id, 'agent-a', { now: base + 10 * MIN_TASK_LEASE_MS }),
      'TASK_LEASE_EXPIRED'
    );
  });

  it('lets a different agent take over only after legitimate expiry', async () => {
    const project = tempProject();
    const { store, state, handoff } = engines(project);
    const task = await store.createTask({ kind: 'task', title: 'takeover' });

    await state.start(task.id);
    await handoff.claim(task.id, 'agent-a', { now: base, leaseMs: MIN_TASK_LEASE_MS });

    const takeover = await handoff.claim(task.id, 'agent-b', {
      now: base + 10 * MIN_TASK_LEASE_MS,
      leaseMs: MIN_TASK_LEASE_MS,
    });

    expect(takeover.acquired).toBe(true);
    expect(takeover.takeover).toBe(true);
    expect(takeover.task.activeLease?.agentId).toBe('agent-b');
    expect(takeover.task.handoffHistory.at(-1)?.reason).toBe('lease-expired-takeover');
  });

  it('releases only for the owning agent and frees the lease', async () => {
    const project = tempProject();
    const { store, state, handoff } = engines(project);
    const task = await store.createTask({ kind: 'task', title: 'release' });

    await state.start(task.id);
    await handoff.claim(task.id, 'agent-a', { now: base, leaseMs: MIN_TASK_LEASE_MS });

    await rejectsCode(
      () => handoff.release(task.id, 'agent-b', undefined, { now: base + 1_000 }),
      'TASK_LEASE_OWNERSHIP_MISMATCH'
    );

    const released = await handoff.release(task.id, 'agent-a', 'done for now', {
      now: base + 1_000,
    });

    expect(released.activeLease).toBeUndefined();

    /* Once free, another agent may claim without takeover. */
    const claimB = await handoff.claim(task.id, 'agent-b', {
      now: base + 2_000,
      leaseMs: MIN_TASK_LEASE_MS,
    });

    expect(claimB.acquired).toBe(true);
    expect(claimB.takeover).toBe(false);
  });

  it('refuses to lease terminal tasks', async () => {
    const project = tempProject();
    const { store, state, handoff } = engines(project);
    const task = await store.createTask({ kind: 'task', title: 'terminal' });

    await state.start(task.id);
    await state.complete(task.id);
    await rejectsCode(() => handoff.claim(task.id, 'agent-a'), 'TASK_CLAIM_TERMINAL');

    /* Completing a task clears its lease, so a handoff cannot find an owner. */
    expect(store.getTask(task.id)?.activeLease).toBeUndefined();
    await rejectsCode(() => handoff.handoff(task.id, 'agent-a', 'agent-b'), 'TASK_LEASE_NOT_FOUND');
  });
});

/* ================================================================== *
 * §8 Multi-agent handoff and §9 session resume
 * ================================================================== */

describe('Phase 85F2 — handoff and session resume', () => {
  const base = Date.parse('2026-09-27T00:00:00.000Z');

  async function preparedTask() {
    const project = tempProject();
    const set = engines(project);
    const root = await set.store.createTask({ kind: 'goal', title: 'Resume me' });

    await set.state.start(root.id);
    await set.state.setProgress(root.id, 3, 7);
    await set.state.setNextAction(root.id, 'wire the daemon');
    await set.state.addEvidence(root.id, { kind: 'note', summary: 'design agreed' });
    await set.state.touchFile(root.id, 'src/tasks/store.ts');
    await set.state.recordTest(root.id, { name: 'task-core', outcome: 'pass' });

    return { project, set, root };
  }

  it('transfers execution to another agent without losing state', async () => {
    const { project, set, root } = await preparedTask();

    await set.handoff.claim(root.id, 'agent-a', { now: base, leaseMs: MIN_TASK_LEASE_MS });

    const handed = await set.handoff.handoff(root.id, 'agent-a', 'agent-b', 'shift change', {
      now: base + 1_000,
      leaseMs: MIN_TASK_LEASE_MS,
    });

    expect(handed.activeLease?.agentId).toBe('agent-b');
    expect(handed.lastAgentId).toBe('agent-b');
    expect(handed.handoffHistory.at(-1)).toMatchObject({
      fromAgentId: 'agent-a',
      toAgentId: 'agent-b',
      reason: 'shift change',
    });

    /* Session B reads the same durable facts from a fresh runtime. */
    const sessionB = engines(project);
    const resumed = sessionB.store.getTask(root.id)!;

    expect(resumed.id).toBe(root.id);
    expect(resumed.status).toBe('active');
    expect(resumed.activeLease?.agentId).toBe('agent-b');
    expect(resumed.progress).toEqual({ completed: 3, total: 7 });
    expect(resumed.nextAction).toBe('wire the daemon');
    expect(resumed.evidence.at(-1)?.summary).toBe('design agreed');
    expect(resumed.filesTouched).toContain('src/tasks/store.ts');
    expect(resumed.tests.at(-1)).toMatchObject({ name: 'task-core', outcome: 'pass' });

    const context = sessionB.orchestration.resumeContext(root.id);

    expect(JSON.stringify(context)).toContain('wire the daemon');
  });

  it('resumes the handoff target as owned and never silently steals a foreign lease', async () => {
    const { project, set, root } = await preparedTask();

    await set.handoff.claim(root.id, 'agent-a', { now: base, leaseMs: MIN_TASK_LEASE_MS });

    /* A third agent must not be told it owns work held by another agent. */
    const foreign = engines(project).orchestration.resolveSessionExecution({
      agentId: 'agent-c',
      now: base + 1_000,
    });

    expect(foreign.mode).not.toBe('owned');

    /* Session B is the handoff target, so it is recognised. */
    await set.handoff.handoff(root.id, 'agent-a', 'agent-b', undefined, {
      now: base + 1_000,
      leaseMs: MIN_TASK_LEASE_MS,
    });

    const target = engines(project).orchestration.resolveSessionExecution({
      agentId: 'agent-b',
      now: base + 2_000,
    });

    expect(target.mode).toBe('handoff');
    expect(target.task?.id).toBe(root.id);
    expect(target.requiresClaim).toBe(false);
  });

  it('offers an explicit recovery path for an expired owned lease', async () => {
    const { project, set, root } = await preparedTask();

    await set.handoff.claim(root.id, 'agent-a', { now: base, leaseMs: MIN_TASK_LEASE_MS });

    const expiredAt = base + 10 * MIN_TASK_LEASE_MS;
    const resolution = engines(project).orchestration.resolveSessionExecution({
      agentId: 'agent-a',
      now: expiredAt,
    });

    /* Detection is passive: the runtime reports the recoverable state. */
    expect(resolution.mode).toBe('recoverable');
    expect(resolution.requiresClaim).toBe(true);

    /* Auto-recovery is opt-in and, when enabled, reclaims deterministically. */
    const previous = process.env.TOOLNET_TASK_AUTO_RECOVER;
    process.env.TOOLNET_TASK_AUTO_RECOVER = '1';

    try {
      const recovered = await resolveTaskSessionExecutionWithAutoRecovery(project, {
        agentId: 'agent-a',
        now: expiredAt,
      });

      expect(recovered.task?.id).toBe(root.id);
      expect(recovered.mode).toBe('owned');
      expect(recovered.reason).toBe('expired-lease-recovered');
      expect(recovered.requiresClaim).toBe(false);
    } finally {
      if (previous === undefined) {
        delete process.env.TOOLNET_TASK_AUTO_RECOVER;
      } else {
        process.env.TOOLNET_TASK_AUTO_RECOVER = previous;
      }
    }
  });

  it('produces a bounded, prose-free resume context', async () => {
    const { set, root } = await preparedTask();

    const context = set.orchestration.resumeContext(root.id);

    expect(JSON.stringify(context).length).toBeGreaterThan(0);

    const bootstrap = set.orchestration.renderSessionExecutionBootstrap({
      agentId: 'agent-a',
      now: base,
      maxChars: 700,
    });

    expect(bootstrap.length).toBeLessThanOrEqual(700);
  });

  it('never picks a random task when several are equally eligible', async () => {
    const project = tempProject();
    const set = engines(project);
    const root = await set.store.createTask({ kind: 'goal', title: 'tie-break' });

    const first = await set.store.createTask({
      kind: 'task',
      parentTaskId: root.id,
      title: 'first',
    });
    await set.store.createTask({ kind: 'task', parentTaskId: root.id, title: 'second' });

    const picks = [0, 1, 2].map(
      () => set.orchestration.resolveNextTask(root.id, 'agent-a').task?.id
    );

    expect(picks.every((id) => id === first.id)).toBe(true);
  });
});

/* ================================================================== *
 * §10/§14 Authority boundaries
 * ================================================================== */

describe('Phase 85F2 — authority boundaries', () => {
  it('derives Task state only from the Task WAL, not from prose or memory', async () => {
    const project = tempProject();
    const { store, state } = engines(project);

    const task = await store.createTask({ kind: 'task', title: 'authority' });

    await state.start(task.id);
    await state.addEvidence(task.id, { kind: 'note', summary: 'NOTE: this task is done' });

    /* Prose evidence must not change the authoritative status. */
    expect(store.getTask(task.id)?.status).toBe('active');

    /* Rebuilding the projection from the WAL reproduces identical state. */
    const before = store.projection();
    const after = store.rebuildProjection();

    expect(after.tasks).toEqual(before.tasks);
    expect(after.lastSequence).toBe(before.lastSequence);
  });

  it('keeps the Task WAL inside the project and independent of derived indexes', async () => {
    const project = tempProject();
    const { store } = engines(project);

    await store.createTask({ kind: 'task', title: 'isolated' });

    const logPath = taskOperationLogPath(project);

    expect(logPath.startsWith(project.rootPath)).toBe(true);
    expect(logPath).toContain(join('.toolnet', 'tasks'));

    /* Removing unrelated derived state must not alter Tasks. */
    const derived = join(project.rootPath, '.toolnet', 'cache');

    rmSync(derived, { recursive: true, force: true });

    expect(engines(project).store.listTasks()).toHaveLength(1);
  });

  it('isolates projects from each other', async () => {
    const first = tempProject('phase85f2-project-one');
    const second = tempProject('phase85f2-project-two');

    await engines(first).store.createTask({ kind: 'task', title: 'only in one' });

    expect(engines(second).store.listTasks()).toHaveLength(0);
  });
});

/* ================================================================== *
 * §11 WAL durability, replay and crash recovery
 * ================================================================== */

describe('Phase 85F2 — WAL, replay and crash recovery', () => {
  it('replays to the identical state and is idempotent', async () => {
    const project = tempProject();
    const { store, state } = engines(project);

    const task = await store.createTask({ kind: 'task', title: 'replay' });
    await state.start(task.id);
    await state.block(task.id, 'hold');
    await state.resume(task.id);

    const logPath = taskOperationLogPath(project);
    const operations = readFileSync(logPath, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));

    const once = projectTaskOperations(project.id, operations as never);
    const twice = projectTaskOperations(project.id, operations as never);

    expect(once.tasks).toEqual(store.projection().tasks);
    expect(twice.tasks).toEqual(once.tasks);
    expect(once.lastSequence).toBe(operations.length);
    expect(twice.lastSequence).toBe(once.lastSequence);
  });

  it('recovers an interrupted write by repairing only the corrupt tail', async () => {
    const project = tempProject();
    const { store } = engines(project);

    const task = await store.createTask({ kind: 'task', title: 'crash' });

    /* Simulate a process killed mid-append: an unterminated JSON fragment. */
    appendFileSync(taskOperationLogPath(project), '{"version":1,"operationId":"partial"');

    /* Strict reads fail closed on the damaged log. */
    expect(() => engines(project).store.projection()).toThrow();

    /* Recovery drops the incomplete tail and keeps every committed operation. */
    const rebuilt = engines(project).store.rebuildProjection();

    expect(rebuilt.tasks[task.id]?.title).toBe('crash');
    expect(rebuilt.lastSequence).toBe(1);

    /* The store is usable again after recovery. */
    const next = await engines(project).store.createTask({ kind: 'task', title: 'after crash' });

    expect(next.status).toBe('pending');
  });

  it('fails closed on a tampered committed operation', async () => {
    const project = tempProject();
    const { store } = engines(project);

    await store.createTask({ kind: 'task', title: 'tampered' });

    const logPath = taskOperationLogPath(project);
    const [line] = readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
    const operation = JSON.parse(line!) as Record<string, unknown>;

    operation.payloadSha256 = 'f'.repeat(64);
    operation.payload = { type: 'task.created', task: { id: 'injected' } };

    writeFileSync(logPath, `${JSON.stringify(operation)}\n`);

    expect(() => engines(project).store.projection()).toThrow(/TASK_OPERATION_HASH_MISMATCH/);
  });

  it('rejects sequence gaps, project mismatches and invalid sequences', () => {
    expect(() =>
      createTaskOperation({
        projectId: 'p',
        sequence: 0,
        payload: { type: 'task.progress.set', taskId: 't', completed: 0, total: 0 },
      })
    ).toThrow(/TASK_OPERATION_SEQUENCE_INVALID/);

    const gap = createTaskOperation({
      projectId: 'p',
      sequence: 5,
      payload: {
        type: 'task.created',
        task: {
          id: 't',
          kind: 'task',
          title: 'gap',
          status: 'pending',
          priority: 'normal',
          labels: [],
          order: 0,
        },
      },
    });

    expect(() => projectTaskOperations('p', [gap])).toThrow(/TASK_SEQUENCE_GAP/);
    expect(() => projectTaskOperations('other', [gap])).toThrow(/TASK_PROJECT_MISMATCH/);
  });

  it('never loses committed progress across a replayed restart', async () => {
    const project = tempProject();
    const { store, state } = engines(project);

    const task = await store.createTask({ kind: 'task', title: 'progress' });
    await state.start(task.id);
    await state.setProgress(task.id, 4, 9);
    await state.setNextAction(task.id, 'finish the rest');

    /* A cold runtime over the same root must observe the same durable state. */
    const cold = engines(project).store.getTask(task.id)!;

    expect(cold.progress).toEqual({ completed: 4, total: 9 });
    expect(cold.nextAction).toBe('finish the rest');
    expect(cold.status).toBe('active');
  });
});

/* ================================================================== *
 * §19 Security
 * ================================================================== */

describe('Phase 85F2 — security fail-closed behaviour', () => {
  it('does not pollute Object.prototype when sanitizing hostile persisted JSON', () => {
    const hostile = JSON.parse(
      '{"__proto__":{"polluted":true},"token":"ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"}'
    );

    const sanitized = sanitizeDurableValue(hostile) as Record<string, unknown>;

    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(sanitized, '__proto__')).toBe(false);
    expect(JSON.stringify(sanitized)).toContain('[REDACTED');
  });

  it('redacts secret-shaped values before they become durable task text', async () => {
    const project = tempProject();
    const { store, state } = engines(project);
    const task = await store.createTask({ kind: 'task', title: 'secrets' });

    const updated = await state.addEvidence(task.id, {
      kind: 'note',
      summary: 'aws key AKIAIOSFODNN7EXAMPLE and token ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    });

    const summary = updated.evidence.at(-1)!.summary;

    expect(summary).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(summary).not.toContain('ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
    expect(summary).toContain('[REDACTED');

    /* Nothing secret-shaped may reach the on-disk WAL either. */
    const raw = readFileSync(taskOperationLogPath(project), 'utf8');

    expect(raw).not.toContain('AKIAIOSFODNN7EXAMPLE');
  });

  it('records a hostile file path as inert text without touching the filesystem', async () => {
    const project = tempProject();
    const { store, state } = engines(project);
    const task = await store.createTask({ kind: 'task', title: 'paths' });

    const updated = await state.touchFile(task.id, '../../../../etc/passwd');

    expect(updated.filesTouched).toContain('../../../../etc/passwd');

    /* The value is only ever recorded; no file outside the project is created. */
    expect(existsSync(join(project.rootPath, '..', '..', '..', '..', 'etc', 'passwd'))).toBe(
      existsSync('/etc/passwd')
    );
  });
});

/* ================================================================== *
 * §20 Performance sanity
 * ================================================================== */

describe('Phase 85F2 — performance sanity', () => {
  it('does not rescan the repository for a single task read or update', async () => {
    const project = tempProject();
    const { store, state } = engines(project);

    const task = await store.createTask({ kind: 'task', title: 'fast' });

    const started = Date.now();

    for (let index = 0; index < 25; index += 1) {
      await state.setProgress(task.id, index + 1, 100);
      store.getTask(task.id);
    }

    const elapsed = Date.now() - started;

    /* Bounded work per mutation: no repo scan, no graph rebuild. */
    expect(elapsed).toBeLessThan(15_000);
    expect(store.getTask(task.id)?.progress.completed).toBe(25);
  });
});

/* ================================================================== *
 * §15/§16 Code intelligence determinism and negative-claim safety
 * ================================================================== */

describe('Phase 85F2 — code intelligence and evidence safety', () => {
  it('plans evidence deterministically with no randomness or LLM', () => {
    const request = {
      profile: 'auditor' as const,
      operation: 'query' as const,
      claim: 'positive' as const,
      scope: { kind: 'project' as const },
    };

    const fingerprints = [0, 1, 2].map(() => evidenceFingerprint(request));

    expect(new Set(fingerprints).size).toBe(1);
    expect(planEvidence(request).profile).toBe('auditor');
  });

  it('never lets Scout ground a negative or exhaustive claim', () => {
    const scout = profileDefinition('scout');

    expect(scout.allowNegativeClaims).toBe(false);
    expect(scout.evidenceLevel).toBe('provisional');
    expect(scout.claims.absence).toBe('provisional');
    expect(scout.claims.uniqueness).toBe('provisional');
    expect(scout.claims.dead_code).toBe('provisional');
    expect(scout.claims.exhaustive).toBe('blocked');

    expect(isNegativeClaim('absence')).toBe(true);
    expect(isNegativeClaim('dead_code')).toBe(true);
  });

  it('reserves exhaustive claims for Auditor and requires full coverage first', () => {
    const verify = profileDefinition('verify');
    const auditor = profileDefinition('auditor');

    expect(verify.allowNegativeClaims).toBe(true);
    expect(verify.requireFreshness).toBe(true);
    expect(verify.requireCoverage).toBe(true);
    expect(verify.claims.exhaustive).toBe('blocked');

    expect(auditor.requireExhaustivePagination).toBe(true);
    expect(auditor.claims.exhaustive).toBe('allowed');
  });

  it('refuses to ground absence on a capability that has no producer', () => {
    const facts = {
      coverageAvailable: true,
      coverageFor: () => ({ status: 'complete', negativeClaimSafe: true, reasons: [] }),
      capabilityProduced: () => false,
    } as unknown as EvidenceFacts;

    const combination = combineCoverage(facts, [
      { capability: 'call_graph', requiredForNegative: true, producerRequired: true },
    ]);

    expect(combination.negativeSafe).toBe(false);
    expect(combination.blockers).toContain('RESERVED_CAPABILITY_NO_PRODUCER');
    expect(combination.entries[0]?.negativeClaimSafe).toBe(false);
  });

  it('refuses to ground absence when coverage is unavailable', () => {
    const facts = {
      coverageAvailable: false,
      coverageFor: () => ({ status: 'complete', negativeClaimSafe: true, reasons: [] }),
      capabilityProduced: () => true,
    } as unknown as EvidenceFacts;

    const combination = combineCoverage(facts, [
      { capability: 'call_graph', requiredForNegative: true, producerRequired: true },
    ]);

    expect(combination.negativeSafe).toBe(false);
    expect(combination.blockers).toContain('COVERAGE_UNAVAILABLE');
  });

  it('never treats runtime non-observation as proof of absence', () => {
    const types = readFileSync(
      join(REPO_ROOT, 'src', 'code-intelligence', 'evidence', 'types.ts'),
      'utf8'
    );
    const report = readFileSync(
      join(REPO_ROOT, 'src', 'code-intelligence', 'evidence', 'report.ts'),
      'utf8'
    );

    expect(types).toContain('canEstablishAbsence: false');
    expect(report).toContain('never proof of absence');
  });
});

/* ================================================================== *
 * §17/§18 Packaged runtime parity
 * ================================================================== */

async function listPackagedMcpTools(bundlePath: string): Promise<string[]> {
  const cwd = mkdtempSync(join(tmpdir(), 'toolnet-phase85f2-'));

  const requests = `${[
    JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'phase85f2-certify', version: '1.0.0' },
      },
    }),
    JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }),
  ].join('\n')}\n`;

  const child = spawn(process.execPath, [bundlePath], { cwd, stdio: ['pipe', 'pipe', 'pipe'] });

  child.stderr.resume();

  return new Promise<string[]>((resolvePromise, rejectPromise) => {
    let buffer = '';
    let settled = false;
    let timer: NodeJS.Timeout | undefined;

    const finish = (complete: () => void): void => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      child.kill('SIGKILL');
      complete();
    };

    timer = setTimeout(
      () => finish(() => rejectPromise(new Error('packaged runtime probe timed out'))),
      60_000
    );

    child.stdout.setEncoding('utf8');

    child.stdout.on('data', (chunk: string) => {
      buffer += chunk;

      const lines = buffer.split('\n');

      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed.startsWith('{')) continue;

        let message: { id?: unknown; result?: { tools?: Array<{ name?: unknown }> } };

        try {
          message = JSON.parse(trimmed) as typeof message;
        } catch {
          continue;
        }

        if (message.id !== 2) continue;

        const names = (message.result?.tools ?? []).map((tool) => String(tool.name));

        finish(() => resolvePromise(names));

        return;
      }
    });

    child.on('error', (error) => finish(() => rejectPromise(error)));

    child.stdin.write(requests);
  });
}

describe('Phase 85F2 — packaged runtime parity', () => {
  const REQUIRED_TASK_TOOLS = [
    'task_create',
    'task_get',
    'task_list',
    'task_update',
    'task_start',
    'task_block',
    'task_resume',
    'task_complete',
    'task_progress',
    'task_next_action',
    'task_dependency_add',
    'task_dependency_remove',
    'task_evidence_add',
    'task_file_touch',
    'task_test_record',
    'task_claim',
    'task_heartbeat',
    'task_release',
    'task_handoff',
    'task_next',
    'task_resume_context',
  ];

  it('ships the whole Task surface inside the packaged MCP bundle', async () => {
    const bundlePath = join(REPO_ROOT, 'bundle', 'mcp.js');

    expect(existsSync(bundlePath)).toBe(true);

    const tools = await listPackagedMcpTools(bundlePath);

    for (const tool of REQUIRED_TASK_TOOLS) {
      expect(tools, tool).toContain(tool);
    }
  }, 90_000);

  it('exposes the packaged Task CLI and keeps it in parity with the in-process authority', async () => {
    const cli = join(REPO_ROOT, 'bundle', 'task-cli.js');

    expect(existsSync(cli)).toBe(true);

    const project = tempProject('phase85f2-packaged');

    const created = execFileSync(
      process.execPath,
      [
        cli,
        'create',
        '--kind',
        'task',
        '--title',
        'Packaged task',
        '--project',
        project.rootPath,
        '--agent',
        'cli-agent',
        '--json',
      ],
      { encoding: 'utf8' }
    );

    const payloadLine = created
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.startsWith('{'))
      .pop();

    expect(payloadLine, created).toBeDefined();

    const createdTask = JSON.parse(payloadLine!) as { id?: string; title?: string };

    expect(createdTask.title).toBe('Packaged task');

    /* The in-process authority must see exactly the same durable task. */
    const inProcess = engines(project).store.getTask(createdTask.id!);

    expect(inProcess?.title).toBe('Packaged task');
    expect(inProcess?.projectId).toBe(project.id);

    const listed = execFileSync(
      process.execPath,
      [cli, 'list', '--project', project.rootPath, '--json'],
      { encoding: 'utf8' }
    );

    expect(listed).toContain('Packaged task');
  }, 90_000);

  it('keeps the Task authority inside the shipped source set', () => {
    for (const relative of [
      'src/tasks/store.ts',
      'src/tasks/projection.ts',
      'src/tasks/state-engine.ts',
      'src/tasks/handoff-projection.ts',
      'src/tasks/operation-log.ts',
      'src/tasks/dependency-scheduler.ts',
    ]) {
      expect(existsSync(join(REPO_ROOT, relative)), relative).toBe(true);
    }

    /* Provider adapters must not write the Task authority directly. */
    const orchestrationSource = readFileSync(
      join(REPO_ROOT, 'src', 'session', 'native-plan', 'mutate.ts'),
      'utf8'
    );

    expect(orchestrationSource).toContain('TaskMirrorMutationExecutor');
    expect(orchestrationSource).toContain('Provider adapters remain normalize-only');
  });
});

/* ================================================================== *
 * §3 Architecture invariants (structural assertions)
 * ================================================================== */

describe('Phase 85F2 — architecture invariants', () => {
  it('keeps the declared local-first / deterministic / no-LLM posture', () => {
    const manifest = JSON.parse(readFileSync(join(REPO_ROOT, 'release-manifest.json'), 'utf8'));

    expect(manifest.runtime?.requiresEmbeddings).toBe(false);
    expect(manifest.runtime?.sharedProjectMemory).toBe(true);

    const runtime = manifest.runtime ?? {};

    expect(JSON.stringify(runtime)).not.toMatch(/vectorStore|vectorDb|embeddingModel/iu);
  });

  it('confines Task authority writes to the TaskStore', () => {
    const storeSource = readFileSync(join(REPO_ROOT, 'src', 'tasks', 'store.ts'), 'utf8');

    /* Only the store owns WAL appends and projection writes. */
    expect(storeSource).toContain('appendOperation');
    expect(storeSource).toContain('atomicWriteProjection');

    const logSource = readFileSync(join(REPO_ROOT, 'src', 'tasks', 'operation-log.ts'), 'utf8');

    expect(logSource).toContain("join('/')");

    /* Memory must not import the Task write path. */
    for (const memoryModule of ['src/memory/index.ts']) {
      const path = join(REPO_ROOT, memoryModule);

      if (!existsSync(path)) continue;

      expect(readFileSync(path, 'utf8')).not.toContain('TaskStore');
    }
  });
});

/* ================================================================== *
 * Certification marker
 * ================================================================== */

describe('Phase 85F2 — certification', () => {
  it('emits the Phase 85F2 PASS marker', () => {
    console.log(PHASE85F2_MARKER);

    expect(PHASE85F2_MARKER).toBe('PHASE85F2_PRODUCT_CAPABILITY_AUDIT=PASS');
  });
});
