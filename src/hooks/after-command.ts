import type { HookRuntime } from './runtime.js';
export async function afterCommand(
  runtime: HookRuntime,
  command: string,
  exitCode?: number
): Promise<void> {
  await runtime.command(command, exitCode);
}
