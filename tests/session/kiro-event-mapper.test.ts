import { describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import { mapKiroHookToSessionEvents } from '../../src/session/kiro/event-mapper.js';

const project: ProjectManifest = {
  id: 'kiro-test-project',

  name: 'kiro-test',

  remote: 'kiro-test',

  rootPath: '/tmp/kiro-test',

  createdAt: '2026-08-24T00:00:00.000Z',

  updatedAt: '2026-08-24T00:00:00.000Z',

  graphVersion: 0,

  memoryVersion: 0,
};

describe('Kiro hook event mapper', () => {
  it('maps SessionStart and legacy agentSpawn to session_start', () => {
    for (const hookEvent of ['SessionStart', 'agentSpawn']) {
      const events = mapKiroHookToSessionEvents(
        {
          hook_event_name: hookEvent,

          cwd: project.rootPath,

          session_id: 'session-1',
        },
        project
      );

      expect(events).toHaveLength(1);

      expect(events[0]?.type).toBe('session_start');

      expect(events[0]?.sourceEventId).toBe('kiro:session-1:start');
    }
  });

  it('maps user prompt content without needing a transcript', () => {
    const events = mapKiroHookToSessionEvents(
      {
        hook_event_name: 'UserPromptSubmit',

        cwd: project.rootPath,

        session_id: 'session-1',

        prompt: 'Continue Phase 03',
      },
      project
    );

    expect(events).toHaveLength(1);

    expect(events[0]?.type).toBe('user_prompt');

    expect(events[0]?.data?.content).toBe('Continue Phase 03');
  });

  it('captures file writes from nested Kiro tool input', () => {
    const events = mapKiroHookToSessionEvents(
      {
        hook_event_name: 'PostToolUse',

        cwd: project.rootPath,

        session_id: 'session-1',

        tool_name: 'fs_write',

        tool_input: {
          operations: [
            {
              mode: 'write',

              path: '/tmp/kiro-test/src/index.ts',
            },
          ],
        },

        tool_response: {
          success: true,
        },
      },
      project
    );

    expect(events).toHaveLength(1);

    expect(events[0]?.type).toBe('file_write');

    expect(events[0]?.provenance?.files).toContain('/tmp/kiro-test/src/index.ts');
  });

  it('filters noisy read-only tool activity', () => {
    const events = mapKiroHookToSessionEvents(
      {
        hook_event_name: 'PostToolUse',

        cwd: project.rootPath,

        session_id: 'session-1',

        tool_name: 'fs_read',

        tool_input: {
          path: '/tmp/kiro-test/src/index.ts',
        },
      },
      project
    );

    expect(events).toEqual([]);
  });

  it('captures shell activity as command events', () => {
    const events = mapKiroHookToSessionEvents(
      {
        hook_event_name: 'PostToolUse',

        cwd: project.rootPath,

        session_id: 'session-1',

        tool_name: 'execute_bash',

        tool_input: {
          command: 'npm test',
        },

        tool_response: {
          success: true,
        },
      },
      project
    );

    expect(events).toHaveLength(1);

    expect(events[0]?.type).toBe('command');
  });

  it('captures assistant response and idle boundary on Stop', () => {
    const events = mapKiroHookToSessionEvents(
      {
        hook_event_name: 'Stop',

        cwd: project.rootPath,

        session_id: 'session-1',

        assistant_response: 'Phase 03 implemented.',
      },
      project
    );

    expect(events.map((event) => event.type)).toEqual(['assistant_message', 'session_idle']);

    expect(events[0]?.data?.content).toBe('Phase 03 implemented.');
  });

  it('bounds very large tool responses', () => {
    const events = mapKiroHookToSessionEvents(
      {
        hook_event_name: 'PostToolUse',

        cwd: project.rootPath,

        session_id: 'session-1',

        tool_name: '@example/large-tool',

        tool_input: {
          query: 'x',
        },

        tool_response: {
          result: 'a'.repeat(20000),
        },
      },
      project
    );

    const serialized = JSON.stringify(events[0]?.data);

    expect(serialized.length).toBeLessThan(10000);
  });
});
