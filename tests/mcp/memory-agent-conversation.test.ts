import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { memoryAgentAsk } from '../../src/mcp/tools/memory-agent-ask.js';

describe('MCP memory_agent_ask conversation', () => {
  test('supports sequential AI-to-AI turns without transcript replay', async () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-mcp-conversation-'));

    try {
      mkdirSync(join(root, '.toolnet', 'context'), {
        recursive: true,
      });

      writeFileSync(
        join(root, '.toolnet', 'context', 'session-origin.json'),
        JSON.stringify({
          version: 1,

          projectId: 'conversation-mcp',

          agent: 'agy',

          nativeSessionId: 'agy-1',

          updatedAt: new Date().toISOString(),

          currentTask: 'Finish Google Login',

          lastTouchedFile: 'src/auth/Auth.tsx',

          latestNextAction: 'Run auth tests',

          latestBlocker: 'No blocker',

          latestDecision: 'Keep the existing OAuth callback route',
        })
      );

      const ctx = {
        project: {
          id: 'conversation-mcp',

          name: 'demo',

          rootPath: root,

          remote: null,
        },
      } as any;

      const first = await memoryAgentAsk(ctx, {
        question: 'Tiếp tục task trước, đang làm gì?',

        mode: 'local',
      });

      expect(first.answer).toContain('Google Login');

      const second = await memoryAgentAsk(ctx, {
        question: 'Tại sao?',

        mode: 'local',
      });

      expect(second.answer).toContain('OAuth callback');

      const state = readFileSync(
        join(root, '.toolnet', 'context', 'memory-agent-conversation.json'),
        'utf8'
      );

      expect(state).toContain('toolnet.memory-conversation.v1');

      expect(state).not.toContain('"messages"');

      expect(state).not.toContain('"transcript"');
    } finally {
      rmSync(root, {
        recursive: true,

        force: true,
      });
    }
  });
});
