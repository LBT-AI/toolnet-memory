import { z } from "zod";

import type { MCPContext } from "../context.js";

export const memorySearchSchema = {
  query: z.string(),
  limit: z.number().int().min(1).max(20).optional(),
};

export async function memorySearch(
  ctx: MCPContext,
  input: {
    query: string;
    limit?: number;
  },
) {
  const results =
    ctx.retrieval.search(
      ctx.project.id,
      input.query,
      {
        topK:
          input.limit ?? 8,
      },
    );

  return results.map(
    (result) => ({
      id:
        result.memory.id,

      type:
        result.memory.type,

      content:
        result.memory.content,

      importance:
        result.memory.importance,

      score:
        result.score,

      tags:
        result.memory.tags,
    }),
  );
}
