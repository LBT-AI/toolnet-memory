import { z } from 'zod';

import { GraphQueryEngine } from '../../code-intelligence/query/graph-query-engine.js';

import type { MCPContext } from '../context.js';

import { attachToolCoverage, type ToolCoverageOutput } from '../coverage.js';

import { compactSymbol, resolveGraphSymbol, type CompactSymbol } from './graph-query-utils.js';

export const graphPathSchema = {
  from: z.string().min(1),

  to: z.string().min(1),

  maxDepth: z.number().int().min(1).max(30).optional(),
};

export interface PathEdgeOutput {
  id: string;

  type: string;

  from: string;

  to: string;

  metadata?: Record<string, unknown>;
}

export interface GraphPathResult {
  found: boolean;

  fromFound?: boolean;

  toFound?: boolean;

  distance?: number;

  from?: CompactSymbol;

  to?: CompactSymbol;

  path: CompactSymbol[];

  edges: PathEdgeOutput[];

  coverage?: ToolCoverageOutput;
}

export async function graphPath(
  ctx: MCPContext,
  input: {
    from: string;
    to: string;
    maxDepth?: number;
  }
): Promise<GraphPathResult> {
  const from = resolveGraphSymbol(ctx, input.from);

  const to = resolveGraphSymbol(ctx, input.to);

  if (!from || !to) {
    const coverage = await attachToolCoverage(ctx, {
      capability: 'dependency_graph',
      negative: true,
    });

    return {
      found: false,

      fromFound: Boolean(from),

      toFound: Boolean(to),

      path: [],
      edges: [],

      ...(coverage ? { coverage } : {}),
    };
  }

  const query = new GraphQueryEngine(ctx.graph);

  const result = query.shortestPath(ctx.project.id, from.id, to.id, input.maxDepth ?? 12);

  const coverage = await attachToolCoverage(ctx, {
    capability: 'dependency_graph',
    negative: !result.found,
  });

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

    ...(coverage ? { coverage } : {}),
  };
}
