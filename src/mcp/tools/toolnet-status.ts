import type { MCPContext } from '../context.js';

export const toolnetStatusSchema = {};

export function toolnetStatus(ctx: MCPContext) {
  const projectId = ctx.project.id;

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
  };
}
