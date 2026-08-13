import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import {
  prepareMemoryConversation,
  readMemoryConversationState,
} from '../../src/work-continuity/memory-conversation.js';

function createProject() {
  const root = mkdtempSync(join(tmpdir(), 'toolnet-conversation-'));

  mkdirSync(join(root, '.toolnet', 'context'), {
    recursive: true,
  });

  const project = {
    id: 'conversation-project',

    name: 'demo',

    rootPath: root,

    remote: null,
  } as any;

  writeFileSync(
    join(root, '.toolnet', 'context', 'session-origin.json'),
    JSON.stringify({
      version: 1,

      projectId: 'conversation-project',

      agent: 'agy',

      nativeSessionId: 'agy-session',

      updatedAt: '2026-08-13T01:00:00Z',

      currentTask: 'Implement Google Login callback',

      currentPhase: 'Authentication',

      lastTouchedFile: 'src/auth/Auth.tsx',

      latestNextAction: 'Finish callback handling and run auth tests',

      latestBlocker: 'No blocker',

      latestDecision: 'Use the existing OAuth callback route',
    })
  );

  return {
    root,

    project,
  };
}

describe('Memory Agent AI-to-AI conversation', () => {
  test('reuses compact memory focus for ambiguous follow-up', () => {
    const { root, project } = createProject();

    try {
      const first = prepareMemoryConversation(
        project,
        'Tiếp tục task trước, đang làm gì và ở file nào?',
        {
          now: Date.parse('2026-08-13T01:00:00Z'),
        }
      );

      expect(first.usedPriorFocus).toBe(false);

      expect(first.focusCount).toBeGreaterThan(0);

      const second = prepareMemoryConversation(project, 'Tại sao?', {
        now: Date.parse('2026-08-13T01:01:00Z'),
      });

      expect(second.usedPriorFocus).toBe(true);

      expect(second.question).toContain('Previous ToolNet Memory conversation focus');

      expect(second.question).toContain('Google Login');

      expect(second.question).toContain('Auth.tsx');
    } finally {
      rmSync(root, {
        recursive: true,

        force: true,
      });
    }
  });

  test('persists facts and intent, never raw Q/A transcript', () => {
    const { root, project } = createProject();

    try {
      const rawQuestion = 'Tiếp tục task bí mật 12345';

      prepareMemoryConversation(project, rawQuestion, {
        now: Date.parse('2026-08-13T01:00:00Z'),
      });

      const state = readMemoryConversationState(project, {
        now: Date.parse('2026-08-13T01:01:00Z'),
      });

      expect(state?.schema).toBe('toolnet.memory-conversation.v1');

      expect(state?.focus.length).toBeGreaterThan(0);

      const file = readFileSync(
        join(root, '.toolnet', 'context', 'memory-agent-conversation.json'),
        'utf8'
      );

      expect(file).not.toContain(rawQuestion);

      expect(file).not.toContain('"question"');

      expect(file).not.toContain('"answer"');

      expect(file).not.toContain('"messages"');

      expect(file).not.toContain('"transcript"');
    } finally {
      rmSync(root, {
        recursive: true,

        force: true,
      });
    }
  });

  test('does not reuse stale conversation focus', () => {
    const { root, project } = createProject();

    try {
      prepareMemoryConversation(project, 'Tiếp tục task trước', {
        now: Date.parse('2026-08-13T01:00:00Z'),
      });

      const result = prepareMemoryConversation(project, 'Tại sao?', {
        now: Date.parse('2026-08-14T01:00:00Z'),

        maxAgeMs: 60 * 60 * 1000,
      });

      expect(result.usedPriorFocus).toBe(false);

      expect(result.question).toBe('Tại sao?');
    } finally {
      rmSync(root, {
        recursive: true,

        force: true,
      });
    }
  });
});
