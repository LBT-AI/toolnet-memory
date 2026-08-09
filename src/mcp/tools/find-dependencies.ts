import { z } from 'zod';

import { DependencyAnalyzer } from '../../code-intelligence/analysis/dependency-analyzer.js';

import type { MCPContext } from '../context.js';

export const findDependenciesSchema = {
  filePath: z.string().min(1),

  direction: z.enum(['dependencies', 'dependents', 'both']).optional(),
};

export async function findDependencies(
  ctx: MCPContext,
  input: {
    filePath: string;

    direction?: 'dependencies' | 'dependents' | 'both';
  }
) {
  const analyzer = new DependencyAnalyzer(ctx.graph);

  const record = analyzer.analyze(ctx.project.id).find((item) => item.filePath === input.filePath);

  if (!record) {
    return {
      found: false,

      filePath: input.filePath,

      dependencies: [],
      dependents: [],
    };
  }

  const fileSymbols = ctx.graph
    .allSymbols(ctx.project.id)
    .filter((symbol) => symbol.type === 'file');

  const fileByPath = new Map(fileSymbols.map((symbol) => [symbol.filePath, symbol]));

  const formatFile = (filePath: string) => {
    const symbol = fileByPath.get(filePath);

    return {
      id: symbol?.id ?? filePath,

      filePath,
    };
  };

  const direction = input.direction ?? 'both';

  return {
    found: true,

    filePath: record.filePath,

    outgoingEdges: record.outgoingEdges,

    incomingEdges: record.incomingEdges,

    dependencies: direction === 'dependents' ? [] : record.dependencies.map(formatFile),

    dependents: direction === 'dependencies' ? [] : record.dependents.map(formatFile),
  };
}
