import { z } from 'zod';

import type { MCPContext } from '../context.js';

import { CallGraphTracer } from '../../code-intelligence/graph/trace.js';

import { attachToolCoverage, type ToolCoverageOutput } from '../coverage.js';

export const traceCallsSchema = {
  symbolId: z.string().min(1),

  direction: z.enum(['callers', 'callees']).optional(),

  depth: z.number().int().min(1).max(10).optional(),
};

export interface TraceCallResultItem {
  id: string;

  name: string;

  qualifiedName?: string;

  type: string;

  filePath: string;

  depth: number;
}

export interface TraceCallsResult {
  direction: 'callers' | 'callees';

  depth: number;

  results: TraceCallResultItem[];

  coverage?: ToolCoverageOutput;
}

export async function traceCalls(
  ctx: MCPContext,
  input: {
    symbolId: string;

    direction?: 'callers' | 'callees';

    depth?: number;
  }
): Promise<TraceCallsResult> {
  const tracer = new CallGraphTracer(ctx.graph);

  const direction = input.direction ?? 'callees';

  const depth = input.depth ?? 3;

  const results =
    direction === 'callers'
      ? tracer.callers(ctx.project.id, input.symbolId, depth)
      : tracer.callees(ctx.project.id, input.symbolId, depth);

  const coverage = await attachToolCoverage(ctx, {
    capability: 'call_graph',
    negative: results.length === 0,
  });

  return {
    direction,
    depth,

    results: results.map((item) => ({
      id: item.symbol.id,

      name: item.symbol.name,

      qualifiedName: item.symbol.qualifiedName,

      type: item.symbol.type,

      filePath: item.symbol.filePath,

      depth: item.depth,
    })),

    ...(coverage ? { coverage } : {}),
  };
}
