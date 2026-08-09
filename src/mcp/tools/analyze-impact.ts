import { z } from 'zod';

import type { MCPContext } from '../context.js';

import { ImpactAnalyzer } from '../../code-intelligence/impact/impact-analyzer.js';

export const analyzeImpactSchema = {
  symbolId: z.string().min(1),

  depth: z.number().int().min(1).max(10).optional(),
};

export async function analyzeImpact(
  ctx: MCPContext,
  input: {
    symbolId: string;
    depth?: number;
  }
) {
  const symbol = ctx.graph.getSymbol(input.symbolId);

  if (!symbol) {
    return {
      found: false,
      impacts: [],
    };
  }

  const analyzer = new ImpactAnalyzer(ctx.graph);

  const impacts = analyzer.analyze(ctx.project.id, symbol.id, input.depth ?? 4);

  return {
    found: true,

    target: {
      id: symbol.id,

      name: symbol.name,

      qualifiedName: symbol.qualifiedName,

      filePath: symbol.filePath,

      type: symbol.type,
    },

    impacts: impacts.map((item) => ({
      id: item.symbol.id,

      name: item.symbol.name,

      qualifiedName: item.symbol.qualifiedName,

      filePath: item.symbol.filePath,

      type: item.symbol.type,

      relation: item.relation,

      depth: item.depth,
    })),
  };
}
