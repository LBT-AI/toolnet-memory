import { buildGrokPreToolGuard, grokDeniedOutput, grokHookEvent } from './continuity.js';

import { handleGrokHookInput } from './runtime.js';

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
  const event = grokHookEvent(input);

  if (event === 'PreToolUse' || event === 'preToolUse' || event === 'pre_tool_use') {
    const guard = buildGrokPreToolGuard(input);

    if (guard.blocked) {
      process.stdout.write(
        JSON.stringify(
          grokDeniedOutput(guard.reason ?? 'ToolNet continuity guard blocked this tool.')
        )
      );
    }

    return;
  }

  /*
   * Grok command hooks for SessionStart/UserPromptSubmit are passive;
   * stdout is ignored by the native runner. Phase 04 therefore uses
   * a global ToolNet continuity skill for resume routing while this
   * hook remains the local-first capture lane.
   */
  await handleGrokHookInput(input);
}

main().catch(() => {
  // Grok hook failures should remain fail-open.
  process.exitCode = 0;
});
