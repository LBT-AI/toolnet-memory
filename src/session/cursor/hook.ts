import {
  buildCursorPreToolGuard,
  buildCursorResumeContext,
  buildCursorSessionStartOutput,
  cursorDeniedOutput,
  cursorHookEvent,
} from './continuity.js';

import { handleCursorHookInput } from './runtime.js';

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
  const event = cursorHookEvent(input);

  /*
   * Phase 04 guard. Cursor honors native deny JSON and exit code 2.
   */
  if (event === 'preToolUse' || event === 'PreToolUse') {
    const guard = buildCursorPreToolGuard(input);

    if (guard.blocked) {
      process.stdout.write(
        JSON.stringify(
          cursorDeniedOutput(guard.reason ?? 'ToolNet continuity guard blocked this tool.')
        )
      );

      process.exitCode = 2;
    }

    return;
  }

  /*
   * Phase 03 capture stays authoritative.
   */
  await handleCursorHookInput(input);

  if (event === 'sessionStart' || event === 'SessionStart') {
    process.stdout.write(JSON.stringify(buildCursorSessionStartOutput(input)));

    return;
  }

  /*
   * beforeSubmitPrompt cannot inject context in Cursor's command-hook
   * protocol. We still evaluate resume intent here so tests/diagnostics
   * can verify routing; the persistent sessionStart directive tells Cursor
   * how to handle resume requests.
   */
  if (event === 'beforeSubmitPrompt' || event === 'UserPromptSubmit') {
    void buildCursorResumeContext(input);
  }
}

main().catch(() => {
  /*
   * Fail open for non-policy errors.
   */
  process.exitCode = 0;
});
