import {
  z,
} from "zod";

import type {
  MCPContext,
} from "../context.js";

import {
  CallGraphTracer,
} from "../../code-intelligence/graph/trace.js";

export const traceCallsSchema = {
  symbolId:
    z.string().min(1),

  direction:
    z.enum([
      "callers",
      "callees",
    ])
      .optional(),

  depth:
    z.number()
      .int()
      .min(1)
      .max(10)
      .optional(),
};

export async function traceCalls(
  ctx: MCPContext,
  input: {
    symbolId: string;

    direction?:
      | "callers"
      | "callees";

    depth?: number;
  },
) {
  const tracer =
    new CallGraphTracer(
      ctx.graph,
    );

  const direction =
    input.direction ??
    "callees";

  const depth =
    input.depth ?? 3;

  const results =
    direction === "callers"
      ? tracer.callers(
          ctx.project.id,
          input.symbolId,
          depth,
        )
      : tracer.callees(
          ctx.project.id,
          input.symbolId,
          depth,
        );

  return {
    direction,
    depth,

    results:
      results.map(
        (item) => ({
          id:
            item.symbol.id,

          name:
            item.symbol.name,

          qualifiedName:
            item.symbol
              .qualifiedName,

          type:
            item.symbol.type,

          filePath:
            item.symbol.filePath,

          depth:
            item.depth,
        }),
      ),
  };
}
