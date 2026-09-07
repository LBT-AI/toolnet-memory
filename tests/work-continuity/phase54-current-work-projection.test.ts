import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProjectManifest } from '../../src/core/types.js';
import { TaskStore } from '../../src/tasks/store.js';
import {
  buildCurrentWorkProjection,
  renderCurrentWorkProjection,
  writeCurrentWorkProjectionToCurrent,
} from '../../src/work-continuity/current-work-projection.js';
import type { WorkState } from '../../src/work-continuity/types.js';
const roots: string[] = [];
function project(): ProjectManifest {
  const root = mkdtempSync(join(tmpdir(), 'toolnet-phase54-'));
  roots.push(root);
  mkdirSync(join(root, '.toolnet'), {
    recursive: true,
  });
  return {
    id: `phase54-${roots.length}`,
    name: 'phase54-test',
    rootPath: root,
    createdAt: '2026-09-07T00:00:00.000Z',
    updatedAt: '2026-09-07T00:00:00.000Z',
    graphVersion: 1,
    memoryVersion: 1,
  };
}
function staleFallback(manifest: ProjectManifest, title = 'Old stale session task'): WorkState {
  return {
    version: 1,
    projectId: manifest.id,
    projectName: manifest.name,
    currentRequest: 'Old request from session history',
    phases: [],
    tasks: [
      {
        id: 'legacy-task',
        title,
        status: 'in_progress',
        confidence: 0.55,
        updatedAt: '2026-08-01T00:00:00.000Z',
        updatedBy: {
          agent: 'opencode',
          nativeSessionId: 'legacy-session',
          eventId: 'legacy-event',
        },
      },
    ],
    currentTask: {
      id: 'legacy-task',
      title,
      status: 'in_progress',
      confidence: 0.55,
      updatedAt: '2026-08-01T00:00:00.000Z',
      updatedBy: {
        agent: 'opencode',
        nativeSessionId: 'legacy-session',
        eventId: 'legacy-event',
      },
    },
    decisions: [],
    blockers: ['Old blocker'],
    warnings: [],
    nextActions: ['Old next action'],
    filesTouched: ['old-file.ts'],
    activeFiles: ['old-file.ts'],
    tests: [],
    checks: [],
    progress: {
      phasesTotal: 0,
      phasesCompleted: 0,
      tasksTotal: 1,
      tasksCompleted: 0,
      blocked: 0,
    },
    lastSession: {
      agent: 'opencode',
      nativeSessionId: 'legacy-session',
      sessionKey: 'legacy-key',
      updatedAt: '2026-08-01T00:00:00.000Z',
    },
    updatedAt: '2026-08-01T00:00:00.000Z',
  };
}
afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop();
    if (!root) {
      continue;
    }
    rmSync(root, {
      recursive: true,
      force: true,
    });
  }
});
describe('Phase 54 Current Work Projection v2', () => {
  it('uses Persistent Tasks instead of stale session task history', async () => {
    const manifest = project();
    const store = new TaskStore(manifest);
    const old = await store.createTask({
      id: 'old-completed',
      kind: 'task',
      title: 'Old completed production task',
      priority: 'normal',
    });
    await store.setTaskStatus(old.id, 'completed');
    const dependency = await store.createTask({
      id: 'dependency',
      kind: 'task',
      title: 'Provision production API key',
      priority: 'normal',
      order: 9,
    });
    const current = await store.createTask({
      id: 'current-task',
      kind: 'task',
      title: 'Verify production image indexing',
      priority: 'high',
      order: 1,
    });
    await store.setTaskStatus(current.id, 'active');
    await store.applyStateOperation({
      type: 'task.next-action.set',
      taskId: current.id,
      nextAction: 'Run production crawler verification',
    });
    await store.applyStateOperation({
      type: 'task.file.touched',
      taskId: current.id,
      filePath: 'src/seo/image-schema.ts',
    });
    await store.applyStateOperation({
      type: 'task.test.recorded',
      taskId: current.id,
      test: {
        id: 'test-1',
        name: 'npm test',
        outcome: 'pass',
        detail: '1022 passed',
      },
    });
    await store.applyStateOperation({
      type: 'task.dependency.add',
      taskId: current.id,
      dependencyTaskId: dependency.id,
    });
    const completedChild = await store.createTask({
      id: 'completed-child',
      kind: 'subtask',
      parentTaskId: current.id,
      title: 'Add ImageObject schema',
      priority: 'normal',
      order: 0,
    });
    await store.setTaskStatus(completedChild.id, 'completed');
    const remainingChild = await store.createTask({
      id: 'remaining-child',
      kind: 'subtask',
      parentTaskId: current.id,
      title: 'Verify crawler response',
      priority: 'normal',
      order: 1,
    });
    await store.setTaskStatus(remainingChild.id, 'active');
    const projection = buildCurrentWorkProjection(manifest, {
      fallback: staleFallback(manifest),
      agentId: 'opencode',
      now: Date.parse('2026-09-08T00:00:00.000Z'),
    });
    expect(projection.source).toBe('persistent-task');
    expect(projection.task?.id).toBe(current.id);
    expect(projection.task?.title).toBe('Verify production image indexing');
    expect(projection.completed).toContain('Add ImageObject schema');
    expect(projection.remaining).toContain('Verify crawler response');
    expect(projection.blockers).toContain('Waiting on dependency: Provision production API key');
    expect(projection.filesTouched).toContain('src/seo/image-schema.ts');
    expect(projection.verification.join('\n')).toContain('[pass] npm test');
    expect(projection.nextAction).toBe('Run production crawler verification');
    const rendered = renderCurrentWorkProjection(projection);
    expect(rendered).not.toContain('Old stale session task');
    expect(rendered).not.toContain('Old blocker');
    expect(rendered).not.toContain('old-file.ts');
  });
  it('does not resurrect session history after every Persistent Task is terminal', async () => {
    const manifest = project();
    const store = new TaskStore(manifest);
    const task = await store.createTask({
      id: 'terminal-task',
      kind: 'task',
      title: 'Finished Task',
      priority: 'normal',
    });
    await store.setTaskStatus(task.id, 'completed');
    const projection = buildCurrentWorkProjection(manifest, {
      fallback: staleFallback(manifest),
      agentId: 'opencode',
    });
    expect(projection.source).toBe('empty');
    expect(projection.task).toBeUndefined();
    expect(projection.remaining).toEqual([]);
    expect(projection.blockers).toEqual([]);
  });
  it('uses compact session fallback only when Persistent Tasks do not exist', () => {
    const manifest = project();
    const projection = buildCurrentWorkProjection(manifest, {
      fallback: staleFallback(manifest, 'Session fallback task'),
    });
    expect(projection.source).toBe('session-fallback');
    expect(projection.task?.title).toBe('Session fallback task');
    /*
     * Historical completed work is deliberately not copied
     * into current context from fallback WorkState.
     */
    expect(projection.completed).toEqual([]);
    expect(projection.filesTouched).toContain('old-file.ts');
  });
  it('preserves manual current.md content while replacing legacy managed blocks', () => {
    const manifest = project();
    const file = join(manifest.rootPath, '.toolnet', 'current.md');
    writeFileSync(
      file,
      [
        '# Manual Project Context',
        '',
        '- Keep this line.',
        '',
        '<!-- TOOLNET:STABLE-WORK:BEGIN -->',
        'OLD STABLE STATE',
        '<!-- TOOLNET:STABLE-WORK:END -->',
        '',
        '<!-- TOOLNET:AUTO-CURRENT:BEGIN -->',
        'OLD AUTO STATE',
        '<!-- TOOLNET:AUTO-CURRENT:END -->',
        '',
      ].join('\n'),
      'utf8'
    );
    writeCurrentWorkProjectionToCurrent(manifest, {
      version: 2,
      projectId: manifest.id,
      source: 'persistent-task',
      task: {
        id: 'task-1',
        title: 'Current canonical task',
        status: 'active',
        priority: 'high',
      },
      completed: ['Step A'],
      remaining: ['Step B'],
      blockers: [],
      filesTouched: ['src/current.ts'],
      verification: [],
      artifacts: [],
      nextAction: 'Finish Step B',
      lastActivityAt: '2026-09-08T00:00:00.000Z',
      confidence: 0.98,
      generatedAt: '2026-09-08T00:00:00.000Z',
    });
    const content = readFileSync(file, 'utf8');
    expect(content).toContain('Keep this line.');
    expect(content).toContain('TOOLNET:CURRENT-WORK-V2:BEGIN');
    expect(content).toContain('Current canonical task');
    expect(content).not.toContain('OLD STABLE STATE');
    expect(content).not.toContain('OLD AUTO STATE');
    expect((content.match(/TOOLNET:CURRENT-WORK-V2:BEGIN/gu) ?? []).length).toBe(1);
  });
});
