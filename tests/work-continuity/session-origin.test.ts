import { mkdtempSync, rmSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import {
  formatSessionOrigin,
  readSessionOrigin,
  writeSessionOrigin,
} from '../../src/work-continuity/session-origin.js';

describe('Session origin handoff', () => {
  test('remembers exact previous agent, task and last file', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-origin-'));

    try {
      const project = {
        id: 'p-origin',
        name: 'demo',
        rootPath: root,
        remote: null,
      } as any;

      const observations = [
        {
          version: 1,
          id: 'o1',
          projectId: 'p-origin',
          kind: 'file',
          key: 'src/setup.ts',
          text: 'src/setup.ts',
          confidence: 1,
          occurredAt: '2026-08-11T03:00:00.000Z',
          sequence: 1,
          agent: 'codex',
          nativeSessionId: 'thread-123',
          sessionKey: 'codex:thread-123',
          eventId: 'e1',
        },
        {
          version: 1,
          id: 'o2',
          projectId: 'p-origin',
          kind: 'next_action',
          key: 'next',
          text: 'Run final validation',
          confidence: 1,
          occurredAt: '2026-08-11T03:01:00.000Z',
          sequence: 2,
          agent: 'codex',
          nativeSessionId: 'thread-123',
          sessionKey: 'codex:thread-123',
          eventId: 'e2',
        },
      ] as any;

      const workState = {
        version: 1,
        projectId: 'p-origin',
        projectName: 'demo',
        phases: [],
        tasks: [],
        decisions: [],
        blockers: [],
        warnings: [],
        nextActions: ['Run final validation'],
        filesTouched: ['src/setup.ts'],
        tests: [],
        currentTask: {
          id: 'task-3',
          title: 'TODO 3 - Final validation',
          status: 'in_progress',
          confidence: 1,
          updatedAt: '2026-08-11T03:01:00.000Z',
          updatedBy: {
            agent: 'codex',
            nativeSessionId: 'thread-123',
            eventId: 'e2',
          },
        },
        progress: {
          phasesTotal: 0,
          phasesCompleted: 0,
          tasksTotal: 3,
          tasksCompleted: 2,
          blocked: 0,
        },
        lastSession: {
          agent: 'codex',
          nativeSessionId: 'thread-123',
          sessionKey: 'codex:thread-123',
          updatedAt: '2026-08-11T03:01:00.000Z',
        },
        updatedAt: '2026-08-11T03:01:00.000Z',
      } as any;

      writeSessionOrigin(project, {
        agent: 'codex',

        nativeSessionId: 'thread-123',

        observations,

        workState,
      });

      const origin = readSessionOrigin(project);

      expect(origin?.agent).toBe('codex');

      expect(origin?.nativeSessionId).toBe('thread-123');

      expect(origin?.currentTask).toContain('TODO 3');

      expect(origin?.lastTouchedFile).toBe('src/setup.ts');

      const text = formatSessionOrigin(project);

      expect(text).toContain('Previous session');

      expect(text).toContain('Agent: codex');

      expect(text).toContain('Last touched file: src/setup.ts');

      expect(text).toContain('Run final validation');
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
