import {
  buildCopilotPreToolGuard,
  buildCopilotSessionStartOutput,
  buildCopilotTransformedPromptOutput,
  copilotDeniedOutput,
  copilotHookEvent,
} from './continuity.js';

import { handleCopilotHookInput } from './runtime.js';

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
  const event = copilotHookEvent(input);

  if (event === 'preToolUse' || event === 'PreToolUse') {
    const guard = buildCopilotPreToolGuard(input);

    if (guard.blocked) {
      /*
       * Copilot command preToolUse parses this JSON and denies while
       * keeping exit code 0, so ToolNet's own unexpected errors remain
       * fail-open rather than becoming accidental policy denials.
       */
      process.stdout.write(
        JSON.stringify(
          copilotDeniedOutput(guard.reason ?? 'ToolNet continuity guard blocked this tool.')
        )
      );
    }

    return;
  }

  if (event === 'userPromptTransformed' || event === 'UserPromptTransformed') {
    process.stdout.write(JSON.stringify(buildCopilotTransformedPromptOutput(input)));

    return;
  }

  await handleCopilotHookInput(input);

  if (event === 'sessionStart' || event === 'SessionStart') {
    process.stdout.write(JSON.stringify(buildCopilotSessionStartOutput(input)));
  }
}

main().catch(() => {
  /*
   * Copilot preToolUse command hooks are fail-closed for non-zero exits.
   * Therefore ToolNet intentionally exits 0 for unexpected runtime errors.
   */
  process.exitCode = 0;
});
