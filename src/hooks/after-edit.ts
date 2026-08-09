import type { HookRuntime } from './runtime.js';

export async function afterEdit(runtime: HookRuntime, filePath: string): Promise<void> {
  await runtime.fileWrite(filePath);
}
