import { z } from 'zod';

import { GraphQueryEngine } from '../../code-intelligence/query/graph-query-engine.js';

import type { MCPContext } from '../context.js';

import { attachToolCoverage, type ToolCoverageOutput } from '../coverage.js';

import { compactSymbol, resolveGraphSymbol, type CompactSymbol } from './graph-query-utils.js';

export const findCallersSchema = {
  symbolId: z.string().min(1),
};

export interface FindCallersResult {
  found: boolean;

  query?: string;

  symbol?: CompactSymbol;

  count?: number;

  callers: CompactSymbol[];

  coverage?: ToolCoverageOutput;
}

export async function findCallers(
  ctx: MCPContext,
  input: {
    symbolId: string;
  }
): Promise<FindCallersResult> {
  const symbol = resolveGraphSymbol(ctx, input.symbolId);

  if (!symbol) {
    const coverage = await attachToolCoverage(ctx, {
      capability: 'call_graph',
      negative: true,
    });

    return {
      found: false,

      query: input.symbolId,

      callers: [],

      ...(coverage ? { coverage } : {}),
    };
  }

  const query = new GraphQueryEngine(ctx.graph);

  const callers = query.callers(ctx.project.id, symbol.id);

  const coverage = await attachToolCoverage(ctx, {
    capability: 'call_graph',
    negative: callers.length === 0,
  });

  return {
    found: true,

    symbol: compactSymbol(symbol),

    count: callers.length,

    callers: callers.map(compactSymbol),

    ...(coverage ? { coverage } : {}),
  };
}
