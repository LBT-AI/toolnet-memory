import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

import { describe, expect, it } from 'vitest';

import {
  PROCESS_BOOTSTRAP_BUDGET_MS,
  buildUnreachableStorageEnv,
  connectWithBoundedBootstrap,
  evaluateStartupLatency,
  readServerStartup,
} from './startup-timing.js';

/*
 * Phase 85B — de-flaked fast startup.
 *
 * The product invariant has not changed: the MCP `initialize` handshake must
 * complete BEFORE the retryable storage hydration that points at unreachable
 * S3. What changed is how the test measures it.
 *
 * Old model (flaky): one 3000ms wall clock over `client.connect()`. That window
 * included cold tsx transpilation (~2.1–2.5s even isolated), so full-suite CPU
 * contention pushed it over the edge even though initialize never waited on S3.
 *
 * New model (deterministic):
 *   - A generous, bounded PROCESS bootstrap budget (30s) guards a true hang.
 *   - `client.connect()` resolving is the deterministic readiness signal.
 *   - The tight latency assertion is the server's own `runtime.metrics.startupMs`
 *     (measured in-process after module load and before hydration, ~50–70ms), so
 *     it excludes spawn/transpile and cannot flake under load — yet a regression
 *     that blocks initialize on storage still exceeds the 3000ms budget.
 *   - `runtime.phase === 'hydrating'` proves the handshake completed before
 *     hydration finished.
 */
describe('MCP fast startup', () => {
  it('completes MCP initialize before deliberately unreachable S3 hydration', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'toolnet-mcp-fast-'));

    const emptyGlobalEnv = join(projectRoot, 'empty.env');

    writeFileSync(
      join(projectRoot, 'package.json'),
      JSON.stringify(
        {
          name: 'toolnet-mcp-fast-startup-test',
          private: true,
        },
        null,
        2
      )
    );

    writeFileSync(emptyGlobalEnv, '');

    const transport = new StdioClientTransport({
      command: resolve('node_modules/.bin/tsx'),

      args: [resolve('src/mcp/bootstrap.ts')],

      cwd: projectRoot,

      env: buildUnreachableStorageEnv(projectRoot, emptyGlobalEnv),
    });

    const client = new Client({
      name: 'toolnet-fast-startup-test',
      version: '1.0.0',
    });

    try {
      /*
       * A resolved connect is the deterministic readiness signal: the server
       * has answered `initialize`. The bounded budget absorbs cold tsx spawn
       * under load; it is not the latency assertion.
       */
      const { bootstrapMs } = await connectWithBoundedBootstrap(client, transport);

      expect(bootstrapMs).toBeLessThan(PROCESS_BOOTSTRAP_BUDGET_MS);

      const { startupMs, phase } = await readServerStartup(client);

      /* The real latency assertion: server-reported, spawn-independent. */
      const verdict = evaluateStartupLatency(startupMs);

      expect(verdict.ok, verdict.reason).toBe(true);

      /* The handshake completed while hydration was still in flight. */
      expect(['starting', 'hydrating']).toContain(phase);

      const listed = await client.listTools();

      expect(listed.tools.map((tool) => tool.name)).toContain('memory_agent_ask');
    } finally {
      await client.close().catch(() => undefined);

      rmSync(projectRoot, {
        recursive: true,
        force: true,
      });
    }
  }, 60_000);
});
