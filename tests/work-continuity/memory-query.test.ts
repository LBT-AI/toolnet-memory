import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import {
  answerMemoryQuestion,
  detectMemoryQueryIntent,
} from '../../src/work-continuity/memory-query.js';

describe('Memory query core', () => {
  test('answers previous work concisely', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-query-'));

    try {
      mkdirSync(join(root, '.toolnet', 'context'), {
        recursive: true,
      });

      mkdirSync(join(root, '.toolnet', 'work'), {
        recursive: true,
      });

      const project = {
        id: 'p-query',
        name: 'demo',
        rootPath: root,
        remote: null,
      } as any;

      writeFileSync(
        join(root, '.toolnet', 'context', 'session-origin.json'),
        JSON.stringify(
          {
            version: 1,
            projectId: 'p-query',
            agent: 'codex',
            nativeSessionId: 'thread-123',
            updatedAt: '2026-08-11T04:00:00Z',
            currentTask: 'TODO 3 - Final validation',
            lastTouchedFile: 'src/setup.ts',
            latestNextAction: 'Run npm test',
          },
          null,
          2
        )
      );

      writeFileSync(
        join(root, '.toolnet', 'work', 'current.json'),
        JSON.stringify(
          {
            version: 1,
            projectId: 'p-query',
            projectName: 'demo',

            phases: [],

            tasks: [
              {
                id: '1',
                title: 'TODO 1',
                status: 'completed',
                confidence: 1,
                updatedAt: '2026-08-11T03:00:00Z',
                updatedBy: {
                  agent: 'codex',
                  nativeSessionId: 'thread-123',
                  eventId: 'e1',
                },
              },

              {
                id: '3',
                title: 'TODO 3 - Final validation',
                status: 'in_progress',
                confidence: 1,
                updatedAt: '2026-08-11T04:00:00Z',
                updatedBy: {
                  agent: 'codex',
                  nativeSessionId: 'thread-123',
                  eventId: 'e3',
                },
              },
            ],

            decisions: [],
            blockers: [],
            warnings: [],

            nextActions: ['Run npm test'],

            filesTouched: ['src/setup.ts'],

            tests: [],

            currentTask: {
              id: '3',
              title: 'TODO 3 - Final validation',
              status: 'in_progress',
              confidence: 1,
              updatedAt: '2026-08-11T04:00:00Z',
              updatedBy: {
                agent: 'codex',
                nativeSessionId: 'thread-123',
                eventId: 'e3',
              },
            },

            progress: {
              phasesTotal: 0,
              phasesCompleted: 0,
              tasksTotal: 2,
              tasksCompleted: 1,
              blocked: 0,
            },

            updatedAt: '2026-08-11T04:00:00Z',
          },
          null,
          2
        )
      );

      const result = answerMemoryQuestion(project, 'agent trước đang làm gì và dừng ở đâu?');

      expect(result.answer).toContain('TODO 3');

      expect(result.answer).toContain('src/setup.ts');

      expect(result.answer).toContain('Run npm test');

      expect(result.answer.length).toBeLessThan(500);
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test('detects next action intent', () => {
    expect(detectMemoryQueryIntent('Tôi phải làm gì tiếp?')).toBe('next_action');
  });

  test('detects composite continuity question', () => {
    expect(detectMemoryQueryIntent('agent trước đang làm gì và dừng ở đâu?')).toBe('summary');
  });
});
