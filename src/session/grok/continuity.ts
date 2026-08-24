import {
  buildContinuityPreToolGuard,
  type ContinuityGuardResult,
} from '../hook-capture/continuity.js';

type JsonObject = Record<string, unknown>;

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function grokHookEvent(input: JsonObject, env: NodeJS.ProcessEnv = process.env): string {
  return (
    text(env.TOOLNET_HOOK_EVENT) ??
    text(input.hookEventName) ??
    text(input.hook_event_name) ??
    text(env.GROK_HOOK_EVENT) ??
    ''
  );
}

export function buildGrokPreToolGuard(input: JsonObject): ContinuityGuardResult {
  return buildContinuityPreToolGuard(input.toolInput ?? input.tool_input ?? input);
}

export function grokDeniedOutput(reason: string): JsonObject {
  return {
    decision: 'deny',
    reason,
  };
}
