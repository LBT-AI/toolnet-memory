import { z } from 'zod';

import { GraphQueryEngine } from '../../code-intelligence/query/graph-query-engine.js';

import type { MCPContext } from '../context.js';

import { compactSymbol, resolveGraphSymbol } from './graph-query-utils.js';

export const graphPathSchema = {
  from: z.string().min(1),

  to: z.string().min(1),

  maxDepth: z.number().int().min(1).max(30).optional(),
};

export async function graphPath(
  ctx: MCPContext,
  input: {
    from: string;
    to: string;
    maxDepth?: number;
  }
) {
  const from = resolveGraphSymbol(ctx, input.from);

  const to = resolveGraphSymbol(ctx, input.to);

  if (!from || !to) {
    return {
      found: false,

      fromFound: Boolean(from),

      toFound: Boolean(to),

      path: [],
      edges: [],
    };
  }

  const query = new GraphQueryEngine(ctx.graph);

  const result = query.shortestPath(ctx.project.id, from.id, to.id, input.maxDepth ?? 12);

  return {
    found: result.found,

    distance: result.distance,

    from: compactSymbol(from),

    to: compactSymbol(to),

    path: result.symbols.map(compactSymbol),

    edges: result.edges.map((edge) => ({
      id: edge.id,

      type: edge.type,

      from: edge.from,

      to: edge.to,

      metadata: edge.metadata,
    })),
  };
}
