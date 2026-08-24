import {
  buildKiroPreToolGuard,
  buildKiroPromptContext,
  buildKiroStartupContext,
  isKiroPreToolEvent,
  isKiroPromptEvent,
  isKiroStartupEvent,
} from './continuity.js';

import { handleKiroHookInput } from './runtime.js';

async function readInput(): Promise<Record<string, unknown>> {
  let raw = '';

  for await (const chunk of process.stdin) {
    raw += chunk.toString();
  }

  if (!raw.trim()) {
    return {};
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function main(): Promise<void> {
  const input = await readInput();

  const hookEvent = input.hook_event_name;

  /*
   * PreToolUse is the only Kiro hook where exit code 2 is a deliberate
   * ToolNet control signal. STDERR becomes feedback to the model.
   */
  if (isKiroPreToolEvent(hookEvent)) {
    const guard = buildKiroPreToolGuard(input);

    if (guard.blocked) {
      process.stderr.write(`${guard.reason ?? 'ToolNet continuity guard blocked this tool.'}\n`);

      process.exitCode = 2;

      return;
    }

    return;
  }

  /*
   * Capture first. Startup/prompt context generation must not replace the
   * Phase 03 local WAL lane.
   */
  await handleKiroHookInput(input);

  /*
   * Kiro adds successful SessionStart/AgentSpawn stdout to agent context.
   * Keep this local-only and compact.
   */
  if (isKiroStartupEvent(hookEvent)) {
    const cwd = typeof input.cwd === 'string' ? input.cwd : '';

    const context = buildKiroStartupContext(cwd);

    if (context) {
      process.stdout.write(context);
    }

    return;
  }

  /*
   * Do not add guidance on every prompt.
   * Refresh continuity only when the user is explicitly resuming work.
   */
  if (isKiroPromptEvent(hookEvent)) {
    const context = buildKiroPromptContext(input);

    if (context) {
      process.stdout.write(context);
    }
  }
}

main().catch(() => {
  /*
   * Fail open for every non-guard error.
   * ToolNet Memory must never break Kiro CLI.
   */
  process.exitCode = 0;
});
