import type { MCPContext } from './context.js';

import {
  createMCPRuntimeState,
  markDependencyFailed,
  markDependencyLoading,
  markDependencyReady,
  markHydrationCompleted,
  markHydrationStarted,
  recordDependencyAttempt,
  recordRuntimeRetry,
  retryOperation,
} from './runtime-state.js';

import { tryHydrateFromService } from '../service/client.js';

export interface MCPHydrationResult {
  memory: 'ready' | 'failed';
  graph: 'ready' | 'failed';
  semantic: 'ready' | 'failed';
  errors: string[];
}

function positiveInteger(input: string | undefined, fallback: number): number {
  const value = Number(input);

  if (!Number.isFinite(value) || value < 1) {
    return fallback;
  }

  return Math.floor(value);
}

function nonNegativeInteger(input: string | undefined, fallback: number): number {
  const value = Number(input);

  if (!Number.isFinite(value) || value < 0) {
    return fallback;
  }

  return Math.floor(value);
}

function resultFromContext(ctx: MCPContext): MCPHydrationResult {
  const runtime = ctx.runtime;

  if (!runtime) {
    return {
      memory: 'failed',
      graph: 'failed',
      semantic: 'failed',
      errors: ['runtime unavailable'],
    };
  }

  return {
    memory: runtime.dependencies.memory.state === 'ready' ? 'ready' : 'failed',

    graph: runtime.dependencies.graph.state === 'ready' ? 'ready' : 'failed',

    semantic: runtime.dependencies.semantic.state === 'ready' ? 'ready' : 'failed',

    errors: [...runtime.errors],
  };
}

export async function hydrateMCPContext(ctx: MCPContext): Promise<MCPHydrationResult> {
  const runtime = ctx.runtime ?? createMCPRuntimeState(Date.now());

  ctx.runtime = runtime;

  markHydrationStarted(runtime);

  const attempts = positiveInteger(process.env.TOOLNET_MCP_HYDRATION_RETRIES, 3);

  const delayMs = nonNegativeInteger(process.env.TOOLNET_MCP_HYDRATION_RETRY_DELAY_MS, 500);

  /*
   * Fast path:
   * ask the optional local daemon for shared cache.
   *
   * Missing daemon is not an error.
   */
  if (
    runtime.dependencies.memory.state !== 'ready' ||
    runtime.dependencies.graph.state !== 'ready'
  ) {
    const daemon = await tryHydrateFromService(ctx.project, {
      timeoutMs: positiveInteger(process.env.TOOLNET_SERVICE_REQUEST_TIMEOUT_MS, 1_000),
    });

    if (daemon) {
      runtime.dataSource = 'daemon';

      if (runtime.dependencies.memory.state !== 'ready') {
        ctx.memory.importRecords(daemon.memory);

        markDependencyReady(runtime, 'memory');
      }

      if (runtime.dependencies.graph.state !== 'ready') {
        if (daemon.graph) {
          ctx.graph.import(daemon.graph.symbols, daemon.graph.edges);
        }

        markDependencyReady(runtime, 'graph');
      }
    }
  }

  try {
    /*
     * Even with daemon cache, build a lightweight scoped
     * storage object so write tools and semantic search can
     * continue to persist normally.
     */
    const [{ loadConfig }, storageModule] = await Promise.all([
      import('../core/config.js'),
      import('../storage/index.js'),
    ]);

    const config = loadConfig();

    const rawStorage = storageModule.createStorageProvider({
      provider: config.storage.provider,
      r2: config.storage.r2,
      s3: config.storage.s3,
      huggingface: config.storage.huggingface,
      localRoot: config.storage.localRoot,
    });

    const retryStorage = storageModule.withStorageRetry(rawStorage, {
      attempts: Number(process.env.TOOLNET_STORAGE_RETRIES ?? 3),
    });

    const storage = new storageModule.ProjectScopedStorageProvider(
      retryStorage,
      ctx.project.id,
      ctx.project.name,
      ctx.project.remote ?? ctx.project.name
    );

    const memoryStore = new storageModule.MemoryStore(storage);

    ctx.storage = storage;
    ctx.memoryStore = memoryStore;

    const memoryTask =
      runtime.dependencies.memory.state === 'ready'
        ? Promise.resolve()
        : (async () => {
            runtime.dataSource = 'embedded';

            markDependencyLoading(runtime, 'memory');

            try {
              const records = await retryOperation(() => memoryStore.load(ctx.project.id), {
                attempts,
                delayMs,

                onAttempt: () => {
                  recordDependencyAttempt(runtime, 'memory');
                },

                onRetry: () => {
                  recordRuntimeRetry(runtime);
                },
              });

              ctx.memory.importRecords(records);

              markDependencyReady(runtime, 'memory');
            } catch (error) {
              markDependencyFailed(runtime, 'memory', error);
            }
          })();

    const graphTask =
      runtime.dependencies.graph.state === 'ready'
        ? Promise.resolve()
        : (async () => {
            runtime.dataSource = 'embedded';

            markDependencyLoading(runtime, 'graph');

            try {
              const graph = await retryOperation(
                () => new storageModule.PersistentCodeGraphStore(storage).load(ctx.project.id),
                {
                  attempts,
                  delayMs,

                  onAttempt: () => {
                    recordDependencyAttempt(runtime, 'graph');
                  },

                  onRetry: () => {
                    recordRuntimeRetry(runtime);
                  },
                }
              );

              if (graph) {
                ctx.graph.import(graph.symbols, graph.edges);
              }

              markDependencyReady(runtime, 'graph');
            } catch (error) {
              markDependencyFailed(runtime, 'graph', error);
            }
          })();

    await Promise.all([memoryTask, graphTask]);

    if (runtime.dependencies.semantic.state !== 'ready') {
      markDependencyLoading(runtime, 'semantic');

      try {
        const { SemanticCodeEngine } =
          await import('../code-intelligence/semantic/semantic-code-engine.js');

        const semantic = new SemanticCodeEngine({
          projectId: ctx.project.id,
          rootPath: ctx.project.rootPath,

          storage,

          graph: ctx.graph,
        });

        await retryOperation(() => semantic.initialize(), {
          attempts,
          delayMs,

          onAttempt: () => {
            recordDependencyAttempt(runtime, 'semantic');
          },

          onRetry: () => {
            recordRuntimeRetry(runtime);
          },
        });

        ctx.codeSemantic = semantic;

        markDependencyReady(runtime, 'semantic');
      } catch (error) {
        markDependencyFailed(runtime, 'semantic', error);
      }
    }
  } catch (error) {
    for (const dependency of ['memory', 'graph', 'semantic'] as const) {
      if (runtime.dependencies[dependency].state !== 'ready') {
        markDependencyFailed(runtime, dependency, error);
      }
    }
  }

  markHydrationCompleted(runtime);

  return resultFromContext(ctx);
}
