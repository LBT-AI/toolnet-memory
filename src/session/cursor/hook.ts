import {
  buildCursorPreToolGuard,
  buildCursorResumeContext,
  buildCursorSessionStartOutput,
  cursorDeniedOutput,
  cursorHookEvent,
} from './continuity.js';

import { handleCursorHookInput } from './runtime.js';

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
  const event = cursorHookEvent(input);

  /*
   * PreToolUse policy must run for every native hook source.
   * If global + project hooks both fire, both independently enforce policy.
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
   * Cursor loads global and project hooks additively.
   * Claim the raw native event across processes before capture/context output.
   */
  if (event) {
    const claim = claimHookEvent({
      agent: 'cursor',
      event,
      input,
      directory: process.env.TOOLNET_HOOK_DEDUPE_DIR,
    });

    if (claim.duplicate) {
      return;
    }
  }

  const capture = await handleCursorHookInput(input);

  const refreshBoundary =
    event === 'sessionStart' || event === 'SessionStart' || event === 'stop' || event === 'Stop';

  if (refreshBoundary && capture.projectRoot) {
    triggerProjectBackgroundRefresh(capture.projectRoot);
  }

  if (event === 'sessionStart' || event === 'SessionStart') {
    process.stdout.write(JSON.stringify(buildCursorSessionStartOutput(input)));

    return;
  }

  /*
   * beforeSubmitPrompt cannot inject context in Cursor's command-hook
   * protocol. The persistent SessionStart directive plus project ToolNet
   * rule tell Cursor how to handle resume requests.
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
