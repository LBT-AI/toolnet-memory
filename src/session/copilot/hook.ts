import {
  buildCopilotPreToolGuard,
  buildCopilotSessionStartOutput,
  buildCopilotTransformedPromptOutput,
  copilotDeniedOutput,
  copilotHookEvent,
} from './continuity.js';

import { handleCopilotHookInput } from './runtime.js';

import { claimHookEvent } from '../integration-scope/index.js';

import { triggerProjectBackgroundRefresh } from '../../multi-host/refresh-trigger.js';

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

  /*
   * Policy guard runs for every hook source. Do not dedupe policy enforcement.
   */
  if (event === 'preToolUse' || event === 'PreToolUse') {
    const guard = buildCopilotPreToolGuard(input);

    if (guard.blocked) {
      process.stdout.write(
        JSON.stringify(
          copilotDeniedOutput(guard.reason ?? 'ToolNet continuity guard blocked this tool.')
        )
      );
    }

    return;
  }

  /*
   * User and repository hooks are additive in Copilot CLI.
   * Claim the native event before capture or model-facing output.
   */
  if (event) {
    const claim = claimHookEvent({
      agent: 'copilot',
      event,
      input,
      directory: process.env.TOOLNET_HOOK_DEDUPE_DIR,
    });

    if (claim.duplicate) {
      return;
    }
  }

  if (event === 'userPromptTransformed' || event === 'UserPromptTransformed') {
    process.stdout.write(JSON.stringify(buildCopilotTransformedPromptOutput(input)));

    return;
  }

  const capture = await handleCopilotHookInput(input);

  const refreshBoundary =
    event === 'sessionStart' ||
    event === 'SessionStart' ||
    event === 'agentStop' ||
    event === 'Stop';

  if (refreshBoundary && capture.projectRoot) {
    triggerProjectBackgroundRefresh(capture.projectRoot);
  }

  if (event === 'sessionStart' || event === 'SessionStart') {
    process.stdout.write(JSON.stringify(buildCopilotSessionStartOutput(input)));
  }
}

main().catch(() => {
  /*
   * Copilot preToolUse command hooks are fail-closed for non-zero exits.
   * ToolNet therefore fails open for unexpected non-policy errors.
   */
  process.exitCode = 0;
});
