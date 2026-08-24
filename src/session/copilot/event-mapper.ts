import type { ProjectManifest } from '../../core/types.js';

import type { SessionEventInput } from '../types.js';

import {
  mapNormalizedHookToSessionEvents,
  type NormalizedHookEventName,
  type NormalizedHookInput,
} from '../hook-capture/event-mapper.js';

type JsonObject = Record<string, unknown>;

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function firstText(...values: unknown[]): string | undefined {
  for (const value of values) {
    const found = text(value);

    if (found) {
      return found;
    }
  }

  return undefined;
}

function normalizeEvent(value: unknown): NormalizedHookEventName | null {
  switch (text(value)) {
    case 'sessionStart':
    case 'SessionStart':
      return 'SessionStart';

    case 'userPromptSubmitted':
    case 'UserPromptSubmit':
      return 'UserPromptSubmit';

    case 'postToolUse':
    case 'PostToolUse':
      return 'PostToolUse';

    case 'agentStop':
    case 'Stop':
      return 'Stop';

    default:
      return null;
  }
}

export function normalizeCopilotHookInput(
  input: JsonObject,
  env: NodeJS.ProcessEnv = process.env
): NormalizedHookInput | null {
  const event = normalizeEvent(
    env.TOOLNET_HOOK_EVENT ?? input.hook_event_name ?? input.hookEventName
  );

  if (!event) {
    return null;
  }

  const sessionId = firstText(input.session_id, input.sessionId);

  const cwd = firstText(input.cwd, input.workspaceRoot);

  if (!sessionId || !cwd) {
    return null;
  }

  return {
    agent: 'copilot',
    event,
    sessionId,
    cwd,
    timestamp:
      typeof input.timestamp === 'string' || typeof input.timestamp === 'number'
        ? input.timestamp
        : undefined,
    prompt: firstText(input.prompt),
    toolName: firstText(input.tool_name, input.toolName),
    toolInput: input.tool_input ?? input.toolInput ?? input.toolArgs,
    toolResponse: input.tool_result ?? input.toolResult ?? input.tool_response,
    assistantResponse: firstText(
      input.response,
      input.last_assistant_message,
      input.assistant_response
    ),
  };
}

export function mapCopilotHookToSessionEvents(
  input: JsonObject,
  project: ProjectManifest,
  env: NodeJS.ProcessEnv = process.env
): SessionEventInput[] {
  const normalized = normalizeCopilotHookInput(input, env);

  return normalized ? mapNormalizedHookToSessionEvents(normalized, project) : [];
}
