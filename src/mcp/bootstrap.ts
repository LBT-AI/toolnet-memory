import 'dotenv/config';

import { MemoryEngine } from '../core/memory-engine.js';
import { ProjectManager } from '../core/project-manager.js';

import { RetrievalEngine } from '../retrieval/retrieval-engine.js';

import { CodeGraphStore } from '../code-intelligence/graph/graph-store.js';
import { ReferenceResolver } from '../code-intelligence/symbols/reference-resolver.js';

import type { MCPContext } from './context.js';

import { startMCPServer } from './server.js';
import { hydrateMCPContext } from './hydration.js';

import { createMCPRuntimeState, markMCPConnected, markRuntimeFailed } from './runtime-state.js';

import { ProjectLock } from '../production/project-lock.js';

function degradedRetryDelay(): number {
  const configured = Number(process.env.TOOLNET_MCP_DEGRADED_RETRY_MS ?? 30_000);

  return Number.isFinite(configured) && configured >= 1_000 ? Math.floor(configured) : 30_000;
}

async function main() {
  const processStartedAt = Date.now();

  /*
   * Only local/lightweight state belongs before
   * the MCP stdio handshake.
   */
  const project = new ProjectManager().detect();

  const processLock = new ProjectLock(project.id);

  await processLock.acquire();

  const stop = () => {
    void processLock.release().finally(() => process.exit(0));
  };

  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  const memory = new MemoryEngine();
  const retrieval = new RetrievalEngine(memory);

  const graph = new CodeGraphStore();
  const references = new ReferenceResolver(graph);

  const runtime = createMCPRuntimeState(processStartedAt);

  const ctx: MCPContext = {
    project,
    memory,
    retrieval,
    graph,
    references,
    runtime,
  };

  /*
   * Handshake first.
   */
  await startMCPServer(ctx);

  markMCPConnected(runtime);

  /*
   * Hydration is retryable and never owns MCP process
   * availability.
   */
  const hydrate = async (): Promise<void> => {
    try {
      await hydrateMCPContext(ctx);

      if (runtime.phase === 'degraded') {
        const timer = setTimeout(() => {
          void hydrate();
        }, degradedRetryDelay());

        timer.unref();
      }
    } catch (error) {
      markRuntimeFailed(runtime, error);

      const timer = setTimeout(() => {
        runtime.phase = 'degraded';

        void hydrate();
      }, degradedRetryDelay());

      timer.unref();
    }
  };

  void hydrate();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
