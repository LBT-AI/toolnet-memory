import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { answerMemoryQuestion } from '../../src/work-continuity/memory-query.js';

describe('Memory Agent context', () => {
  test('local fallback remains concise and useful', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-agent-'));

    try {
      mkdirSync(join(root, '.toolnet', 'context'), {
        recursive: true,
      });

      mkdirSync(join(root, '.toolnet', 'work'), {
        recursive: true,
      });

      const project = {
        id: 'agent-test',

        name: 'demo',

        rootPath: root,

        remote: null,
      } as any;

      writeFileSync(
        join(root, '.toolnet', 'context', 'session-origin.json'),
        JSON.stringify(
          {
            version: 1,

            projectId: 'agent-test',

            agent: 'agy',

            nativeSessionId: 'agy-99',

            updatedAt: '2026-08-11T06:00:00Z',

            currentTask: 'TODO 3 - Finish provider wizard',

            lastTouchedFile: 'src/production/setup.ts',

            latestNextAction: 'Run typecheck and tests',
          },
          null,
          2
        )
      );

      const result = answerMemoryQuestion(project, 'agent trước đang làm gì và dừng ở đâu?');

      expect(result.answer).toContain('TODO 3');

      expect(result.answer).toContain('src/production/setup.ts');

      expect(result.answer).toContain('Run typecheck and tests');

      expect(result.answer.length).toBeLessThan(600);
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
