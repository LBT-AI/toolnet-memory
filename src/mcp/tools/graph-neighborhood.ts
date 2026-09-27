import { z } from 'zod';

import { GraphQueryEngine } from '../../code-intelligence/query/graph-query-engine.js';

import type { MCPContext } from '../context.js';

import { attachToolCoverage, type ToolCoverageOutput } from '../coverage.js';

import { compactSymbol, resolveGraphSymbol, type CompactSymbol } from './graph-query-utils.js';

export const graphNeighborhoodSchema = {
  symbol: z.string().min(1),

  depth: z.number().int().min(1).max(5).optional(),

  limit: z.number().int().min(1).max(200).optional(),
};

export interface NeighborhoodNodeOutput {
  depth: number;

  via?: string;

  symbol: CompactSymbol;
}

export interface GraphNeighborhoodResult {
  found: boolean;

  query?: string;

  center?: CompactSymbol;

  incomingCount?: number;

  outgoingCount?: number;

  incoming: NeighborhoodNodeOutput[];

  outgoing: NeighborhoodNodeOutput[];

  coverage?: ToolCoverageOutput;
}

export async function graphNeighborhood(
  ctx: MCPContext,
  input: {
    symbol: string;
    depth?: number;
    limit?: number;
  }
): Promise<GraphNeighborhoodResult> {
  const symbol = resolveGraphSymbol(ctx, input.symbol);

  if (!symbol) {
    const coverage = await attachToolCoverage(ctx, {
      capability: 'dependency_graph',
      negative: true,
    });

    return {
      found: false,

      query: input.symbol,

      incoming: [],

      outgoing: [],

      ...(coverage ? { coverage } : {}),
    };
  }

  const query = new GraphQueryEngine(ctx.graph);

  const result = query.neighborhood(ctx.project.id, symbol.id, input.depth ?? 1);

  if (!result) {
    const coverage = await attachToolCoverage(ctx, {
      capability: 'dependency_graph',
      negative: true,
    });

    return {
      found: false,

      query: input.symbol,

      incoming: [],

      outgoing: [],

      ...(coverage ? { coverage } : {}),
    };
  }

  const limit = input.limit ?? 50;

  const coverage = await attachToolCoverage(ctx, {
    capability: 'dependency_graph',
    negative: result.incoming.length === 0 && result.outgoing.length === 0,
  });

  return {
    found: true,

    center: compactSymbol(result.center),

    incomingCount: result.incoming.length,

    outgoingCount: result.outgoing.length,

    incoming: result.incoming.slice(0, limit).map((item) => ({
      depth: item.depth,

      via: item.via?.type,

      symbol: compactSymbol(item.symbol),
    })),

    outgoing: result.outgoing.slice(0, limit).map((item) => ({
      depth: item.depth,

      via: item.via?.type,

      symbol: compactSymbol(item.symbol),
    })),

    ...(coverage ? { coverage } : {}),
  };
}
