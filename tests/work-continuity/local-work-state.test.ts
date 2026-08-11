import { mkdtempSync, readFileSync, rmSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { applyObservationsToLocalWorkState } from '../../src/work-continuity/local-work-state.js';

import { writeStableWorkStateToCurrent } from '../../src/work-continuity/work-state-current.js';

function observation(overrides: Record<string, unknown>): any {
  return {
    version: 1,
    id: `obs-${Math.random()}`,
    projectId: 'p1',
    kind: 'task',
    key: 'task:1',
    text: 'TODO 1',
    status: 'pending',
    order: 1,
    confidence: 0.95,
    occurredAt: '2026-08-11T01:00:00.000Z',
    sequence: 1,
    agent: 'codex',
    nativeSessionId: 's1',
    sessionKey: 'codex:s1',
    eventId: 'e1',
    ...overrides,
  };
}

describe('Stable local WorkState', () => {
  test('keeps completed tasks sticky across later turns', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-state-'));

    try {
      const project = {
        id: 'p1',
        name: 'demo',
        rootPath: root,
        remote: null,
      } as any;

      const first = applyObservationsToLocalWorkState(project, [
        observation({
          key: 'task:1',
          order: 1,
          text: 'Setup provider registry',
          status: 'completed',
        }),

        observation({
          key: 'task:2',
          order: 2,
          text: 'Connect fallback wizard',
          status: 'in_progress',
        }),

        observation({
          kind: 'next_action',
          key: 'next:1',
          order: undefined,
          text: 'Finish TODO 2',
          status: undefined,
        }),
      ]);

      expect(first.tasks[0]?.status).toBe('completed');

      expect(first.tasks[1]?.status).toBe('in_progress');

      const second = applyObservationsToLocalWorkState(project, [
        observation({
          key: 'task:1',
          order: 1,
          text: 'TODO 1',
          status: 'pending',
          occurredAt: '2026-08-11T02:00:00.000Z',
        }),

        observation({
          key: 'task:2',
          order: 2,
          text: 'Connect fallback wizard',
          status: 'completed',
          occurredAt: '2026-08-11T02:01:00.000Z',
        }),

        observation({
          key: 'task:3',
          order: 3,
          text: 'Run final validation',
          status: 'in_progress',
          occurredAt: '2026-08-11T02:02:00.000Z',
        }),
      ]);

      expect(second.tasks[0]?.status).toBe('completed');

      expect(second.tasks[0]?.title).toBe('Setup provider registry');

      expect(second.tasks[1]?.status).toBe('completed');

      expect(second.tasks[2]?.status).toBe('in_progress');

      expect(second.currentTask?.title).toBe('Run final validation');

      expect(second.progress.tasksCompleted).toBe(2);

      writeStableWorkStateToCurrent(project, second);

      const current = readFileSync(join(root, '.toolnet', 'current.md'), 'utf8');

      expect(current).toContain('[x] Setup provider registry');

      expect(current).toContain('[x] Connect fallback wizard');

      expect(current).toContain('[~] Run final validation');
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
