import { buildGrokPreToolGuard, grokDeniedOutput, grokHookEvent } from './continuity.js';

import { handleGrokHookInput } from './runtime.js';

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
  const event = grokHookEvent(input);

  /*
   * Policy enforcement must run for every native Grok hook source.
   * Do not dedupe PreToolUse policy checks.
   */
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
   * Grok can load hook definitions from global and project layers.
   * Claim the raw native event across processes before capture.
   *
   * SessionStart/UserPromptSubmit command hooks remain passive: ToolNet
   * does not attempt model-context injection through their stdout.
   */
  if (event) {
    const claim = claimHookEvent({
      agent: 'grok',
      event,
      input,
      directory: process.env.TOOLNET_HOOK_DEDUPE_DIR,
    });

    if (claim.duplicate) {
      return;
    }
  }

  const capture = await handleGrokHookInput(input);

  const refreshBoundary =
    event === 'SessionStart' ||
    event === 'sessionStart' ||
    event === 'session_start' ||
    event === 'Stop' ||
    event === 'stop';

  if (refreshBoundary && capture.projectRoot) {
    triggerProjectBackgroundRefresh(capture.projectRoot);
  }
}

main().catch(() => {
  // Grok hook failures remain fail-open.
  process.exitCode = 0;
});
