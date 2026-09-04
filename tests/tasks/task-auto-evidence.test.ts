import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProjectManifest } from '../../src/core/types.js';
import { TaskAutoEvidenceEngine } from '../../src/tasks/auto-evidence.js';
import { TaskHandoffEngine } from '../../src/tasks/handoff-engine.js';
import { TaskStateEngine } from '../../src/tasks/state-engine.js';
import { TaskStore } from '../../src/tasks/store.js';

const roots: string[] = [];

function project(): ProjectManifest {
  const rootPath = mkdtempSync(join(tmpdir(), 'toolnet-task-auto-evidence-'));
  roots.push(rootPath);
  return {
    id: 'auto-evidence-project',
    name: 'auto-evidence-project',
    remote: 'auto-evidence-project',
    rootPath,
    createdAt: '2026-09-04T00:00:00.000Z',
    updatedAt: '2026-09-04T00:00:00.000Z',
    graphVersion: 0,
    memoryVersion: 0,
  };
}

async function claimedTask(p: ProjectManifest, agentId = 'codex') {
  const store = new TaskStore(p);
  const state = new TaskStateEngine(store);
  const handoff = new TaskHandoffEngine(store);
  const task = await store.createTask({
    kind: 'task',
    title: 'Automatic evidence',
  });
  await state.start(task.id);
  await handoff.claim(task.id, agentId);
  return { store, state, handoff, task };
}

function git(root: string, args: string[]): string {
  const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(String(result.stderr));
  }
  return String(result.stdout).trim();
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('Phase 38 Automatic Task Evidence', () => {
  it('records edited project file on the claimed Task', async () => {
    const p = project();
    const { store, task } = await claimedTask(p);
    const engine = new TaskAutoEvidenceEngine(store, {
      projectRoot: p.rootPath,
      agentId: 'codex',
    });
    const result = await engine.recordFileWrite(join(p.rootPath, 'src', 'feature.ts'));
    expect(result.recorded).toBe(true);
    expect(store.getTask(task.id)?.filesTouched).toContain('src/feature.ts');
  });

  it('ignores internal and outside-project files', async () => {
    const p = project();
    const { store, task } = await claimedTask(p);
    const engine = new TaskAutoEvidenceEngine(store, {
      projectRoot: p.rootPath,
      agentId: 'codex',
    });
    await engine.recordFileWrite(join(p.rootPath, '.toolnet', 'tasks', 'state.json'));
    await engine.recordFileWrite(join(tmpdir(), 'outside-secret.txt'));
    expect(store.getTask(task.id)?.filesTouched).toEqual([]);
  });

  it('records automatic test PASS and FAIL without raw output', async () => {
    const p = project();
    const { store, task } = await claimedTask(p);
    const engine = new TaskAutoEvidenceEngine(store, {
      projectRoot: p.rootPath,
      agentId: 'codex',
    });
    await engine.recordCommand('npm run tasks:panel:test -- --secret SHOULD_NOT_STORE', 0);
    await engine.recordCommand('pytest --token SHOULD_NOT_STORE', 1);
    const updated = store.getTask(task.id)!;
    expect(updated.tests.map((test) => test.outcome)).toEqual(['pass', 'fail']);
    expect(JSON.stringify(updated.tests)).not.toContain('SHOULD_NOT_STORE');
  });

  it('records verification evidence from safe normalized command label', async () => {
    const p = project();
    const { store, task } = await claimedTask(p);
    const engine = new TaskAutoEvidenceEngine(store, {
      projectRoot: p.rootPath,
      agentId: 'codex',
    });
    await engine.recordCommand('npm run typecheck -- --token SHOULD_NOT_STORE', 0);
    const evidence = store.getTask(task.id)!.evidence;
    expect(evidence.some((item) => item.summary === 'Verification PASS: npm run typecheck')).toBe(
      true
    );
    expect(JSON.stringify(evidence)).not.toContain('SHOULD_NOT_STORE');
  });

  it('records successful commit SHA evidence', async () => {
    const p = project();
    git(p.rootPath, ['init']);
    git(p.rootPath, ['config', 'user.email', 'toolnet@example.invalid']);
    git(p.rootPath, ['config', 'user.name', 'ToolNet Test']);
    writeFileSync(join(p.rootPath, 'README.test'), 'one\n');
    git(p.rootPath, ['add', 'README.test']);
    git(p.rootPath, ['commit', '-m', 'initial']);
    const { store, task } = await claimedTask(p);
    const engine = new TaskAutoEvidenceEngine(store, {
      projectRoot: p.rootPath,
      agentId: 'codex',
    });
    writeFileSync(join(p.rootPath, 'README.test'), 'two\n');
    git(p.rootPath, ['add', 'README.test']);
    git(p.rootPath, ['commit', '-m', 'change']);
    const sha = git(p.rootPath, ['rev-parse', 'HEAD']);
    await engine.recordCommand('git commit -m "change"', 0);
    const updated = store.getTask(task.id)!;
    expect(updated.evidence.some((item) => item.kind === 'commit' && item.ref === sha)).toBe(true);
  });

  it('does not guess when no Task is claimed', async () => {
    const p = project();
    const store = new TaskStore(p);
    const task = await store.createTask({ kind: 'task', title: 'Unclaimed' });
    const engine = new TaskAutoEvidenceEngine(store, {
      projectRoot: p.rootPath,
      agentId: 'codex',
    });
    const result = await engine.recordFileWrite('src/nope.ts');
    expect(result.recorded).toBe(false);
    expect(store.getTask(task.id)?.filesTouched).toEqual([]);
  });

  it('fails closed on ambiguous multiple active claims', async () => {
    const p = project();
    const store = new TaskStore(p);
    const state = new TaskStateEngine(store);
    const handoff = new TaskHandoffEngine(store);
    const first = await store.createTask({ kind: 'task', title: 'First' });
    const second = await store.createTask({ kind: 'task', title: 'Second' });
    await state.start(first.id);
    await state.start(second.id);
    await handoff.claim(first.id, 'codex');
    await handoff.claim(second.id, 'codex');
    const ambiguous = new TaskAutoEvidenceEngine(store, {
      projectRoot: p.rootPath,
      agentId: 'codex',
    });
    const result = await ambiguous.recordFileWrite('src/ambiguous.ts');
    expect(result.recorded).toBe(false);
    const explicit = new TaskAutoEvidenceEngine(store, {
      projectRoot: p.rootPath,
      agentId: 'codex',
      targetTaskId: first.id,
    });
    const explicitResult = await explicit.recordFileWrite('src/explicit.ts');
    expect(explicitResult.recorded).toBe(true);
    expect(store.getTask(first.id)?.filesTouched).toContain('src/explicit.ts');
  });

  it('never automatically completes the Task', async () => {
    const p = project();
    const { store, task } = await claimedTask(p);
    const engine = new TaskAutoEvidenceEngine(store, {
      projectRoot: p.rootPath,
      agentId: 'codex',
    });
    await engine.recordCommand('npm test', 0);
    await engine.recordCommand('npm run typecheck', 0);
    expect(store.getTask(task.id)?.status).toBe('active');
  });
});
