import { z } from 'zod';

import { DeadCodeAnalyzer } from '../../code-intelligence/analysis/dead-code-analyzer.js';

import type {
  DeadCodeCandidate,
  DeadCodeConfidence,
} from '../../code-intelligence/analysis/types.js';

import { attachToolCoverage, type ToolCoverageOutput } from '../coverage.js';

import type { MCPContext } from '../context.js';

export const deadCodeSchema = {
  confidence: z.enum(['high', 'medium', 'low', 'all']).optional(),

  filePath: z.string().min(1).optional(),

  limit: z.number().int().min(1).max(500).optional(),
};

const RANK: Record<DeadCodeConfidence, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export interface DeadCodeResult {
  total: number;

  high: number;

  medium: number;

  low: number;

  warning: string;

  candidates: DeadCodeCandidate[];

  coverage?: ToolCoverageOutput;
}

export async function deadCode(
  ctx: MCPContext,
  input: {
    confidence?: DeadCodeConfidence | 'all';

    filePath?: string;

    limit?: number;
  }
): Promise<DeadCodeResult> {
  const analyzer = new DeadCodeAnalyzer(ctx.graph);

  let result = analyzer.analyze(ctx.project.id);

  if (input.confidence && input.confidence !== 'all') {
    const minimum = RANK[input.confidence];

    result = result.filter((item) => RANK[item.confidence] >= minimum);
  }

  if (input.filePath) {
    result = result.filter((item) => item.filePath === input.filePath);
  }

  const total = result.length;

  const limit = input.limit ?? 100;

  /*
   * Dead code is a negative claim about usage edges (calls + imports).
   * Candidate trust requires structural coverage, and an empty candidate
   * set is only meaningful when the source is still fresh.
   */
  const coverage = await attachToolCoverage(ctx, {
    capability: 'call_graph',
    negative: total === 0,
  });

  return {
    total,

    high: result.filter((item) => item.confidence === 'high').length,

    medium: result.filter((item) => item.confidence === 'medium').length,

    low: result.filter((item) => item.confidence === 'low').length,

    warning: 'Dead-code results are candidates only. Verify before deleting code.',

    candidates: result.slice(0, limit),

    ...(coverage ? { coverage } : {}),
  };
}
