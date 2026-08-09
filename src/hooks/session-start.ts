import type { HookRuntime } from './runtime.js';

export async function onSessionStart(runtime: HookRuntime): Promise<void> {
  await runtime.sessionStart();
}
