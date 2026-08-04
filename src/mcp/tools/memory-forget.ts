import {
  z,
} from "zod";

import type {
  MCPContext,
} from "../context.js";

export const memoryForgetSchema = {
  id:
    z.string().min(1),
};

export async function memoryForget(
  ctx: MCPContext,
  input: {
    id: string;
  },
) {
  const deleted =
    ctx.memory.delete(
      input.id,
    );

  if (
    deleted &&
    ctx.memoryStore
  ) {
    await ctx.memoryStore.save(
      ctx.project.id,
      ctx.memory.exportProject(
        ctx.project.id,
      ),
    );
  }

  return {
    deleted,
  };
}
