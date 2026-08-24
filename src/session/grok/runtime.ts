import {
  handleNormalizedHookInput,
  type HookCaptureRuntimeDependencies,
  type HookCaptureRuntimeResult,
} from '../hook-capture/runtime.js';

import { normalizeGrokHookInput } from './event-mapper.js';

type JsonObject = Record<string, unknown>;

export async function handleGrokHookInput(
  input: JsonObject,
  dependencies: HookCaptureRuntimeDependencies = {},
  env: NodeJS.ProcessEnv = process.env
): Promise<HookCaptureRuntimeResult> {
  const normalized = normalizeGrokHookInput(input, env);

  if (!normalized) {
    return {
      active: false,
      captured: 0,
      flushed: false,
    };
  }

  return handleNormalizedHookInput(normalized, dependencies);
}
