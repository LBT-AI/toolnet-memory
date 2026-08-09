import type { MCPContext } from '../context.js';

import { getArchitecture } from '../../code-intelligence/graph/architecture.js';

export async function getProjectArchitecture(ctx: MCPContext) {
  return {
    project: {
      id: ctx.project.id,

      name: ctx.project.name,

      rootPath: ctx.project.rootPath,
    },

    architecture: getArchitecture(ctx.graph, ctx.project.id),
  };
}
