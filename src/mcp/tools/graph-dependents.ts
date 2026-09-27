import { z } from 'zod';

import { GraphQueryEngine } from '../../code-intelligence/query/graph-query-engine.js';

import type { MCPContext } from '../context.js';

import { attachToolCoverage, type ToolCoverageOutput } from '../coverage.js';

import { compactSymbol, resolveGraphSymbol, type CompactSymbol } from './graph-query-utils.js';

export const graphDependentsSchema = {
  symbol: z.string().min(1),
};

export interface GraphDependentsResult {
  found: boolean;

  query?: string;

  symbol?: CompactSymbol;

  count?: number;

  dependents: CompactSymbol[];

  coverage?: ToolCoverageOutput;
}

export async function graphDependents(
  ctx: MCPContext,
  input: {
    symbol: string;
  }
): Promise<GraphDependentsResult> {
  const target = resolveGraphSymbol(ctx, input.symbol);

  if (!target) {
    const coverage = await attachToolCoverage(ctx, {
      capability: 'dependency_graph',
      negative: true,
    });

    return {
      found: false,

      query: input.symbol,

      dependents: [],

      ...(coverage ? { coverage } : {}),
    };
  }

  const query = new GraphQueryEngine(ctx.graph);

  const dependents = query.dependents(ctx.project.id, target.id);

  const coverage = await attachToolCoverage(ctx, {
    capability: 'dependency_graph',
    negative: dependents.length === 0,
  });

  return {
    found: true,

    symbol: compactSymbol(target),

    count: dependents.length,

    dependents: dependents.map(compactSymbol),

    ...(coverage ? { coverage } : {}),
  };
}
