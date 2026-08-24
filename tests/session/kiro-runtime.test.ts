import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { handleKiroHookInput } from '../../src/session/kiro/runtime.js';

describe('Kiro hook runtime', () => {
  const roots: string[] = [];

  function createProject(): string {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-kiro-runtime-'));

    roots.push(root);

    mkdirSync(join(root, '.toolnet'), {
      recursive: true,
    });

    writeFileSync(
      join(root, '.toolnet', 'project.json'),
      JSON.stringify(
        {
          version: 1,

          id: 'kiro-runtime-test',

          name: 'kiro-runtime-test',

          remote: 'kiro-runtime-test',

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

  it('captures Kiro lifecycle events into local WAL before remote flush', async () => {
    const root = createProject();

    let flushCalls = 0;

    const flushSession = async () => {
      flushCalls += 1;
    };

    const start = await handleKiroHookInput(
      {
        hook_event_name: 'SessionStart',

        cwd: root,

        session_id: 'kiro-session-1',
      },
      {
        flushSession,
      }
    );

    const prompt = await handleKiroHookInput(
      {
        hook_event_name: 'UserPromptSubmit',

        cwd: root,

        session_id: 'kiro-session-1',

        prompt: 'Implement Phase 03',
      },
      {
        flushSession,
      }
    );

    const tool = await handleKiroHookInput(
      {
        hook_event_name: 'PostToolUse',

        cwd: root,

        session_id: 'kiro-session-1',

        tool_name: 'fs_write',

        tool_input: {
          path: join(root, 'src', 'index.ts'),
        },

        tool_response: {
          success: true,
        },
      },
      {
        flushSession,
      }
    );

    expect(start.active).toBe(true);

    expect(prompt.active).toBe(true);

    expect(tool.active).toBe(true);

    expect(flushCalls).toBe(0);

    const eventsFile = join(root, '.toolnet', 'sessions', 'kiro', 'kiro-session-1', 'events.jsonl');

    expect(existsSync(eventsFile)).toBe(true);

    const beforeStop = readFileSync(eventsFile, 'utf8');

    expect(beforeStop).toContain('"type":"session_start"');

    expect(beforeStop).toContain('"type":"user_prompt"');

    expect(beforeStop).toContain('"type":"file_write"');

    const stop = await handleKiroHookInput(
      {
        hook_event_name: 'Stop',

        cwd: root,

        session_id: 'kiro-session-1',

        assistant_response: 'Phase 03 complete.',
      },
      {
        flushSession,
      }
    );

    expect(stop.flushed).toBe(true);

    expect(flushCalls).toBe(1);

    const afterStop = readFileSync(eventsFile, 'utf8');

    expect(afterStop).toContain('"type":"assistant_message"');

    expect(afterStop).toContain('"type":"session_idle"');
  });

  it('keeps local WAL when final remote flush fails', async () => {
    const root = createProject();

    const result = await handleKiroHookInput(
      {
        hook_event_name: 'Stop',

        cwd: root,

        session_id: 'kiro-session-failed-flush',

        assistant_response: 'Local state must survive.',
      },
      {
        flushSession: async () => {
          throw new Error('remote unavailable');
        },
      }
    );

    expect(result.active).toBe(true);

    expect(result.flushed).toBe(false);

    expect(result.error).toContain('remote unavailable');

    const eventsFile = join(
      root,
      '.toolnet',
      'sessions',
      'kiro',
      'kiro-session-failed-flush',
      'events.jsonl'
    );

    expect(existsSync(eventsFile)).toBe(true);

    const content = readFileSync(eventsFile, 'utf8');

    expect(content).toContain('Local state must survive.');
  });

  it('does nothing outside an initialized ToolNet project', async () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-kiro-no-project-'));

    roots.push(root);

    const result = await handleKiroHookInput({
      hook_event_name: 'SessionStart',

      cwd: root,

      session_id: 'kiro-session-1',
    });

    expect(result).toEqual({
      active: false,

      captured: 0,

      flushed: false,
    });

    expect(existsSync(join(root, '.toolnet'))).toBe(false);
  });
});
