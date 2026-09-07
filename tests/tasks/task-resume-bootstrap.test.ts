import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProjectManifest } from '../../src/core/types.js';
import { TaskOrchestrationEngine } from '../../src/tasks/orchestration-engine.js';
import { TaskStateEngine } from '../../src/tasks/state-engine.js';
import { TaskStore } from '../../src/tasks/store.js';
import type { TaskReplicationConflict } from '../../src/tasks/replication/types.js';

const roots: string[] = [];

function project(): ProjectManifest {
  const rootPath = mkdtempSync(join(tmpdir(), 'toolnet-task-resume-'));
  roots.push(rootPath);
  return {
    id: 'task-resume-project',
    name: 'task-resume-project',
    remote: 'task-resume-project',
    rootPath,
    createdAt: '2026-09-07T00:00:00.000Z',
    updatedAt: '2026-09-07T00:00:00.000Z',
    graphVersion: 0,
    memoryVersion: 0,
  };
}

function engine(p: ProjectManifest, conflicts: TaskReplicationConflict[] = []) {
  const store = new TaskStore(p);
  return {
    store,
    state: new TaskStateEngine(store),
    orchestration: new TaskOrchestrationEngine(store, () => conflicts),
  };
}

afterEach(() => {
  delete process.env.TOOLNET_TASK_AUTO_RECOVER;
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('Phase 47 autonomous Task recovery and session resume bootstrap', () => {
  it('resolves an existing valid lease before recommending another Task', async () => {
    const p = project();
    const { store, orchestration } = engine(p);
    const owned = await store.createTask({ kind: 'task', title: 'Owned Task', priority: 'low' });
    await store.createTask({
      kind: 'task',
      title: 'Higher priority recommendation',
      priority: 'high',
    });
    await orchestration.claim(owned.id, 'codex');

    const resolution = orchestration.resolveSessionExecution({ agentId: 'codex' });
    expect(resolution.mode).toBe('owned');
    expect(resolution.task?.id).toBe(owned.id);
    expect(resolution.requiresClaim).toBe(false);
  });

  it('resolves an explicit handoff to the target agent without stealing a lease', async () => {
    const p = project();
    const { store, orchestration } = engine(p);
    const task = await store.createTask({ kind: 'task', title: 'Handoff Task' });
    await orchestration.claim(task.id, 'codex');
    await orchestration.handoff(task.id, 'codex', 'opencode', 'Continue on VPS B');

    const resolution = orchestration.resolveSessionExecution({ agentId: 'opencode' });
    expect(resolution.mode).toBe('handoff');
    expect(resolution.task?.id).toBe(task.id);
    expect(resolution.task?.activeLease?.agentId).toBe('opencode');
    expect(resolution.requiresClaim).toBe(false);
  });

  it('reports expired recovery but does not claim by default', async () => {
    const p = project();
    const { store, orchestration } = engine(p);
    const task = await store.createTask({ kind: 'task', title: 'Crash recovery' });
    const startedAt = Date.parse('2026-09-07T01:00:00.000Z');
    await orchestration.claim(task.id, 'codex', { now: startedAt, leaseMs: 30_000 });

    const resolution = orchestration.resolveSessionExecution({
      agentId: 'codex',
      now: startedAt + 30_001,
    });
    expect(resolution.mode).toBe('recoverable');
    expect(resolution.requiresClaim).toBe(true);
    expect(store.getTask(task.id)?.activeLease?.agentId).toBe('codex');
  });

  it('auto-recovers only an expired unconflicted Task when explicitly enabled', async () => {
    process.env.TOOLNET_TASK_AUTO_RECOVER = '1';
    const p = project();
    const { store, orchestration } = engine(p);
    const task = await store.createTask({ kind: 'task', title: 'Opt-in recovery' });
    const startedAt = Date.parse('2026-09-07T02:00:00.000Z');
    await orchestration.claim(task.id, 'codex', { now: startedAt, leaseMs: 30_000 });

    const resolution = orchestration.resolveSessionExecution({
      agentId: 'codex',
      now: startedAt + 30_001,
    });
    expect(resolution.mode).toBe('recoverable');
    expect(resolution.requiresClaim).toBe(true);

    const recovered = await orchestration.claim(task.id, 'codex', {
      now: startedAt + 30_001,
      leaseMs: 30_000,
    });
    expect(recovered.takeover).toBe(false);
    expect(recovered.task.lastAgentId).toBe('codex');
  });

  it('does not resolve a valid foreign lease or a replication conflict', async () => {
    const p = project();
    const conflict: TaskReplicationConflict = {
      id: 'lease-conflict',
      code: 'TASK_LEASE_CONFLICT',
      taskId: 'conflicted',
      operationKeys: ['host-a\u00001', 'host-b\u00001'],
      message: 'Concurrent claims',
    };
    const { store, orchestration } = engine(p, [conflict]);
    const foreign = await store.createTask({ kind: 'task', title: 'Foreign lease' });
    const conflicted = await store.createTask({
      id: 'conflicted',
      kind: 'task',
      title: 'Conflict',
    });
    await orchestration.claim(foreign.id, 'opencode');

    const foreignResolution = orchestration.resolveSessionExecution({ agentId: 'codex' });
    expect(foreignResolution.mode).toBe('none');

    const conflictedResolution = orchestration.resolveSessionExecution({ agentId: 'codex' });
    expect(conflictedResolution.task?.id).not.toBe(conflicted.id);
    await expect(orchestration.claim(conflicted.id, 'codex')).rejects.toThrow(
      'TASK_REPLICATION_CONFLICT'
    );
  });

  it('recommends deterministic ready work without claiming it', async () => {
    const p = project();
    const { store, orchestration } = engine(p);
    const low = await store.createTask({ kind: 'task', title: 'Low', priority: 'low', order: 0 });
    const high = await store.createTask({
      kind: 'task',
      title: 'High',
      priority: 'high',
      order: 9,
    });

    const first = orchestration.resolveSessionExecution({ agentId: 'kiro', now: 0 });
    const second = orchestration.resolveSessionExecution({ agentId: 'kiro', now: 0 });
    expect(first.mode).toBe('recommended');
    expect(first.task?.id).toBe(high.id);
    expect(second.task?.id).toBe(high.id);
    expect(store.getTask(low.id)?.activeLease).toBeUndefined();
    expect(store.getTask(high.id)?.activeLease).toBeUndefined();
  });

  it('renders bounded durable context without hidden reasoning or raw output', async () => {
    const p = project();
    const { store, state, orchestration } = engine(p);
    const task = await store.createTask({ kind: 'task', title: 'Safe resume task' });
    await state.start(task.id);
    await state.setProgress(task.id, 2, 5);
    await state.setNextAction(task.id, 'Finish the safe bootstrap');
    await state.touchFile(task.id, 'src/tasks/session-resume.ts');
    await orchestration.claim(task.id, 'codex');

    const bootstrap = orchestration.renderSessionExecutionBootstrap({
      agentId: 'codex',
      maxChars: 700,
    });
    expect(bootstrap.length).toBeLessThanOrEqual(700);
    expect(bootstrap).toContain('[TOOLNET TASK RESUME]');
    expect(bootstrap).toContain('Safe resume task');
    expect(bootstrap).toContain('src/tasks/session-resume.ts');
    expect(bootstrap).not.toContain('reasoning');
    expect(bootstrap).not.toContain('stdout');
    expect(bootstrap).not.toContain('API_KEY');
  });

  it('keeps the Codex and OpenCode startup paths on the canonical context surface', () => {
    const codexHook = readFileSync('src/session/codex/context-hook.ts', 'utf8');
    const runtimeCli = readFileSync('src/work-continuity/context-runtime-cli.ts', 'utf8');
    const plugin = readFileSync('src/session/opencode/plugin-installer.ts', 'utf8');
    expect(codexHook).toContain('renderTaskSessionBootstrap');
    /*
     * Phase 56: the context runtime print path derives Current Work from
     * the canonical Persistent Task projection instead of prepending a
     * second Task resume bootstrap on top of current.md.
     */
    expect(runtimeCli).not.toContain('renderTaskSessionBootstrap');
    expect(runtimeCli).toContain('buildFastProjectContext');
    expect(plugin).toContain('context:print');
    expect(plugin).not.toContain('task_next');
  });

  it('does not create an automatic Task claim for a recommendation', async () => {
    const p = project();
    const { store, orchestration } = engine(p);
    const task = await store.createTask({ kind: 'task', title: 'Only recommendation' });
    const resolution = orchestration.resolveSessionExecution({ agentId: 'opencode' });
    expect(resolution.mode).toBe('recommended');
    expect(resolution.requiresClaim).toBe(true);
    expect(store.getTask(task.id)?.activeLease).toBeUndefined();
  });
});
