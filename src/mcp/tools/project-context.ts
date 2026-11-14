import { z } from 'zod';

import type { MCPContext } from '../context.js';
import { getArchitecture } from '../../code-intelligence/graph/architecture.js';

import { loadRelevantAdrContext } from '../adr.js';
import { getProfileConfig, type MCPProfile, compactResponse } from '../token-profiles.js';

export const projectContextSchema = {
  query: z.string().optional(),
  memoryLimit: z.number().int().min(1).max(20).optional(),

  /**
   * Phase 75 additive targeting inputs. When supplied, only accepted ADRs that
   * actually affect these paths/symbols are returned.
   */
  filePaths: z.array(z.string()).max(20).optional(),
  symbols: z.array(z.string()).max(20).optional(),

  /**
   * Token exposure profile: lean (minimal), standard (balanced), full (complete).
   * Lean profile reduces tokens by omitting raw traces, detailed metrics, and limiting arrays.
   */
  profile: z.enum(['lean', 'standard', 'full']).optional(),
};

export async function projectContext(
  ctx: MCPContext,
  input: {
    query?: string;
    memoryLimit?: number;
    filePaths?: string[];
    symbols?: string[];
    profile?: MCPProfile;
  }
) {
  const profileConfig = getProfileConfig(input.profile);

  const architecture = getArchitecture(ctx.graph, ctx.project.id);

  const recent = ctx.memory.recent(ctx.project.id, profileConfig.maxMemoryItems);

  const relevant = input.query
    ? ctx.retrieval.search(ctx.project.id, input.query, {
        topK: Math.min(
          input.memoryLimit ?? profileConfig.maxMemoryItems,
          profileConfig.maxMemoryItems
        ),
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

  let result = {
    project: {
      id: ctx.project.id,

      name: ctx.project.name,

      rootPath: ctx.project.rootPath,
    },

    architecture,

    recent,

    relevant: relevant.map((item) => item.memory),

    ...(architectureDecisions && architectureDecisions.length > 0
      ? { architectureDecisions: architectureDecisions.slice(0, profileConfig.maxDecisions) }
      : {}),
  };

  result = compactResponse(result, profileConfig);

  return result;
}
