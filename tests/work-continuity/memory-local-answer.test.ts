import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { answerRetrievedMemoryQuestion } from '../../src/work-continuity/memory-local-answer.js';

describe('Canonical deterministic memory answer', () => {
  test('prefers canonical M2 handoff over stale session-origin', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-x1-canonical-'));

    try {
      mkdirSync(join(root, '.toolnet', 'work'), {
        recursive: true,
      });

      mkdirSync(join(root, '.toolnet', 'context'), {
        recursive: true,
      });

      const project = {
        id: 'x1-canonical',

        name: 'demo',

        rootPath: root,

        remote: null,
      } as any;

      /*
       * Deliberately stale competing state.
       */
      writeFileSync(
        join(root, '.toolnet', 'context', 'session-origin.json'),
        JSON.stringify(
          {
            version: 1,

            projectId: 'x1-canonical',

            agent: 'stale-agent',

            nativeSessionId: 'stale-session',

            updatedAt: '2026-01-01T00:00:00.000Z',

            currentTask: 'STALE TASK MUST NOT WIN',

            currentPhase: 'STALE PHASE',

            lastTouchedFile: 'src/stale/old.ts',

            latestNextAction: 'STALE NEXT ACTION',

            latestBlocker: 'STALE BLOCKER',
          },
          null,
          2
        )
      );

      /*
       * Canonical M2 state.
       */
      writeFileSync(
        join(root, '.toolnet', 'work', 'handoff-latest.json'),
        JSON.stringify(
          {
            continuity: {
              schema: 'toolnet.handoff.v2',

              version: 2,

              project: {
                id: 'x1-canonical',

                name: 'demo',
              },

              source: {
                agent: 'codex',

                nativeSessionId: 'codex-x1',

                sessionKey: 'codex:codex-x1',

                sequence: 50,

                reason: 'checkpoint',
              },

              capturedAt: '2026-08-13T05:00:00.000Z',

              current: {
                phase: {
                  id: 'x1',

                  title: 'Cross-Agent Continuity',

                  status: 'in_progress',
                },

                task: {
                  id: 'x1-task',

                  title: 'Implement canonical cross-agent recovery',

                  status: 'in_progress',
                },

                file: 'src/production/continuity-certify.ts',
              },

              completed: {
                phases: ['A3 Claude Code Adapter'],

                tasks: [],
              },

              remaining: {
                phases: ['X1'],

                tasks: ['Implement canonical cross-agent recovery'],

                todos: ['Run production continuity certification'],
              },

              nextAction: 'Run X1 certification and verify four-agent ring',

              blockers: [],

              decisions: ['Canonical handoff overrides stale session origin'],

              files: {
                current: 'src/production/continuity-certify.ts',

                recent: [],
              },

              tests: {
                status: 'passing',

                recent: [],
              },

              attention: [],

              progress: {
                phasesTotal: 1,

                phasesCompleted: 0,

                tasksTotal: 1,

                tasksCompleted: 0,

                blocked: 0,
              },

              stateDigest: 'a'.repeat(64),
            },
          },
          null,
          2
        )
      );

      const task = answerRetrievedMemoryQuestion(project, 'Task hiện tại đang làm là gì?');

      expect(task.source).toBe('handoff');

      expect(task.answer).toContain('Implement canonical cross-agent recovery');

      expect(task.answer).toContain('src/production/continuity-certify.ts');

      expect(task.answer).not.toContain('STALE TASK MUST NOT WIN');

      const todo = answerRetrievedMemoryQuestion(project, 'TODO còn lại là gì?');

      expect(todo.answer).toContain('Run production continuity certification');

      expect(todo.answer).not.toContain('STALE');

      const next = answerRetrievedMemoryQuestion(project, 'Tôi phải làm gì tiếp?');

      expect(next.answer).toContain('Run X1 certification and verify four-agent ring');

      expect(next.answer).not.toContain('STALE NEXT ACTION');
    } finally {
      rmSync(root, {
        recursive: true,

        force: true,
      });
    }
  });
});
