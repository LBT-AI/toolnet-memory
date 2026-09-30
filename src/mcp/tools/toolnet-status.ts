import type { MCPContext } from '../context.js';

import { inspectMemoryPipeline } from '../../production/memory-pipeline-status.js';

export const toolnetStatusSchema = {};

export async function toolnetStatus(ctx: MCPContext) {
  const projectId = ctx.project.id;

  /*
   * Durable memory pipeline health is read-only and separate from MCP runtime
   * readiness. It is omitted until storage is hydrated so a partially started
   * runtime never reports a false pipeline state.
   */
  const memory = ctx.storage
    ? await inspectMemoryPipeline({ project: ctx.project, storage: ctx.storage })
    : undefined;

  return {
    project: {
      id: projectId,
      name: ctx.project.name,
      remote: ctx.project.remote ?? ctx.project.name,
      rootPath: ctx.project.rootPath,
    },

    runtime: ctx.runtime
      ? {
          phase: ctx.runtime.phase,

          dependencies: {
            memory: {
              ...ctx.runtime.dependencies.memory,
            },

            graph: {
              ...ctx.runtime.dependencies.graph,
            },

            semantic: {
              ...ctx.runtime.dependencies.semantic,
            },
          },

          metrics: {
            ...ctx.runtime.metrics,
          },

          errors: [...ctx.runtime.errors],

          dataSource: ctx.runtime.dataSource,

          lastUpdatedAt: ctx.runtime.lastUpdatedAt,
        }
      : null,

    storage: ctx.storage?.name ?? null,

    data: {
      memories: ctx.memory.exportProject(projectId).length,

      graphSymbols: ctx.graph.allSymbols(projectId).length,

      graphEdges: ctx.graph.allEdges(projectId).length,

      semanticAvailable: ctx.codeSemantic !== undefined,
    },

    /* Structured capture/materialization health for another agent to reason on. */
    memory: memory
      ? {
          configuration: memory.configuration,

          overall: memory.overall,

          capture: memory.capture,

          wal: memory.wal,

          journal: memory.journal,

          memoryStore: memory.memoryStore,

          materialization: memory.materialization,

          lastCaptureAt: memory.lastCaptureAt,

          lastMaterializationAt: memory.lastMaterializationAt,

          pendingMaterialization: memory.pendingMaterialization,

          requiresDaemon: memory.requiresDaemon,

          integrations: memory.integrations,
        }
      : null,
  };
}
