import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { handleCursorHookInput } from '../../src/session/cursor/runtime.js';

import { handleCopilotHookInput } from '../../src/session/copilot/runtime.js';

import { handleGrokHookInput } from '../../src/session/grok/runtime.js';

describe('Cursor/Copilot/Grok hook runtime', () => {
  const roots: string[] = [];

  function createProject(name: string): string {
    const root = mkdtempSync(join(tmpdir(), `toolnet-${name}-runtime-`));

    roots.push(root);

    mkdirSync(join(root, '.toolnet'), {
      recursive: true,
    });

    writeFileSync(
      join(root, '.toolnet', 'project.json'),
      JSON.stringify(
        {
          version: 1,
          id: `${name}-runtime-test`,
          name: `${name}-runtime-test`,
          remote: `${name}-runtime-test`,
          rootPath: root,
          createdAt: '2026-08-24T00:00:00.000Z',
          updatedAt: '2026-08-24T00:00:00.000Z',
          graphVersion: 0,
          memoryVersion: 0,
        },
        null,
        2
      )
    );

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

  it('captures Cursor lifecycle locally and flushes only on stop', async () => {
    const root = createProject('cursor');
    let flushCalls = 0;

    const dependencies = {
      flushSession: async () => {
        flushCalls += 1;
      },
    };

    await handleCursorHookInput(
      {
        session_id: 'cursor-1',
      },
      dependencies,
      {
        TOOLNET_HOOK_EVENT: 'sessionStart',
        CURSOR_PROJECT_DIR: root,
      }
    );

    await handleCursorHookInput(
      {
        prompt: 'Implement hooks',
      },
      dependencies,
      {
        TOOLNET_HOOK_EVENT: 'beforeSubmitPrompt',
        TOOLNET_CURSOR_SESSION_ID: 'cursor-1',
        CURSOR_PROJECT_DIR: root,
      }
    );

    await handleCursorHookInput(
      {
        tool_name: 'write',
        tool_input: {
          path: join(root, 'src', 'a.ts'),
        },
        tool_response: {
          ok: true,
        },
      },
      dependencies,
      {
        TOOLNET_HOOK_EVENT: 'postToolUse',
        TOOLNET_CURSOR_SESSION_ID: 'cursor-1',
        CURSOR_PROJECT_DIR: root,
      }
    );

    expect(flushCalls).toBe(0);

    const eventsFile = join(root, '.toolnet', 'runtime', 'sources', 'cursor', 'cursor-1', 'events.jsonl');

    expect(existsSync(eventsFile)).toBe(true);

    const beforeStop = readFileSync(eventsFile, 'utf8');

    expect(beforeStop).toContain('"type":"session_start"');
    expect(beforeStop).toContain('"type":"user_prompt"');
    expect(beforeStop).toContain('"type":"file_write"');

    const stop = await handleCursorHookInput(
      {
        status: 'completed',
      },
      dependencies,
      {
        TOOLNET_HOOK_EVENT: 'stop',
        TOOLNET_CURSOR_SESSION_ID: 'cursor-1',
        CURSOR_PROJECT_DIR: root,
      }
    );

    expect(stop.flushed).toBe(true);
    expect(flushCalls).toBe(1);
  });

  it('captures Copilot camelCase payload and keeps WAL on failed flush', async () => {
    const root = createProject('copilot');

    await handleCopilotHookInput(
      {
        sessionId: 'copilot-1',
        cwd: root,
        prompt: 'Fix issue',
      },
      {},
      {
        TOOLNET_HOOK_EVENT: 'userPromptSubmitted',
      }
    );

    const stop = await handleCopilotHookInput(
      {
        sessionId: 'copilot-1',
        cwd: root,
        stopReason: 'end_turn',
      },
      {
        flushSession: async () => {
          throw new Error('remote unavailable');
        },
      },
      {
        TOOLNET_HOOK_EVENT: 'agentStop',
      }
    );

    expect(stop.active).toBe(true);
    expect(stop.flushed).toBe(false);
    expect(stop.error).toContain('remote unavailable');

    const eventsFile = join(root, '.toolnet', 'runtime', 'sources', 'copilot', 'copilot-1', 'events.jsonl');

    expect(existsSync(eventsFile)).toBe(true);

    const content = readFileSync(eventsFile, 'utf8');

    expect(content).toContain('"type":"user_prompt"');
    expect(content).toContain('"type":"session_idle"');
  });

  it('captures Grok native tool event and does nothing outside ToolNet projects', async () => {
    const root = createProject('grok');

    const tool = await handleGrokHookInput({
      hookEventName: 'post_tool_use',
      sessionId: 'grok-1',
      cwd: root,
      toolName: 'run_terminal_command',
      toolInput: {
        command: 'npm test',
      },
    });

    expect(tool.active).toBe(true);
    expect(tool.captured).toBe(1);

    const eventsFile = join(root, '.toolnet', 'runtime', 'sources', 'grok', 'grok-1', 'events.jsonl');

    expect(readFileSync(eventsFile, 'utf8')).toContain('"type":"command"');

    const outside = mkdtempSync(join(tmpdir(), 'toolnet-grok-outside-'));

    roots.push(outside);

    const inactive = await handleGrokHookInput({
      hookEventName: 'session_start',
      sessionId: 'grok-outside',
      cwd: outside,
    });

    expect(inactive).toEqual({
      active: false,
      captured: 0,
      flushed: false,
    });

    expect(existsSync(join(outside, '.toolnet'))).toBe(false);
  });
});
