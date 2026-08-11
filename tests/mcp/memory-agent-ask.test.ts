import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { memoryAgentAsk } from '../../src/mcp/tools/memory-agent-ask.js';

describe('MCP memory_agent_ask', () => {
  test('answers continuity question in local mode without AI', async () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-mcp-agent-'));

    try {
      mkdirSync(join(root, '.toolnet', 'context'), {
        recursive: true,
      });

      mkdirSync(join(root, '.toolnet', 'work'), {
        recursive: true,
      });

      const project = {
        id: 'mcp-project',

        name: 'demo',

        rootPath: root,

        remote: null,
      } as any;

      writeFileSync(
        join(root, '.toolnet', 'context', 'session-origin.json'),
        JSON.stringify(
          {
            version: 1,

            projectId: 'mcp-project',

            agent: 'agy',

            nativeSessionId: 'agy-session-88',

            updatedAt: '2026-08-11T10:00:00.000Z',

            currentTask: 'TODO 3 - Finish MCP integration',

            lastTouchedFile: 'src/mcp/server.ts',

            latestNextAction: 'Run tests and verify MCP tool',
          },
          null,
          2
        )
      );

      const ctx = {
        project,
      } as any;

      const result = await memoryAgentAsk(ctx, {
        question: 'Agent trước đang làm gì và dừng ở đâu?',

        mode: 'local',
      });

      expect(result.mode).toBe('local');

      expect(result.usedAi).toBe(false);

      expect(result.answer).toContain('agy');

      expect(result.answer).toContain('TODO 3');

      expect(result.answer).toContain('src/mcp/server.ts');

      expect(result.answer).toContain('Run tests and verify MCP tool');

      expect(result.answer.length).toBeLessThan(800);
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
