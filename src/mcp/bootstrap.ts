import 'dotenv/config';

import { MemoryEngine } from '../core/memory-engine.js';
import { ProjectManager } from '../core/project-manager.js';

import { RetrievalEngine } from '../retrieval/retrieval-engine.js';

import { CodeGraphStore } from '../code-intelligence/graph/graph-store.js';
import { ReferenceResolver } from '../code-intelligence/symbols/reference-resolver.js';

import type { MCPContext } from './context.js';

import { startMCPServer } from './server.js';
import { hydrateMCPContext } from './hydration.js';

import { ProjectLock } from '../production/project-lock.js';

async function main() {
  /*
   * Only cheap/local state belongs before MCP stdio connect.
   *
   * No remote storage.
   * No graph fetch.
   * No embeddings.
   * No semantic initialization.
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

  const ctx: MCPContext = {
    project,
    memory,
    retrieval,
    graph,
    references,
  };

  /*
   * CRITICAL STARTUP CONTRACT:
   *
   * Connect MCP before touching remote storage or embeddings.
   * OpenCode / Agy / Codex can now complete initialize + tools/list
   * immediately.
   */
  await startMCPServer(ctx);

  /*
   * Remote state is hydrated after stdio is live.
   *
   * Mutating ctx is intentional: registered MCP tools retain the same
   * context object and see memory/graph/storage/semantic as they become ready.
   */
  void hydrateMCPContext(ctx)
    .then((result) => {
      if (result.errors.length > 0) {
        console.error(
          `[toolnet-memory] MCP background hydration degraded: ${result.errors.join(' | ')}`
        );
      }
    })
    .catch((error) => {
      console.error(
        `[toolnet-memory] MCP background hydration failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
