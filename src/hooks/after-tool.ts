import type { HookRuntime } from './runtime.js';

export async function afterTool(
  runtime: HookRuntime,
  tool: string,
  output?: unknown
): Promise<void> {
  await runtime.afterTool(tool, output);
}
