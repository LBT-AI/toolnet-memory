import {
  z,
} from "zod";

import {
  GraphQueryEngine,
} from "../../code-intelligence/query/graph-query-engine.js";

import type {
  MCPContext,
} from "../context.js";

import {
  compactSymbol,
  resolveGraphSymbol,
} from "./graph-query-utils.js";

export const graphNeighborhoodSchema = {
  symbol:
    z.string().min(1),

  depth:
    z.number()
      .int()
      .min(1)
      .max(5)
      .optional(),

  limit:
    z.number()
      .int()
      .min(1)
      .max(200)
      .optional(),
};

export async function graphNeighborhood(
  ctx: MCPContext,
  input: {
    symbol: string;
    depth?: number;
    limit?: number;
  },
) {
  const symbol =
    resolveGraphSymbol(
      ctx,
      input.symbol,
    );

  if (!symbol) {
    return {
      found:
        false,

      query:
        input.symbol,
    };
  }

  const query =
    new GraphQueryEngine(
      ctx.graph,
    );

  const result =
    query.neighborhood(
      ctx.project.id,
      symbol.id,
      input.depth ??
        1,
    );

  if (!result) {
    return {
      found:
        false,

      query:
        input.symbol,
    };
  }

  const limit =
    input.limit ??
    50;

  return {
    found:
      true,

    center:
      compactSymbol(
        result.center,
      ),

    incomingCount:
      result.incoming.length,

    outgoingCount:
      result.outgoing.length,

    incoming:
      result.incoming
        .slice(
          0,
          limit,
        )
        .map(
          (item) => ({
            depth:
              item.depth,

            via:
              item.via
                ?.type,

            symbol:
              compactSymbol(
                item.symbol,
              ),
          }),
        ),

    outgoing:
      result.outgoing
        .slice(
          0,
          limit,
        )
        .map(
          (item) => ({
            depth:
              item.depth,

            via:
              item.via
                ?.type,

            symbol:
              compactSymbol(
                item.symbol,
              ),
          }),
        ),
  };
}
