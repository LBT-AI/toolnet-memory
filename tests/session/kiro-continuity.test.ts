import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  buildKiroPreToolGuard,
  buildKiroPromptContext,
  buildKiroStartupContext,
  isKiroResumePrompt,
} from '../../src/session/kiro/continuity.js';

describe('Kiro continuity and resume policy', () => {
  const roots: string[] = [];

  function createProject(): string {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-kiro-continuity-'));

    roots.push(root);

    mkdirSync(join(root, '.toolnet'), {
      recursive: true,
    });

    writeFileSync(
      join(root, '.toolnet', 'project.json'),
      JSON.stringify(
        {
          version: 1,

          id: 'kiro-continuity-test',

          name: 'kiro-continuity-test',

          remote: 'kiro-continuity-test',

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

    writeFileSync(
      join(root, '.toolnet', 'profile.md'),
      ['# Profile', '', 'ToolNet Memory project profile.'].join('\n')
    );

    writeFileSync(
      join(root, '.toolnet', 'current.md'),
      [
        '# Current Work',
        '',
        '- Current task: add Kiro continuity.',
        '- Next action: test Phase 04.',
      ].join('\n')
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

  it('recognizes English and Vietnamese resume requests', () => {
    const positives = [
      'continue the previous task',
      'resume the last session',
      'pick up where we left off',
      'tiếp tục task lúc nãy',
      'làm tiếp phần đang dở',
      'dừng ở đâu rồi?',
    ];

    for (const prompt of positives) {
      expect(isKiroResumePrompt(prompt), prompt).toBe(true);
    }

    expect(isKiroResumePrompt('Explain TypeScript generics')).toBe(false);

    expect(isKiroResumePrompt('Create a new file from scratch')).toBe(false);
  });

  it('builds compact local startup context with ToolNet memory guidance', () => {
    const root = createProject();

    const context = buildKiroStartupContext(root);

    expect(context).toContain('[TOOLNET PROJECT CONTEXT]');

    expect(context).toContain('kiro-continuity-test');

    expect(context).toContain('add Kiro continuity');

    expect(context).toContain('memory_agent_ask');

    expect(context).toContain('NEVER reconstruct prior work');

    expect(context.length).toBeLessThanOrEqual(6550);
  });

  it('injects refreshed ToolNet continuity only for resume prompts', () => {
    const root = createProject();

    const resume = buildKiroPromptContext({
      hook_event_name: 'UserPromptSubmit',

      cwd: root,

      session_id: 'kiro-session-1',

      prompt: 'làm tiếp phần đang dở',
    });

    expect(resume).toContain('[TOOLNET RESUME REQUEST]');

    expect(resume).toContain('memory_agent_ask');

    expect(resume).toContain('mode="local"');

    expect(resume).toContain('add Kiro continuity');

    const normal = buildKiroPromptContext({
      hook_event_name: 'UserPromptSubmit',

      cwd: root,

      session_id: 'kiro-session-1',

      prompt: 'Explain this function',
    });

    expect(normal).toBe('');
  });

  it('blocks direct reads of raw ToolNet session history', () => {
    const guard = buildKiroPreToolGuard({
      hook_event_name: 'PreToolUse',

      tool_name: 'fs_read',

      tool_input: {
        path: '/tmp/project/.toolnet/sessions/opencode/abc/events.jsonl',
      },
    });

    expect(guard.blocked).toBe(true);

    expect(guard.reason).toContain('memory_agent_ask');
  });

  it('blocks shell commands that try to replay raw session history', () => {
    const guard = buildKiroPreToolGuard({
      hook_event_name: 'PreToolUse',

      tool_name: 'execute_bash',

      tool_input: {
        command: 'tail -100 .toolnet/sessions/kiro/session-1/events.jsonl',
      },
    });

    expect(guard.blocked).toBe(true);
  });

  it('blocks legacy Antigravity raw transcript recovery', () => {
    const guard = buildKiroPreToolGuard({
      hook_event_name: 'PreToolUse',

      tool_name: 'fs_read',

      tool_input: {
        path: '/home/user/.gemini/antigravity-cli/brain/abc/.system_generated/logs/transcript.jsonl',
      },
    });

    expect(guard.blocked).toBe(true);
  });

  it('allows normal repository files, including unrelated state.json', () => {
    const normalSource = buildKiroPreToolGuard({
      hook_event_name: 'PreToolUse',

      tool_name: 'fs_read',

      tool_input: {
        path: '/tmp/project/src/state.json',
      },
    });

    expect(normalSource.blocked).toBe(false);

    const toolnetCurrent = buildKiroPreToolGuard({
      hook_event_name: 'PreToolUse',

      tool_name: 'fs_read',

      tool_input: {
        path: '/tmp/project/.toolnet/current.md',
      },
    });

    expect(toolnetCurrent.blocked).toBe(false);
  });
});
