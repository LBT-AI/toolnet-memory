import { z } from "zod";

import type { MCPContext } from "../context.js";

export const searchCodeSchema = {
  query: z.string().min(1),
  limit: z.number().int().min(1).max(50).optional(),
};

export async function searchCode(
  ctx: MCPContext,
  input: {
    query: string;
    limit?: number;
  },
) {
  const q =
    input.query.toLowerCase();

  const limit =
    input.limit ?? 20;

  return ctx.graph
    .allSymbols(
      ctx.project.id,
    )
    .filter(
      (symbol) =>
        symbol.name
          .toLowerCase()
          .includes(q) ||
        symbol.qualifiedName
          ?.toLowerCase()
          .includes(q) ||
        symbol.filePath
          .toLowerCase()
          .includes(q),
    )
    .slice(
      0,
      limit,
    );
}
