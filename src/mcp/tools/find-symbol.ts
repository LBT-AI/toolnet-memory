import { z } from "zod";

import type { MCPContext } from "../context.js";

export const findSymbolSchema = {
  name: z.string().min(1),
};

export async function findSymbol(
  ctx: MCPContext,
  input: {
    name: string;
  },
) {
  return ctx.graph.findByName(
    ctx.project.id,
    input.name,
  );
}
