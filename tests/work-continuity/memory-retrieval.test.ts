import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { retrieveMemoryContext } from '../../src/work-continuity/memory-retrieval.js';

describe('Intelligent memory retrieval', () => {
  test('ranks task/file/next action for resume questions', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-m3-'));

    try {
      mkdirSync(join(root, '.toolnet', 'context'), {
        recursive: true,
      });

      mkdirSync(join(root, '.toolnet', 'work'), {
        recursive: true,
      });

      const project = {
        id: 'm3-project',

        name: 'demo',

        rootPath: root,

        remote: null,
      } as any;

      writeFileSync(
        join(root, '.toolnet', 'context', 'session-origin.json'),
        JSON.stringify({
          version: 1,

          projectId: 'm3-project',

          agent: 'agy',

          nativeSessionId: 'agy-1',

          updatedAt: '2026-08-13T00:00:00Z',

          currentTask: 'M3 Intelligent Memory Retrieval',

          currentPhase: 'Memory Intelligence',

          lastTouchedFile: 'src/work-continuity/memory-retrieval.ts',

          latestNextAction: 'Run focused retrieval tests',

          latestBlocker: 'Need retrieval ranking validation',

          latestDecision: 'Do not dump full WorkState into AI context',
        })
      );

      writeFileSync(
        join(root, '.toolnet', 'work', 'current.json'),
        JSON.stringify({
          version: 1,

          projectId: 'm3-project',

          projectName: 'demo',

          phases: [],

          tasks: [],

          decisions: ['Do not dump full WorkState into AI context'],

          blockers: ['Need retrieval ranking validation'],

          warnings: [],

          nextActions: ['Run focused retrieval tests'],

          filesTouched: ['src/work-continuity/memory-retrieval.ts'],

          tests: ['M2 tests passed'],

          progress: {
            phasesTotal: 5,

            phasesCompleted: 2,

            tasksTotal: 5,

            tasksCompleted: 2,

            blocked: 0,
          },

          updatedAt: '2026-08-13T00:00:00Z',
        })
      );

      const result = retrieveMemoryContext(
        project,
        'Tiếp tục task đang dang dở, đang làm gì và file nào?'
      );

      expect(result.intent).toBe('current_task');

      expect(result.facts[0]?.kind).toBe('task');

      const text = JSON.stringify(result.context);

      expect(text).toContain('M3 Intelligent Memory Retrieval');

      expect(text).toContain('memory-retrieval.ts');

      expect(result.stats.selected).toBeLessThanOrEqual(12);

      expect(result.stats.chars).toBeLessThanOrEqual(3200);
    } finally {
      rmSync(root, {
        recursive: true,

        force: true,
      });
    }
  });

  test('uses canonical M2 handoff as highest-quality source', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-m3-handoff-'));

    try {
      mkdirSync(join(root, '.toolnet', 'work'), {
        recursive: true,
      });

      const project = {
        id: 'm3-handoff',

        name: 'demo',

        rootPath: root,

        remote: null,
      } as any;

      writeFileSync(
        join(root, '.toolnet', 'work', 'handoff-latest.json'),
        JSON.stringify({
          continuity: {
            schema: 'toolnet.handoff.v2',

            version: 2,

            project: {
              id: 'm3-handoff',

              name: 'demo',
            },

            source: {
              agent: 'codex',

              nativeSessionId: 'session-1',

              sessionKey: 'codex:session-1',

              sequence: 10,

              reason: 'checkpoint',
            },

            capturedAt: '2026-08-13T00:00:00Z',

            current: {
              task: {
                id: 'm3',

                title: 'Implement ranked retrieval',

                status: 'in_progress',
              },

              file: 'src/work-continuity/memory-retrieval.ts',
            },

            completed: {
              phases: [],

              tasks: ['M2 Handoff Schema'],
            },

            remaining: {
              phases: [],

              tasks: ['Implement ranked retrieval'],

              todos: ['Run full test suite'],
            },

            nextAction: 'Run full test suite',

            blockers: [],

            decisions: ['Use compact selected facts'],

            files: {
              current: 'src/work-continuity/memory-retrieval.ts',

              recent: [],
            },

            tests: {
              status: 'passing',

              recent: [],
            },

            attention: [],

            progress: {
              phasesTotal: 5,

              phasesCompleted: 2,

              tasksTotal: 5,

              tasksCompleted: 2,

              blocked: 0,
            },

            stateDigest: 'a'.repeat(64),
          },
        })
      );

      const result = retrieveMemoryContext(project, 'Tôi phải làm gì tiếp?');

      expect(result.intent).toBe('next_action');

      expect(result.facts[0]?.source).toBe('handoff');

      expect(result.facts[0]?.kind).toBe('next_action');

      expect(result.facts[0]?.value).toContain('Run full test suite');
    } finally {
      rmSync(root, {
        recursive: true,

        force: true,
      });
    }
  });

  test('does not return the full work state', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-m3-budget-'));

    try {
      mkdirSync(join(root, '.toolnet', 'work'), {
        recursive: true,
      });

      const project = {
        id: 'm3-budget',

        name: 'demo',

        rootPath: root,

        remote: null,
      } as any;

      writeFileSync(
        join(root, '.toolnet', 'work', 'current.json'),
        JSON.stringify({
          version: 1,

          projectId: 'm3-budget',

          projectName: 'demo',

          phases: [],

          tasks: Array.from(
            {
              length: 100,
            },
            (_, index) => ({
              id: String(index),

              title: `Task ${index} ${'x'.repeat(100)}`,

              status: 'pending',

              confidence: 1,

              updatedAt: '2026-08-13T00:00:00Z',

              updatedBy: {
                agent: 'codex',

                nativeSessionId: 's',

                eventId: `e-${index}`,
              },
            })
          ),

          decisions: [],

          blockers: [],

          warnings: [],

          nextActions: [],

          filesTouched: [],

          tests: [],

          progress: {
            phasesTotal: 0,

            phasesCompleted: 0,

            tasksTotal: 100,

            tasksCompleted: 0,

            blocked: 0,
          },

          updatedAt: '2026-08-13T00:00:00Z',
        })
      );

      const result = retrieveMemoryContext(project, 'status', {
        maxFacts: 8,

        maxChars: 1200,
      });

      expect(result.facts.length).toBeLessThanOrEqual(8);

      expect(result.stats.chars).toBeLessThanOrEqual(1200);

      expect(JSON.stringify(result.context).length).toBeLessThan(1800);
    } finally {
      rmSync(root, {
        recursive: true,

        force: true,
      });
    }
  });
});
