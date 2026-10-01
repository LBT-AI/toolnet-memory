import { z } from 'zod';

import type { MCPContext } from '../context.js';

export const memorySearchSchema = {
  query: z.string(),
  limit: z.number().int().min(1).max(20).optional(),
  includeSuperseded: z.boolean().optional(),
  knowledgeClasses: z.array(z.string()).optional(),
};

export async function memorySearch(
  ctx: Pick<MCPContext, 'project' | 'retrieval'>,
  input: {
    query: string;
    limit?: number;
    includeSuperseded?: boolean;
    knowledgeClasses?: string[];
  }
) {
  const results = ctx.retrieval.search(ctx.project.id, input.query, {
    topK: input.limit ?? 8,

    includeSuperseded: input.includeSuperseded,

    knowledgeClasses: input.knowledgeClasses,
  });

  return results.map((result) => ({
    id: result.memory.id,

    type: result.memory.type,

    content: result.memory.content,

    importance: result.memory.importance,

    score: result.score,

    tags: result.memory.tags,

    knowledgeClass:
      typeof result.memory.metadata?.knowledgeClass === 'string'
        ? result.memory.metadata.knowledgeClass
        : undefined,

    superseded: Boolean(result.memory.metadata?.supersededBy),
  }));
}
