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
    case 'SessionStart':
    case 'sessionStart':
    case 'session_start':
      return 'SessionStart';

    case 'UserPromptSubmit':
    case 'userPromptSubmit':
    case 'user_prompt_submit':
      return 'UserPromptSubmit';

    case 'PostToolUse':
    case 'postToolUse':
    case 'post_tool_use':
      return 'PostToolUse';

    case 'Stop':
    case 'stop':
      return 'Stop';

    default:
      return null;
  }
}

export function normalizeGrokHookInput(
  input: JsonObject,
  env: NodeJS.ProcessEnv = process.env
): NormalizedHookInput | null {
  const event = normalizeEvent(
    env.TOOLNET_HOOK_EVENT ?? input.hookEventName ?? input.hook_event_name
  );

  if (!event) {
    return null;
  }

  const sessionId = firstText(input.sessionId, input.session_id, env.GROK_SESSION_ID);

  const cwd = firstText(
    input.cwd,
    input.workspaceRoot,
    env.GROK_WORKSPACE_ROOT,
    env.CLAUDE_PROJECT_DIR
  );

  if (!sessionId || !cwd) {
    return null;
  }

  return {
    agent: 'grok',
    event,
    sessionId,
    cwd,
    timestamp:
      typeof input.timestamp === 'string' || typeof input.timestamp === 'number'
        ? input.timestamp
        : undefined,
    prompt: firstText(input.prompt),
    toolName: firstText(input.toolName, input.tool_name),
    toolInput: input.toolInput ?? input.tool_input,
    toolResponse: input.toolResult ?? input.tool_result ?? input.toolResponse,
    assistantResponse: firstText(
      input.response,
      input.assistantResponse,
      input.lastAssistantMessage
    ),
  };
}

export function mapGrokHookToSessionEvents(
  input: JsonObject,
  project: ProjectManifest,
  env: NodeJS.ProcessEnv = process.env
): SessionEventInput[] {
  const normalized = normalizeGrokHookInput(input, env);

  return normalized ? mapNormalizedHookToSessionEvents(normalized, project) : [];
}
