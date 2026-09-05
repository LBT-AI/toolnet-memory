import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProjectManifest } from '../../src/core/types.js';
import { planCorrelatedNativeTaskMirrorsShadow } from '../../src/session/native-plan/correlated-shadow.js';
import type { NormalizedSessionEvent } from '../../src/session/types.js';
import { TaskStore } from '../../src/tasks/store.js';

const roots: string[] = [];

function project(): ProjectManifest {
  const rootPath = mkdtempSync(join(tmpdir(), 'toolnet-correlated-shadow-'));
  roots.push(rootPath);
  const now = new Date().toISOString();
  return {
    id: 'correlated-shadow-project',
    name: 'correlated-shadow-project',
    remote: 'correlated-shadow-project',
    rootPath,
    createdAt: now,
    updatedAt: now,
    graphVersion: 0,
    memoryVersion: 0,
  };
}

function event(projectId: string): NormalizedSessionEvent {
  return {
    version: 1,
    id: 'native-plan-event',
    sequence: 1,
    projectId,
    agent: 'codex',
    nativeSessionId: 'shadow-thread',
    sessionId: 'shadow-thread',
    type: 'tool_call',
    timestamp: '2026-09-05T06:00:00.000Z',
    sourceEventId: 'shadow-native-event',
    sourceSequence: 100,
    data: {
      type: 'response_item',
      payload: {
        type: 'function_call',
        name: 'update_plan',
        arguments: JSON.stringify({
          plan: [{ step: 'Implement correlated shadow', status: 'in_progress' }],
        }),
      },
    },
    provenance: {},
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('Phase 42C correlated shadow pipeline', () => {
  it('persists only source binding metadata and never mutates TaskStore', async () => {
    const p = project();
    const tasks = new TaskStore(p);
    const first = await planCorrelatedNativeTaskMirrorsShadow(p, tasks, [event(p.id)]);
    expect(first.plans).toHaveLength(1);
    expect(first.persistedSnapshots).toBe(1);
    expect(tasks.listTasks()).toEqual([]);

    const replay = await planCorrelatedNativeTaskMirrorsShadow(p, tasks, [event(p.id)]);
    expect(replay.replayedSnapshots).toBe(1);
    expect(tasks.listTasks()).toEqual([]);
  });
});
