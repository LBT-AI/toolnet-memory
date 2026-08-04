import { z } from "zod";

import type { MCPContext } from "../context.js";
import { getArchitecture } from "../../code-intelligence/graph/architecture.js";

export const projectContextSchema = {
  query: z.string().optional(),
  memoryLimit: z.number().int().min(1).max(20).optional(),
};

export async function projectContext(
  ctx: MCPContext,
  input: {
    query?: string;
    memoryLimit?: number;
  },
) {
  const architecture =
    getArchitecture(
      ctx.graph,
      ctx.project.id,
    );

  const recent =
    ctx.memory.recent(
      ctx.project.id,
      5,
    );

  const relevant =
    input.query
      ? ctx.retrieval.search(
          ctx.project.id,
          input.query,
          {
            topK:
              input.memoryLimit ?? 5,
          },
        )
      : [];

  return {
    project: {
      id:
        ctx.project.id,

      name:
        ctx.project.name,

      rootPath:
        ctx.project.rootPath,
    },

    architecture,

    recent,

    relevant:
      relevant.map(
        (item) =>
          item.memory,
      ),
  };
}
