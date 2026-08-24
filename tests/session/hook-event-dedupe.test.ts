import { mkdtempSync, rmSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import { claimHookEvent } from '../../src/session/integration-scope/index.js';

const roots: string[] = [];

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'toolnet-hook-dedupe-test-'));
  roots.push(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, {
      recursive: true,
      force: true,
    });
  }
});

describe('cross-process hook event dedupe foundation', () => {
  test('claims an identical native event only once inside TTL', () => {
    const directory = tempRoot();
    const input = {
      sessionId: 'session-a',
      toolUseId: 'tool-1',
      toolName: 'bash',
      toolArgs: {
        command: 'npm test',
      },
    };

    const first = claimHookEvent({
      agent: 'copilot',
      event: 'preToolUse',
      input,
      directory,
      nowMs: 1_000,
      ttlMs: 10_000,
    });

    const second = claimHookEvent({
      agent: 'copilot',
      event: 'preToolUse',
      input,
      directory,
      nowMs: 1_001,
      ttlMs: 10_000,
    });

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.key).toBe(first.key);
  });

  test('does not collide across sessions or agents', () => {
    const directory = tempRoot();

    const a = claimHookEvent({
      agent: 'cursor',
      event: 'postToolUse',
      input: {
        session_id: 'session-a',
        tool_use_id: 'tool-1',
      },
      directory,
      nowMs: 1_000,
    });

    const b = claimHookEvent({
      agent: 'cursor',
      event: 'postToolUse',
      input: {
        session_id: 'session-b',
        tool_use_id: 'tool-1',
      },
      directory,
      nowMs: 1_000,
    });

    const c = claimHookEvent({
      agent: 'grok',
      event: 'postToolUse',
      input: {
        session_id: 'session-a',
        tool_use_id: 'tool-1',
      },
      directory,
      nowMs: 1_000,
    });

    expect(a.duplicate).toBe(false);
    expect(b.duplicate).toBe(false);
    expect(c.duplicate).toBe(false);
  });

  test('uses canonical full payload when native event id is unavailable', () => {
    const directory = tempRoot();

    const first = claimHookEvent({
      agent: 'cursor',
      event: 'sessionStart',
      input: {
        cwd: '/project',
        session_id: 'session-a',
        metadata: {
          b: 2,
          a: 1,
        },
      },
      directory,
      nowMs: 1_000,
    });

    const second = claimHookEvent({
      agent: 'cursor',
      event: 'sessionStart',
      input: {
        metadata: {
          a: 1,
          b: 2,
        },
        session_id: 'session-a',
        cwd: '/project',
      },
      directory,
      nowMs: 1_001,
    });

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.key).toBe(first.key);
  });

  test('prompt identity remains stable when transformed prompt differs between hook sources', () => {
    const directory = tempRoot();

    const first = claimHookEvent({
      agent: 'copilot',
      event: 'userPromptTransformed',
      input: {
        sessionId: 'session-prompt',
        prompt: 'tiếp tục',
        transformedPrompt: 'tiếp tục',
      },
      directory,
      nowMs: 1_000,
    });

    const second = claimHookEvent({
      agent: 'copilot',
      event: 'userPromptTransformed',
      input: {
        sessionId: 'session-prompt',
        prompt: 'tiếp tục',
        transformedPrompt: 'tiếp tục\\n\\ncontext added by another hook',
      },
      directory,
      nowMs: 1_001,
    });

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.key).toBe(first.key);
  });

  test('same prompt with different native timestamps is treated as a new occurrence', () => {
    const directory = tempRoot();

    const first = claimHookEvent({
      agent: 'grok',
      event: 'UserPromptSubmit',
      input: {
        sessionId: 'session-repeat',
        prompt: 'tiếp tục',
        timestamp: '2026-08-24T07:00:00.000Z',
      },
      directory,
      nowMs: 1_000,
    });

    const second = claimHookEvent({
      agent: 'grok',
      event: 'UserPromptSubmit',
      input: {
        sessionId: 'session-repeat',
        prompt: 'tiếp tục',
        timestamp: '2026-08-24T07:00:01.000Z',
      },
      directory,
      nowMs: 1_001,
    });

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(false);
    expect(second.key).not.toBe(first.key);
  });

  test('expired marker can be reclaimed', () => {
    const directory = tempRoot();
    const input = {
      sessionId: 'session-a',
      toolUseId: 'tool-expired',
    };

    const first = claimHookEvent({
      agent: 'copilot',
      event: 'postToolUse',
      input,
      directory,
      nowMs: 1_000,
      ttlMs: 100,
    });

    const second = claimHookEvent({
      agent: 'copilot',
      event: 'postToolUse',
      input,
      directory,
      nowMs: 1_200,
      ttlMs: 100,
    });

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(false);
  });
});
