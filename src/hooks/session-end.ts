import type { HookRuntime } from './runtime.js';

export async function onSessionEnd(runtime: HookRuntime): Promise<void> {
  await runtime.sessionEnd();
}
