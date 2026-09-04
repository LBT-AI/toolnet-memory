import { mkdtempSync, rmSync } from 'node:fs';

import { join } from 'node:path';

import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import { ProjectManager } from '../../src/core/project-manager.js';

import { executeTaskCli } from '../../src/tasks/cli.js';

import {
  taskClaim,
  taskCreate,
  taskGet,
  taskHandoff,
  taskList,
  taskNext,
  taskProgress,
  taskStart,
} from '../../src/mcp/tools/task-tools.js';

const roots: string[] = [];

function initializedProject() {
  const root = mkdtempSync(join(tmpdir(), 'toolnet-task-cli-mcp-'));

  roots.push(root);

  const project = new ProjectManager().detect(root);

  return {
    root,
    project,
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, {
      recursive: true,

      force: true,
    });
  }
});

describe('Phase 36 Task CLI + MCP', () => {
  it('creates and lists Tasks through CLI', async () => {
    const { root } = initializedProject();

    const created = (await executeTaskCli([
      'create',
      '--project',
      root,
      '--kind',
      'goal',
      '--title',
      'CLI goal',
    ])) as {
      id: string;
      title: string;
    };
    expect(created.title).toBe('CLI goal');
    const listed = (await executeTaskCli(['list', '--project', root])) as Array<{
      id: string;
    }>;
    expect(listed.some((task) => task.id === created.id)).toBe(true);
  });
  it('exposes Task create/get/list through MCP functions', async () => {
    const { project } = initializedProject();
    const ctx = {
      project,
    };
    const created = await taskCreate(ctx, {
      kind: 'task',
      title: 'MCP task',
    });
    const fetched = await taskGet(ctx, {
      taskId: created.id,
    });
    const listed = await taskList(ctx, {});
    expect(fetched.id).toBe(created.id);
    expect(listed.some((task) => task.id === created.id)).toBe(true);
  });
  it('updates lifecycle and 5/10 progress through MCP', async () => {
    const { project } = initializedProject();
    const ctx = {
      project,
    };
    const created = await taskCreate(ctx, {
      kind: 'task',
      title: 'Progress task',
    });
    const active = await taskStart(ctx, {
      taskId: created.id,
    });
    const progress = await taskProgress(ctx, {
      taskId: created.id,
      completed: 5,
      total: 10,
      expectedRevision: active.revision,
    });
    expect(progress.progress).toEqual({
      completed: 5,
      total: 10,
    });
  });
  it('claims and explicitly hands Task to another agent through MCP', async () => {
    const { project } = initializedProject();
    const ctx = {
      project,
    };
    const created = await taskCreate(ctx, {
      kind: 'task',
      title: 'Agent handoff',
    });
    const claimed = await taskClaim(ctx, {
      taskId: created.id,
      agentId: 'opencode',
    });
    expect(claimed.lease.agentId).toBe('opencode');
    const handed = await taskHandoff(ctx, {
      taskId: created.id,
      fromAgentId: 'opencode',
      toAgentId: 'codex',
    });
    expect(handed.activeLease?.agentId).toBe('codex');
  });
  it('task_next can claim deterministic next child', async () => {
    const { project } = initializedProject();
    const ctx = {
      project,
    };
    const goal = await taskCreate(ctx, {
      kind: 'goal',
      title: 'Goal',
    });
    const first = await taskCreate(ctx, {
      kind: 'task',
      parentTaskId: goal.id,
      title: 'First child',
    });
    const next = (await taskNext(ctx, {
      rootTaskId: goal.id,
      agentId: 'codex',
      claim: true,
    })) as {
      task: {
        id: string;
      };
      lease: {
        agentId: string;
      };
    };
    expect(next.task.id).toBe(first.id);
    expect(next.lease.agentId).toBe('codex');
  });
});
