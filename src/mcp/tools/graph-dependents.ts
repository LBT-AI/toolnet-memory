import { z } from 'zod';

import { GraphQueryEngine } from '../../code-intelligence/query/graph-query-engine.js';

import type { MCPContext } from '../context.js';

import { compactSymbol, resolveGraphSymbol } from './graph-query-utils.js';

export const graphDependentsSchema = {
  symbol: z.string().min(1),
};

export async function graphDependents(
  ctx: MCPContext,
  input: {
    symbol: string;
  }
) {
  const target = resolveGraphSymbol(ctx, input.symbol);

  if (!target) {
    return {
      found: false,

      query: input.symbol,

      dependents: [],
    };
  }

  const query = new GraphQueryEngine(ctx.graph);

  const dependents = query.dependents(ctx.project.id, target.id);

  return {
    found: true,

    symbol: compactSymbol(target),

    count: dependents.length,

    dependents: dependents.map(compactSymbol),
  };
}
