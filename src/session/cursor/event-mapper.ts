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

    case 'beforeSubmitPrompt':
    case 'UserPromptSubmit':
    case 'userPromptSubmit':
      return 'UserPromptSubmit';

    case 'postToolUse':
    case 'PostToolUse':
      return 'PostToolUse';

    case 'afterAgentResponse':
      return 'AssistantMessage';

    case 'stop':
    case 'Stop':
      return 'Stop';

    default:
      return null;
  }
}

export function normalizeCursorHookInput(
  input: JsonObject,
  env: NodeJS.ProcessEnv = process.env
): NormalizedHookInput | null {
  const event = normalizeEvent(
    env.TOOLNET_HOOK_EVENT ?? input.hook_event_name ?? input.hookEventName
  );

  if (!event) {
    return null;
  }

  const sessionId = firstText(
    input.session_id,
    input.sessionId,
    input.conversation_id,
    env.TOOLNET_CURSOR_SESSION_ID
  );

  const cwd = firstText(
    input.cwd,
    input.workspaceRoot,
    env.CURSOR_PROJECT_DIR,
    env.CLAUDE_PROJECT_DIR
  );

  if (!sessionId || !cwd) {
    return null;
  }

  return {
    agent: 'cursor',
    event,
    sessionId,
    cwd,
    timestamp:
      typeof input.timestamp === 'string' || typeof input.timestamp === 'number'
        ? input.timestamp
        : undefined,
    prompt: firstText(input.prompt),
    toolName: firstText(input.tool_name, input.toolName, input.tool),
    toolInput:
      input.tool_input ?? input.toolInput ?? input.tool_args ?? input.toolArgs ?? input.input,
    toolResponse:
      input.tool_response ?? input.tool_result ?? input.toolResult ?? input.result ?? input.output,
    assistantResponse: firstText(
      input.text,
      input.assistant_response,
      input.assistantResponse,
      input.last_assistant_message
    ),
  };
}

export function mapCursorHookToSessionEvents(
  input: JsonObject,
  project: ProjectManifest,
  env: NodeJS.ProcessEnv = process.env
): SessionEventInput[] {
  const normalized = normalizeCursorHookInput(input, env);

  return normalized ? mapNormalizedHookToSessionEvents(normalized, project) : [];
}
