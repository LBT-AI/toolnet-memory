/*
 * Phase 77 — MCP runtime attachment.
 *
 * MCP prefers the shared local daemon and falls back to an in-process runtime.
 * This is the single place that decision is made: tools depend on
 * `ctx.codeRuntime`, never on daemon presence.
 */

import type { MCPContext } from './context.js';

import { createCodeIntelligenceRuntime } from '../code-intelligence/runtime/index.js';

import { markRuntimeFailed } from './runtime-state.js';

function spawnAllowed(): boolean {
  if (process.env.TOOLNET_DAEMON_DISABLED === '1') {
    return false;
  }

  /* Never spawn a shared daemon from a test process. */
  if (process.env.VITEST || process.env.NODE_ENV === 'test') {
    return false;
  }

  return true;
}

export async function attachCodeIntelligenceRuntime(ctx: MCPContext): Promise<void> {
  if (ctx.codeRuntime) {
    return;
  }

  try {
    const created = await createCodeIntelligenceRuntime({
      clientType: 'mcp',
      allowSpawn: spawnAllowed(),
      timeoutMs: 750,
    });

    ctx.codeRuntime = created.runtime;
  } catch (error) {
    /*
     * The runtime is an optimization, not a dependency: hydration and the tools
     * keep working from the local project stores.
     */
    if (ctx.runtime) {
      markRuntimeFailed(ctx.runtime, error);
    }
  }
}
