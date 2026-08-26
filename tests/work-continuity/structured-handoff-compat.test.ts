import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { loadLatestStructuredHandoff } from '../../src/work-continuity/structured-handoff.js';

describe('structured handoff backward compatibility', () => {
  test('reads legacy handoff v2 without evidence', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-legacy-handoff-'));

    try {
      const work = join(root, '.toolnet', 'work');

      mkdirSync(work, {
        recursive: true,
      });

      /*
       * Represents handoff.v2 written by ToolNet versions
       * before structured evidence was introduced.
       *
       * Intentionally missing:
       * - evidence
       * - tests.checks
       * - files.active/modified/created/deleted
       */
      const continuity = {
        schema: 'toolnet.handoff.v2',

        version: 2,

        project: {
          id: 'legacy-project',
          name: 'legacy-demo',
        },

        source: {
          agent: 'codex',
          nativeSessionId: 'legacy-session',
          sessionKey: 'codex:legacy-session',
          sequence: 12,
          reason: 'checkpoint',
        },

        capturedAt: '2026-08-20T08:00:00.000Z',

        goal: 'Continue legacy project',

        request: 'Finish existing task',

        activity: 'Working on legacy handoff',

        current: {
          task: {
            id: 'legacy-task',
            title: 'Legacy Task',
            status: 'in_progress',
          },

          file: 'src/legacy.ts',
        },

        completed: {
          phases: [],
          tasks: ['Previous Task'],
        },

        remaining: {
          phases: [],
          tasks: ['Legacy Task'],
          todos: ['Finish Legacy Task'],
        },

        nextAction: 'Finish Legacy Task',

        blockers: [],

        decisions: ['Keep backward compatibility'],

        files: {
          current: 'src/legacy.ts',

          recent: ['src/legacy.ts'],
        },

        tests: {
          status: 'passing',

          recent: ['legacy tests passed'],
        },

        attention: [],

        progress: {
          phasesTotal: 1,
          phasesCompleted: 0,
          tasksTotal: 2,
          tasksCompleted: 1,
          blocked: 0,
        },

        stateDigest: 'a'.repeat(64),
      };

      writeFileSync(
        join(work, 'handoff-latest.json'),
        JSON.stringify(
          {
            continuity,
          },
          null,
          2
        )
      );

      const project = {
        id: 'legacy-project',

        name: 'legacy-demo',

        rootPath: root,

        createdAt: '2026-08-01T00:00:00.000Z',

        updatedAt: '2026-08-20T08:00:00.000Z',

        graphVersion: 1,

        memoryVersion: 1,
      };

      const result = loadLatestStructuredHandoff(project, 'benchmark');

      expect(result).not.toBeNull();

      expect(result?.detail).toBe('benchmark');

      expect(result?.text).toContain('Legacy Task');

      expect(result?.text).toContain('src/legacy.ts');

      expect(result?.text).toContain('Finish Legacy Task');

      expect(result?.text).toContain('legacy tests passed');

      expect(result?.text).toContain('CURRENT_STATE');

      expect(result?.text).toContain('EVIDENCE');

      expect(result?.text).toContain('NEXT_ACTION');

      /*
       * Missing evidence in old files must simply mean
       * no command/reference evidence, not invalid handoff.
       */
      expect(
        result?.data.evidence.some(
          (value) => value.startsWith('Command:') || value.startsWith('Reference:')
        )
      ).toBe(false);
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test('new handoff evidence remains supported', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-new-handoff-'));

    try {
      const work = join(root, '.toolnet', 'work');

      mkdirSync(work, {
        recursive: true,
      });

      const continuity = {
        schema: 'toolnet.handoff.v2',

        version: 2,

        project: {
          id: 'new-project',
          name: 'new-demo',
        },

        source: {
          agent: 'agy',
          nativeSessionId: 'new-session',
          sessionKey: 'agy:new-session',
          sequence: 20,
          reason: 'checkpoint',
        },

        capturedAt: '2026-08-26T08:00:00.000Z',

        goal: 'Test new handoff',

        activity: 'Verify evidence',

        current: {
          task: {
            id: 'new-task',
            title: 'New Task',
            status: 'in_progress',
          },

          file: 'src/new.ts',
        },

        completed: {
          phases: [],
          tasks: [],
        },

        remaining: {
          phases: [],
          tasks: ['New Task'],
          todos: ['Complete New Task'],
        },

        nextAction: 'Complete New Task',

        blockers: [],

        decisions: [],

        files: {
          current: 'src/new.ts',
          recent: ['src/new.ts'],
        },

        tests: {
          status: 'passing',
          recent: ['new test passed'],
        },

        evidence: {
          commands: ['npm test'],

          references: ['https://example.com/report'],
        },

        attention: [],

        progress: {
          phasesTotal: 1,
          phasesCompleted: 0,
          tasksTotal: 1,
          tasksCompleted: 0,
          blocked: 0,
        },

        stateDigest: 'b'.repeat(64),
      };

      writeFileSync(
        join(work, 'handoff-latest.json'),
        JSON.stringify(
          {
            continuity,
          },
          null,
          2
        )
      );

      const project = {
        id: 'new-project',

        name: 'new-demo',

        rootPath: root,

        createdAt: '2026-08-01T00:00:00.000Z',

        updatedAt: '2026-08-26T08:00:00.000Z',

        graphVersion: 1,

        memoryVersion: 1,
      };

      const result = loadLatestStructuredHandoff(project, 'benchmark');

      expect(result?.text).toContain('Command: npm test');

      expect(result?.text).toContain('Reference: https://example.com/report');
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
