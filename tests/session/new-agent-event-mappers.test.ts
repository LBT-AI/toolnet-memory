import { describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import { normalizeCursorHookInput } from '../../src/session/cursor/event-mapper.js';

import { normalizeCopilotHookInput } from '../../src/session/copilot/event-mapper.js';

import { normalizeGrokHookInput } from '../../src/session/grok/event-mapper.js';

import { mapNormalizedHookToSessionEvents } from '../../src/session/hook-capture/event-mapper.js';

const project = {
  version: 1,
  id: 'new-agent-mapper-test',
  name: 'new-agent-mapper-test',
  remote: 'new-agent-mapper-test',
  rootPath: '/tmp/new-agent-mapper-test',
  createdAt: '2026-08-24T00:00:00.000Z',
  updatedAt: '2026-08-24T00:00:00.000Z',
  graphVersion: 0,
  memoryVersion: 0,
} as ProjectManifest;

describe('Cursor/Copilot/Grok event normalization', () => {
  it('normalizes Cursor sessionStart using CURSOR_PROJECT_DIR', () => {
    const normalized = normalizeCursorHookInput(
      {
        session_id: 'cursor-1',
      },
      {
        TOOLNET_HOOK_EVENT: 'sessionStart',
        CURSOR_PROJECT_DIR: '/tmp/project',
      }
    );

    expect(normalized).toMatchObject({
      agent: 'cursor',
      event: 'SessionStart',
      sessionId: 'cursor-1',
      cwd: '/tmp/project',
    });
  });

  it('normalizes Cursor prompt using session-scoped ToolNet env', () => {
    const normalized = normalizeCursorHookInput(
      {
        prompt: 'Continue implementation',
      },
      {
        TOOLNET_HOOK_EVENT: 'beforeSubmitPrompt',
        TOOLNET_CURSOR_SESSION_ID: 'cursor-1',
        CURSOR_PROJECT_DIR: '/tmp/project',
      }
    );

    expect(normalized).toMatchObject({
      event: 'UserPromptSubmit',
      prompt: 'Continue implementation',
      sessionId: 'cursor-1',
    });
  });

  it('normalizes Copilot camelCase payload', () => {
    const normalized = normalizeCopilotHookInput(
      {
        sessionId: 'copilot-1',
        cwd: '/tmp/project',
        toolName: 'edit',
        toolArgs: {
          file_path: '/tmp/project/src/a.ts',
        },
        toolResult: {
          resultType: 'success',
        },
      },
      {
        TOOLNET_HOOK_EVENT: 'postToolUse',
      }
    );

    expect(normalized).toMatchObject({
      agent: 'copilot',
      event: 'PostToolUse',
      sessionId: 'copilot-1',
      toolName: 'edit',
    });
  });

  it('normalizes Grok native hook payload', () => {
    const normalized = normalizeGrokHookInput({
      hookEventName: 'post_tool_use',
      sessionId: 'grok-1',
      cwd: '/tmp/project',
      toolName: 'run_terminal_command',
      toolInput: {
        command: 'npm test',
      },
    });

    expect(normalized).toMatchObject({
      agent: 'grok',
      event: 'PostToolUse',
      sessionId: 'grok-1',
      toolName: 'run_terminal_command',
    });
  });

  it('maps edit/write/command events and filters reads', () => {
    const edit = mapNormalizedHookToSessionEvents(
      {
        agent: 'cursor',
        event: 'PostToolUse',
        sessionId: 'cursor-1',
        cwd: project.rootPath,
        toolName: 'apply_patch',
        toolInput: {
          file_path: '/tmp/project/src/a.ts',
        },
      },
      project
    );

    const command = mapNormalizedHookToSessionEvents(
      {
        agent: 'grok',
        event: 'PostToolUse',
        sessionId: 'grok-1',
        cwd: project.rootPath,
        toolName: 'run_terminal_command',
        toolInput: {
          command: 'npm test',
        },
      },
      project
    );

    const read = mapNormalizedHookToSessionEvents(
      {
        agent: 'copilot',
        event: 'PostToolUse',
        sessionId: 'copilot-1',
        cwd: project.rootPath,
        toolName: 'view',
        toolInput: {
          file_path: '/tmp/project/src/a.ts',
        },
      },
      project
    );

    expect(edit[0]?.type).toBe('file_edit');
    expect(command[0]?.type).toBe('command');
    expect(read).toEqual([]);
  });

  it('maps Cursor afterAgentResponse into assistant_message', () => {
    const normalized = normalizeCursorHookInput(
      {
        text: 'Phase finished.',
      },
      {
        TOOLNET_HOOK_EVENT: 'afterAgentResponse',
        TOOLNET_CURSOR_SESSION_ID: 'cursor-1',
        CURSOR_PROJECT_DIR: '/tmp/project',
      }
    );

    expect(normalized?.event).toBe('AssistantMessage');

    const events = mapNormalizedHookToSessionEvents(normalized!, project);

    expect(events[0]?.type).toBe('assistant_message');
  });
});
