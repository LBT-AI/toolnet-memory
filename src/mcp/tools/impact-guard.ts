import { z } from 'zod';

import type { MCPContext } from '../context.js';

import { ImpactGuard } from '../../code-intelligence/impact/impact-guard.js';

export const impactGuardSchema = {
  mode: z.enum(['git_diff', 'file']).optional(),

  filePath: z.string().optional(),

  depth: z.number().int().min(1).max(10).optional(),
};

export async function impactGuard(
  ctx: MCPContext,
  input: {
    mode?: 'git_diff' | 'file';

    filePath?: string;

    depth?: number;
  }
) {
  const guard = new ImpactGuard(ctx.graph);

  const mode = input.mode ?? (input.filePath ? 'file' : 'git_diff');

  if (mode === 'file') {
    if (!input.filePath) {
      throw new Error('filePath is required when mode=file');
    }

    return guard.analyzeFile(ctx.project.id, input.filePath, {
      maxDepth: input.depth,
    });
  }

  return guard.analyzeGitDiff(ctx.project.id, ctx.project.rootPath, {
    maxDepth: input.depth,
  });
}
