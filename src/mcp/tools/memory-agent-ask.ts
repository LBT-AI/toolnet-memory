import { z } from 'zod';

import type { MCPContext } from '../context.js';

import { answerMemoryQuestion } from '../../work-continuity/memory-query.js';

import { askMemoryAgent } from '../../work-continuity/memory-agent.js';

export const memoryAgentAskSchema = {
  question: z
    .string()
    .min(2)
    .max(4000)
    .describe(
      'Question about previous project work, unfinished tasks, handoff, blockers, decisions, files or next actions.'
    ),

  mode: z
    .enum(['ai', 'local'])
    .optional()
    .describe(
      'ai uses ToolNet Memory Agent with configured LLM fallback chain. local returns deterministic local memory only.'
    ),
};

export interface MemoryAgentAskInput {
  question: string;

  mode?: 'ai' | 'local';
}

export async function memoryAgentAsk(ctx: MCPContext, input: MemoryAgentAskInput) {
  /*
   * Local mode:
   * deterministic and zero external AI calls.
   *
   * Useful for agents that only need direct state facts.
   */
  if (input.mode === 'local') {
    const result = answerMemoryQuestion(ctx.project, input.question);

    return {
      answer: result.answer,

      mode: 'local' as const,

      usedAi: false,

      source: result.source,

      intent: result.intent,
    };
  }

  /*
   * Default mode = AI.
   *
   * Memory Agent receives only selected ToolNet context,
   * never the raw full transcript.
   *
   * askMemoryAgent() already falls back to the local
   * deterministic answer if all AI providers fail.
   */
  const result = await askMemoryAgent(ctx.project, input.question);

  return {
    answer: result.answer,

    mode: 'ai' as const,

    usedAi: result.usedAi,

    provider: result.provider,

    model: result.model,
  };
}
