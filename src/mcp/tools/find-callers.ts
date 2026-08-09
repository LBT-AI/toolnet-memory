import { z } from 'zod';

import { GraphQueryEngine } from '../../code-intelligence/query/graph-query-engine.js';

import type { MCPContext } from '../context.js';

import { compactSymbol, resolveGraphSymbol } from './graph-query-utils.js';

export const findCallersSchema = {
  symbolId: z.string().min(1),
};

export async function findCallers(
  ctx: MCPContext,
  input: {
    symbolId: string;
  }
) {
  const symbol = resolveGraphSymbol(ctx, input.symbolId);

  if (!symbol) {
    return {
      found: false,

      query: input.symbolId,

      callers: [],
    };
  }

  const query = new GraphQueryEngine(ctx.graph);

  const callers = query.callers(ctx.project.id, symbol.id);

  return {
    found: true,

    symbol: compactSymbol(symbol),

    count: callers.length,

    callers: callers.map(compactSymbol),
  };
}
