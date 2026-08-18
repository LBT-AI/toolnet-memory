import type { ProjectManifest } from '../../core/types.js';

import type { SessionEventInput } from '../types.js';

type JsonObject = Record<string, unknown>;

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonObject) : {};
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function timestamp(input: JsonObject): string {
  const value = text(input.timestamp);

  if (value) {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return new Date().toISOString();
}

/**
 * Pure mapping only.
 *
 * Phase 2 will wire these events into continuous durable capture.
 * Phase 1 establishes the same event contract as the other agents.
 */
export function mapClaudeHookToSessionEvents(
  input: JsonObject,
  project: ProjectManifest
): SessionEventInput[] {
  const hookEvent = text(input.hook_event_name);

  if (!hookEvent) {
    return [];
  }

  const sessionId = text(input.session_id) ?? 'claude';
  const cwd = text(input.cwd) ?? project.rootPath;
  const toolName = text(input.tool_name);
  const toolUseId = text(input.tool_use_id);

  const toolInput = object(input.tool_input);
  const filePath = text(toolInput.file_path);

  const sourceEventBase = ['claude', sessionId, hookEvent, toolUseId ?? '', filePath ?? ''].join(
    ':'
  );

  const common = {
    timestamp: timestamp(input),

    cwd,

    source: 'claude',

    provenance: {
      source: 'claude-hook',
    },
  } satisfies Partial<SessionEventInput>;

  if (hookEvent === 'SessionStart') {
    return [
      {
        ...common,

        type: 'session_start',

        sourceEventId: `${sourceEventBase}:start`,

        data: {
          sessionId,
          cwd,
        },
      },
    ];
  }

  if (hookEvent === 'PostToolUse') {
    if ((toolName === 'Edit' || toolName === 'Write') && filePath) {
      return [
        {
          ...common,

          type: toolName === 'Edit' ? 'file_edit' : 'file_write',

          sourceEventId: `${sourceEventBase}:file`,

          data: {
            tool: toolName,
            filePath,
          },

          provenance: {
            source: 'claude-hook',
            files: [filePath],
          },
        },
      ];
    }

    return [
      {
        ...common,

        type: 'tool_result',

        sourceEventId: `${sourceEventBase}:tool-result`,

        data: {
          tool: toolName,
        },
      },
    ];
  }

  if (hookEvent === 'Stop') {
    return [
      {
        ...common,

        type: 'session_idle',

        sourceEventId: `${sourceEventBase}:idle`,

        data: {
          sessionId,
        },
      },
    ];
  }

  return [
    {
      ...common,

      type: 'custom',

      sourceEventId: `${sourceEventBase}:custom`,

      data: {
        hookEvent,
      },
    },
  ];
}
