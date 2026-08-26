import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { memoryAgentAsk } from '../../src/mcp/tools/memory-agent-ask.js';

describe('memory_agent_ask structured routing', () => {
  test('AI mode bypasses LLM for takeover/handoff questions', async () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-structured-routing-'));

    try {
      mkdirSync(join(root, '.toolnet', 'work'), {
        recursive: true,
      });

      const project = {
        id: 'routing-test',

        name: 'demo',

        rootPath: root,
      } as any;

      const continuity = {
        schema: 'toolnet.handoff.v2',

        version: 2,

        project: {
          id: 'routing-test',
          name: 'demo',
        },

        source: {
          agent: 'codex',
          nativeSessionId: 'codex-1',
          sessionKey: 'codex:codex-1',
          sequence: 10,
          reason: 'checkpoint',
        },

        capturedAt: '2026-08-26T09:00:00.000Z',

        goal: 'Finish Task 10',

        request: 'Verify monitoring and report evidence',

        activity: 'Running final verification',

        current: {
          task: {
            id: 'task-10',
            title: 'Verify monitoring',
            status: 'in_progress',
          },

          file: 'scripts/monitor.py',
        },

        completed: {
          phases: [],
          tasks: ['Task 10.8', 'Task 10.9'],
        },

        remaining: {
          phases: [],
          tasks: ['Task 10.10'],
          todos: ['Run final verification'],
        },

        nextAction: 'Run final verification',

        blockers: [],

        decisions: [],

        files: {
          current: 'scripts/monitor.py',

          recent: ['scripts/monitor.py'],

          active: ['scripts/monitor.py'],

          modified: [],
          created: [],
          deleted: [],
        },

        tests: {
          status: 'passing',

          recent: ['monitor test passed'],

          checks: [
            {
              kind: 'test',
              status: 'passed',
              command: 'python3 scripts/monitor.py',
            },
          ],
        },

        evidence: {
          commands: ['python3 scripts/monitor.py'],

          references: ['https://example.com/report'],
        },

        attention: [],

        progress: {
          phasesTotal: 1,
          phasesCompleted: 0,
          tasksTotal: 3,
          tasksCompleted: 2,
          blocked: 0,
        },

        stateDigest: 'a'.repeat(64),
      };

      writeFileSync(
        join(root, '.toolnet', 'work', 'handoff-latest.json'),
        JSON.stringify(
          {
            continuity,
          },
          null,
          2
        )
      );

      const result = await memoryAgentAsk(
        {
          project,
        } as any,
        {
          mode: 'ai',

          detail: 'benchmark',

          question:
            'Summarize current state, evidence, files, tests, blockers and next actions for agent takeover.',
        }
      );

      expect(result.usedAi).toBe(false);

      expect('routing' in result ? result.routing : undefined).toBe('deterministic-handoff');

      expect(result.detail).toBe('benchmark');

      expect(result.answer).toContain('CURRENT_STATE');

      expect(result.answer).toContain('EVIDENCE');

      expect(result.answer).toContain('NEXT_ACTION');

      expect(result.answer).toContain('python3 scripts/monitor.py');

      expect(result.answer).toContain('https://example.com/report');
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test('simple memory question does not force structured takeover', async () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-simple-routing-'));

    try {
      mkdirSync(join(root, '.toolnet', 'work'), {
        recursive: true,
      });

      const project = {
        id: 'simple-routing',
        name: 'demo',
        rootPath: root,
      } as any;

      const result = await memoryAgentAsk(
        {
          project,
        } as any,
        {
          mode: 'local',

          question: 'next action?',
        }
      );

      expect('routing' in result && result.routing === 'deterministic-handoff').toBe(false);
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
