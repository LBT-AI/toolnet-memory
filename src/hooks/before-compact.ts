import type { HookRuntime } from "./runtime.js";

export async function beforeCompact(
  runtime: HookRuntime,
): Promise<void> {
  await runtime.flush();
}
