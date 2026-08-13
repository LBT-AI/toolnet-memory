import { z } from 'zod';

import type { MCPContext } from '../context.js';

import { searchSkillMemory } from '../../memory/skill-memory.js';

export const skillMemorySearchSchema = {
  query: z
    .string()
    .min(2)
    .max(500)
    .describe(
      'Task, problem, file, command or workflow to match against successful reusable Skill Memory SOPs.'
    ),

  limit: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .describe('Maximum matching reusable SOPs to return. Default 5.'),
};

export interface SkillMemorySearchInput {
  query: string;

  limit?: number;
}

export async function skillMemorySearch(
  ctx: Pick<MCPContext, 'project'>,
  input: SkillMemorySearchInput
) {
  const matches = searchSkillMemory(ctx.project, input.query, input.limit ?? 5);

  return {
    schema: 'toolnet.skill-memory-search.v1',

    query: input.query,

    count: matches.length,

    matches,
  };
}
