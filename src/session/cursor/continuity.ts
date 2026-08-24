import {
  buildContinuityPreToolGuard,
  buildResumeContinuityContext,
  buildStartupContinuityContext,
  type ContinuityGuardResult,
} from '../hook-capture/continuity.js';

type JsonObject = Record<string, unknown>;

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function cursorHookEvent(input: JsonObject, env: NodeJS.ProcessEnv = process.env): string {
  return (
    text(env.TOOLNET_HOOK_EVENT) ?? text(input.hook_event_name) ?? text(input.hookEventName) ?? ''
  );
}

export function buildCursorSessionStartOutput(
  input: JsonObject,
  env: NodeJS.ProcessEnv = process.env
): JsonObject {
  const sessionId =
    text(input.session_id) ??
    text(input.sessionId) ??
    text(input.conversation_id) ??
    text(env.TOOLNET_CURSOR_SESSION_ID) ??
    '';

  const cwd =
    text(input.cwd) ??
    text(input.workspaceRoot) ??
    text(env.CURSOR_PROJECT_DIR) ??
    text(env.CLAUDE_PROJECT_DIR) ??
    '';

  const context = buildStartupContinuityContext(cwd, 'Cursor');

  const output: JsonObject = {
    env: {
      TOOLNET_CURSOR_SESSION_ID: sessionId,
    },
  };

  if (context) {
    output.additional_context = context;
  }

  return output;
}

export function buildCursorResumeContext(
  input: JsonObject,
  env: NodeJS.ProcessEnv = process.env
): string {
  const prompt = text(input.prompt) ?? '';

  const cwd =
    text(input.cwd) ??
    text(input.workspaceRoot) ??
    text(env.CURSOR_PROJECT_DIR) ??
    text(env.CLAUDE_PROJECT_DIR) ??
    '';

  return buildResumeContinuityContext(prompt, cwd, 'Cursor');
}

export function buildCursorPreToolGuard(input: JsonObject): ContinuityGuardResult {
  return buildContinuityPreToolGuard(
    input.tool_input ?? input.toolInput ?? input.updated_input ?? input
  );
}

export function cursorDeniedOutput(reason: string): JsonObject {
  return {
    permission: 'deny',
    user_message: reason,
    agent_message: reason,
  };
}
