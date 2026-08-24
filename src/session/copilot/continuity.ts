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

export function copilotHookEvent(input: JsonObject, env: NodeJS.ProcessEnv = process.env): string {
  return (
    text(env.TOOLNET_HOOK_EVENT) ?? text(input.hook_event_name) ?? text(input.hookEventName) ?? ''
  );
}

export function buildCopilotSessionStartOutput(input: JsonObject): JsonObject {
  const cwd = text(input.cwd) ?? text(input.workspaceRoot) ?? '';

  const context = buildStartupContinuityContext(cwd, 'Copilot');

  return context
    ? {
        additionalContext: context,
      }
    : {};
}

export function buildCopilotTransformedPromptOutput(input: JsonObject): JsonObject {
  const prompt = text(input.prompt) ?? '';

  const transformedPrompt =
    text(input.transformedPrompt) ?? text(input.transformed_prompt) ?? prompt;

  const cwd = text(input.cwd) ?? text(input.workspaceRoot) ?? '';

  const context = buildResumeContinuityContext(prompt, cwd, 'Copilot');

  if (!context) {
    return {};
  }

  return {
    modifiedTransformedPrompt: `${transformedPrompt}\n\n${context}`,
  };
}

export function buildCopilotPreToolGuard(input: JsonObject): ContinuityGuardResult {
  return buildContinuityPreToolGuard(
    input.toolArgs ?? input.tool_input ?? input.toolInput ?? input
  );
}

export function copilotDeniedOutput(reason: string): JsonObject {
  return {
    permissionDecision: 'deny',
    permissionDecisionReason: reason,
  };
}
