import { z } from 'zod';

import type { MCPContext } from '../context.js';
import { getArchitecture } from '../../code-intelligence/graph/architecture.js';

import { loadRelevantAdrContext } from '../adr.js';

export const projectContextSchema = {
  query: z.string().optional(),
  memoryLimit: z.number().int().min(1).max(20).optional(),

  /**
   * Phase 75 additive targeting inputs. When supplied, only accepted ADRs that
   * actually affect these paths/symbols are returned.
   */
  filePaths: z.array(z.string()).max(20).optional(),
  symbols: z.array(z.string()).max(20).optional(),
};

export async function projectContext(
  ctx: MCPContext,
  input: {
    query?: string;
    memoryLimit?: number;
    filePaths?: string[];
    symbols?: string[];
  }
) {
  const architecture = getArchitecture(ctx.graph, ctx.project.id);

  const recent = ctx.memory.recent(ctx.project.id, 5);

  const relevant = input.query
    ? ctx.retrieval.search(ctx.project.id, input.query, {
        topK: input.memoryLimit ?? 5,
      })
    : [];

  /*
   * Phase 75: bounded, accepted-only architecture decisions relevant to the
   * targeted files/symbols. Additive field; omitted when nothing is targeted.
   */
  const targets = (input.filePaths?.length ?? 0) + (input.symbols?.length ?? 0);

  const architectureDecisions = targets
    ? await loadRelevantAdrContext(ctx, {
        filePaths: input.filePaths,
        symbols: input.symbols,
      })
    : undefined;

  return {
    project: {
      id: ctx.project.id,

      name: ctx.project.name,

      rootPath: ctx.project.rootPath,
    },

    architecture,

    recent,

    relevant: relevant.map((item) => item.memory),

    ...(architectureDecisions && architectureDecisions.length > 0 ? { architectureDecisions } : {}),
  };
}
