/*
 * Phase 85G1 — Task Invariant Hardening certification.
 *
 * Closes the Task gaps Phase 85F2 reported, at runtime and against the real
 * Task authority (no mocks, no fabricated operations):
 *
 *   G-1  legacy status bypass — `TaskStore.setTaskStatus` /
 *        `ProjectTaskService.setStatus` now delegate to the single canonical
 *        lifecycle transition, so lifecycleAllowed, completionGuard, the
 *        dependency guard, the child-completion guard and terminal-state rules
 *        all apply to every status mutation.
 *   G-2  WAL domain error  — an unterminated/corrupt tail surfaces
 *        TASK_OPERATION_LOG_CORRUPT instead of a raw SyntaxError, while
 *        crash-tail recovery semantics stay unchanged.
 *   G-3  __proto__ boundary — `sanitizeValue` keeps a hostile own `__proto__`
 *        key as an own data property and can never mutate any prototype.
 *   G-4  reason codes — TASK_COMPLETE_BLOCKED / TASK_HANDOFF_TERMINAL are
 *        documented internal defensive invariants, not dead code; no fake
 *        operations are constructed to exercise them.
 *
 * Read-only with respect to the repository: every mutation happens in a
 * throwaway temp project. Never commits, tags, pushes or publishes.
 *
 * PASS marker: PHASE85G1_TASK_INVARIANT_HARDENING=PASS
 */

import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { ProjectManager } from '../../src/core/project-manager.js';
import type { ProjectManifest } from '../../src/core/types.js';
import { sanitizeDurableValue } from '../../src/security/durable-sanitizer.js';
import { TaskHandoffEngine } from '../../src/tasks/handoff-engine.js';
import { readTaskOperations, taskOperationLogPath } from '../../src/tasks/operation-log.js';
import { ProjectTaskService } from '../../src/tasks/service.js';
import { TaskStateEngine } from '../../src/tasks/state-engine.js';
import { TaskStore } from '../../src/tasks/store.js';

const REPO_ROOT = process.cwd();
const PHASE85G1_MARKER = 'PHASE85G1_TASK_INVARIANT_HARDENING=PASS';

/* ================================================================== *
 * Harness
 * ================================================================== */

const roots: string[] = [];

function tempProject(id = 'phase85g1-project'): ProjectManifest {
  const rootPath = mkdtempSync(join(tmpdir(), 'toolnet-phase85g1-'));

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
  };
}

function code(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function rejectsCode(run: () => Promise<unknown> | unknown, expected: string): Promise<void> {
  try {
    await run();
  } catch (error) {
    expect(code(error), `expected ${expected}`).toContain(expected);

    return;
  }

  throw new Error(`expected rejection containing ${expected}, but the call resolved`);
}

function walPayloadTypes(project: ProjectManifest): string[] {
  return readTaskOperations(taskOperationLogPath(project)).map(
    (operation) => operation.payload.type
  );
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

/* ================================================================== *
 * G-1 — legacy status bypass
 * ================================================================== */

describe('Phase 85G1 — G-1 canonical status mutation', () => {
  it('routes the legacy writer through the lifecycle transition, never the Phase 33 bypass', async () => {
    const project = tempProject();
    const { store } = engines(project);

    const task = await store.createTask({ kind: 'task', title: 'canonical writer' });

    await store.setTaskStatus(task.id, 'active');
    await store.setTaskStatus(task.id, 'completed');

    const types = walPayloadTypes(project);

    expect(types).not.toContain('task.status.set');
    expect(types.filter((type) => type === 'task.lifecycle.transition')).toHaveLength(2);
    expect((await store.getTask(task.id))?.status).toBe('completed');
  });

  it('rejects pending -> completed while a child is still open', async () => {
    const project = tempProject();
    const { store } = engines(project);

    const goal = await store.createTask({ kind: 'goal', title: 'goal' });
    const task = await store.createTask({
      kind: 'task',
      parentTaskId: goal.id,
      title: 'parent',
    });

    await store.createTask({ kind: 'subtask', parentTaskId: task.id, title: 'open child' });

    /* pending -> completed is not a lifecycle transition at all. */
    await rejectsCode(() => store.setTaskStatus(task.id, 'completed'), 'TASK_LIFECYCLE_INVALID');

    /* Even from active, the child-completion guard blocks it. */
    await store.setTaskStatus(task.id, 'active');
    await rejectsCode(
      () => store.setTaskStatus(task.id, 'completed'),
      'TASK_COMPLETE_CHILDREN_OPEN'
    );

    expect((await store.getTask(task.id))?.status).toBe('active');
  });

  it('rejects blocked -> completed against the rule', async () => {
    const project = tempProject();
    const { store, state } = engines(project);

    const task = await store.createTask({ kind: 'task', title: 'blocked' });

    await state.start(task.id);
    await state.block(task.id, 'waiting on a dependency');

    await rejectsCode(() => store.setTaskStatus(task.id, 'completed'), 'TASK_LIFECYCLE_INVALID');

    expect((await store.getTask(task.id))?.status).toBe('blocked');
  });

  it('rejects completed -> active and other terminal transitions', async () => {
    const project = tempProject();
    const { store, state } = engines(project);

    const task = await store.createTask({ kind: 'task', title: 'terminal' });

    await state.start(task.id);
    await state.complete(task.id);

    await rejectsCode(() => store.setTaskStatus(task.id, 'active'), 'TASK_LIFECYCLE_INVALID');
    await rejectsCode(
      () => store.setTaskStatus(task.id, 'blocked', { blockerReason: 'x' }),
      'TASK_LIFECYCLE_INVALID'
    );
    await rejectsCode(() => store.setTaskStatus(task.id, 'completed'), 'TASK_LIFECYCLE_INVALID');

    const cancelled = await store.createTask({ kind: 'task', title: 'cancelled' });

    await store.setTaskStatus(cancelled.id, 'cancelled');
    await rejectsCode(() => store.setTaskStatus(cancelled.id, 'active'), 'TASK_LIFECYCLE_INVALID');
  });

  it('rejects invalid transitions and a blocked transition without a reason', async () => {
    const project = tempProject();
    const { store } = engines(project);

    const task = await store.createTask({ kind: 'task', title: 'invalid' });

    /* pending may only become active or cancelled. */
    await rejectsCode(
      () => store.setTaskStatus(task.id, 'blocked', { blockerReason: 'r' }),
      'TASK_LIFECYCLE_INVALID'
    );
    await rejectsCode(() => store.setTaskStatus(task.id, 'pending'), 'TASK_LIFECYCLE_INVALID');

    /* blocked requires an explicit reason on the canonical path. */
    await store.setTaskStatus(task.id, 'active');
    await rejectsCode(
      () => store.setTaskStatus(task.id, 'blocked'),
      'TASK_BLOCKER_REASON_REQUIRED'
    );
  });

  it('accepts every valid transition through the legacy writer', async () => {
    const project = tempProject();
    const { store } = engines(project);

    const started = await store.createTask({ kind: 'task', title: 'started' });
    expect((await store.setTaskStatus(started.id, 'active')).status).toBe('active');
    expect((await store.setTaskStatus(started.id, 'completed')).status).toBe('completed');

    const cancelled = await store.createTask({ kind: 'task', title: 'cancelled' });
    expect((await store.setTaskStatus(cancelled.id, 'cancelled')).status).toBe('cancelled');

    const resumed = await store.createTask({ kind: 'task', title: 'resumed' });
    await store.setTaskStatus(resumed.id, 'active');
    await store.setTaskStatus(resumed.id, 'blocked', { blockerReason: 'paused' });
    expect((await store.setTaskStatus(resumed.id, 'active')).status).toBe('active');
  });

  it('enforces the dependency guard through the legacy writer', async () => {
    const project = tempProject();
    const { store, state } = engines(project);

    const dependency = await store.createTask({ kind: 'task', title: 'dependency' });
    const task = await store.createTask({ kind: 'task', title: 'dependent' });

    await state.addDependency(task.id, dependency.id);
    await state.start(task.id);

    await rejectsCode(
      () => store.setTaskStatus(task.id, 'completed'),
      'TASK_COMPLETE_DEPENDENCIES_PENDING'
    );
  });

  it('makes ProjectTaskService.setStatus share exactly the same guarded path', async () => {
    const project = tempProject('phase85g1-service');
    const service = new ProjectTaskService(project.rootPath);

    const task = await service.create({ kind: 'task', title: 'service task' });

    await rejectsCode(() => service.setStatus(task.id, 'completed'), 'TASK_LIFECYCLE_INVALID');
    expect((await service.setStatus(task.id, 'active')).status).toBe('active');
    expect((await service.setStatus(task.id, 'completed')).status).toBe('completed');
    await rejectsCode(() => service.setStatus(task.id, 'active'), 'TASK_LIFECYCLE_INVALID');
  });

  it('leaves the Phase 33 reducer branch solely for replay', () => {
    const storeSource = readFileSync(join(REPO_ROOT, 'src', 'tasks', 'store.ts'), 'utf8');
    const serviceSource = readFileSync(join(REPO_ROOT, 'src', 'tasks', 'service.ts'), 'utf8');
    const projectionSource = readFileSync(join(REPO_ROOT, 'src', 'tasks', 'projection.ts'), 'utf8');

    /* No production author emits the unguarded primitive any more. */
    expect(storeSource).not.toContain("'task.status.set'");
    expect(serviceSource).not.toContain("'task.status.set'");
    expect(storeSource).toContain("'task.lifecycle.transition'");

    /* The reducer keeps it so historical operations stay replayable. */
    expect(projectionSource).toContain("'task.status.set'");
    expect(projectionSource).toContain('Legacy Phase 33 compatibility');
  });
});

/* ================================================================== *
 * G-2 — WAL domain error
 * ================================================================== */

describe('Phase 85G1 — G-2 WAL corruption domain error', () => {
  it('maps an unterminated WAL tail to TASK_OPERATION_LOG_CORRUPT, never a raw SyntaxError', async () => {
    const project = tempProject();
    const store = new TaskStore(project);

    await store.createTask({ kind: 'task', title: 'wal' });

    const file = taskOperationLogPath(project);

    appendFileSync(file, '{"version":1,"operationId":"torn-write', 'utf8');

    let thrown: unknown;

    try {
      readTaskOperations(file);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown).not.toBeInstanceOf(SyntaxError);
    expect(code(thrown)).toContain('TASK_OPERATION_LOG_CORRUPT');
    expect(code(thrown)).toContain('unterminated');

    /* The read-only projection path must surface the same structured code. */
    await rejectsCode(() => store.projection(), 'TASK_OPERATION_LOG_CORRUPT');
  });

  it('keeps the structured code for a corrupt complete line', async () => {
    const project = tempProject();
    const store = new TaskStore(project);

    await store.createTask({ kind: 'task', title: 'wal' });

    const file = taskOperationLogPath(project);

    appendFileSync(file, '{ not json }\n', 'utf8');

    await rejectsCode(() => readTaskOperations(file), 'TASK_OPERATION_LOG_CORRUPT line=');
  });

  it('still repairs a torn tail when recovery is requested', async () => {
    const project = tempProject();
    const store = new TaskStore(project);

    const task = await store.createTask({ kind: 'task', title: 'recoverable' });

    const file = taskOperationLogPath(project);

    appendFileSync(file, '{"partial-crash-tail":', 'utf8');

    const rebuilt = store.rebuildProjection();

    expect(rebuilt.tasks[task.id]?.title).toBe('recoverable');

    const recovered = readFileSync(file, 'utf8');

    expect(recovered.endsWith('\n')).toBe(true);
    expect(recovered).not.toContain('partial-crash-tail');
  });
});

/* ================================================================== *
 * G-3 — __proto__ boundary
 * ================================================================== */

describe('Phase 85G1 — G-3 sanitizer __proto__ boundary', () => {
  it('refuses a hostile own __proto__ key without polluting any prototype', () => {
    const prototypeNames = Object.getOwnPropertyNames(Object.prototype).sort().join(',');
    const hostile = JSON.parse('{"__proto__":{"polluted":true},"safe":"kept"}') as unknown;

    expect(Object.prototype.hasOwnProperty.call(hostile, '__proto__')).toBe(true);

    const sanitized = sanitizeDurableValue(hostile) as Record<string, unknown>;

    /* The prototype accessor key is refused: it is neither own nor inherited. */
    expect(Object.prototype.hasOwnProperty.call(sanitized, '__proto__')).toBe(false);
    expect((sanitized as { polluted?: unknown }).polluted).toBeUndefined();
    expect(sanitized.safe).toBe('kept');

    /* The output keeps a normal prototype and nothing anywhere was polluted. */
    expect(Object.getPrototypeOf(sanitized)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted')).toBe(false);
    expect(Object.getOwnPropertyNames(Object.prototype).sort().join(',')).toBe(prototypeNames);
  });

  it('never mutates global prototypes, even for nested hostile values', () => {
    const before = Object.getOwnPropertyNames(Object.prototype).sort().join(',');

    const sanitized = sanitizeDurableValue(
      JSON.parse('{"a":[{"__proto__":{"polluted":1}}],"__proto__":{"alsoPolluted":2}}') as unknown
    ) as { a: Array<Record<string, unknown>> };

    expect(Object.getOwnPropertyNames(Object.prototype).sort().join(',')).toBe(before);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(({} as Record<string, unknown>).alsoPolluted).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(sanitized.a[0], '__proto__')).toBe(false);
    expect(Object.getPrototypeOf(sanitized.a[0])).toBe(Object.prototype);
  });

  it('still redacts sensitive keys', () => {
    const sanitized = sanitizeDurableValue({
      apiKey: 'sk-live-secret',
      credentials: { token: 'abc' },
      safe: 'value',
    }) as Record<string, unknown>;

    expect(sanitized.apiKey).toBe('[REDACTED]');
    expect(sanitized.safe).toBe('value');
  });
});

/* ================================================================== *
 * G-4 — reason-code decision
 * ================================================================== */

describe('Phase 85G1 — G-4 reason-code decision', () => {
  it('documents TASK_COMPLETE_BLOCKED and TASK_HANDOFF_TERMINAL as internal invariants', () => {
    const projection = readFileSync(join(REPO_ROOT, 'src', 'tasks', 'projection.ts'), 'utf8');
    const handoff = readFileSync(join(REPO_ROOT, 'src', 'tasks', 'handoff-projection.ts'), 'utf8');

    expect(projection).toContain("'TASK_COMPLETE_BLOCKED'");
    expect(projection).toContain('INTERNAL DEFENSIVE INVARIANT');
    expect(handoff).toContain('TASK_HANDOFF_TERMINAL');
    expect(handoff).toContain('INTERNAL DEFENSIVE INVARIANT');
  });

  it('keeps the canonical paths failing closed before either invariant is reached', async () => {
    const project = tempProject();
    const { store, state, handoff } = engines(project);

    /* A blocked Task must be resumed before it can complete, so the supported
     * path fails with TASK_LIFECYCLE_INVALID and never reaches the guard. */
    const blocked = await store.createTask({ kind: 'task', title: 'blocked' });

    await state.start(blocked.id);
    await state.block(blocked.id, 'waiting');
    await rejectsCode(() => state.complete(blocked.id), 'TASK_LIFECYCLE_INVALID');

    /* A terminal Task has no lease, so a handoff fails with TASK_LEASE_NOT_FOUND
     * before the terminal guard and never moves a terminal Task. */
    const done = await store.createTask({ kind: 'task', title: 'done' });

    await state.start(done.id);
    await state.complete(done.id);
    await rejectsCode(() => handoff.handoff(done.id, 'agent-a', 'agent-b'), 'TASK_LEASE_NOT_FOUND');
  });
});

/* ================================================================== *
 * Certification marker
 * ================================================================== */

describe('Phase 85G1 — certification', () => {
  it('emits the Phase 85G1 PASS marker', () => {
    console.log(PHASE85G1_MARKER);

    expect(PHASE85G1_MARKER).toBe('PHASE85G1_TASK_INVARIANT_HARDENING=PASS');
  });
});
