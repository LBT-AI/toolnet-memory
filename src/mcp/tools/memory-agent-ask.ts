import { z } from 'zod';

import type { MCPContext } from '../context.js';

import { answerRetrievedMemoryQuestion } from '../../work-continuity/memory-local-answer.js';

import {
  answerMemoryConversationFollowUp,
  prepareMemoryConversation,
} from '../../work-continuity/memory-conversation.js';

import {
  detectStructuredHandoffDetail,
  loadLatestStructuredHandoff,
  type StructuredHandoffDetail,
} from '../../work-continuity/structured-handoff.js';

import { shouldUseStructuredHandoff } from '../../work-continuity/structured-handoff-intent.js';

export const memoryAgentAskSchema = {
  question: z
    .string()
    .min(2)
    .max(4000)
    .describe(
      'Question about previous project work, unfinished tasks, handoff, blockers, decisions, files or next actions.'
    ),

  mode: z
    .enum(['local'])
    .optional()
    .describe('Returns deterministic local memory only. No external AI is used.'),

  detail: z
    .enum(['compact', 'normal', 'benchmark'])
    .optional()
    .describe(
      'Handoff detail level. compact=minimal, normal=standard, benchmark=deep evidence/files/tests for agent takeover.'
    ),
};

export interface MemoryAgentAskInput {
  question: string;

  mode?: 'local';

  detail?: StructuredHandoffDetail;
}

function structuredLocalHandoff(
  ctx: Pick<MCPContext, 'project'>,
  question: string,
  intent: string,
  fallbackAnswer: string,
  requestedDetail?: StructuredHandoffDetail
) {
  if (!shouldUseStructuredHandoff(question, intent)) {
    return {
      answer: fallbackAnswer,
    };
  }

  const detail = detectStructuredHandoffDetail(question, requestedDetail);

  const handoff = loadLatestStructuredHandoff(ctx.project, detail);

  if (!handoff) {
    return {
      answer: fallbackAnswer,
    };
  }

  return {
    answer: handoff.text,

    handoff: handoff.data,

    detail: handoff.detail,

    confidence: handoff.quality.confidence,

    missingContext: handoff.quality.missingContext,

    quality: handoff.quality,
  };
}

export async function memoryAgentAsk(ctx: Pick<MCPContext, 'project'>, input: MemoryAgentAskInput) {
  const conversation = prepareMemoryConversation(ctx.project, input.question);

  /*
   * All answering is deterministic and local.
   * No LLM / AI provider is involved.
   */
  const followUp = answerMemoryConversationFollowUp(conversation);

  if (followUp) {
    const structured = structuredLocalHandoff(
      ctx,
      conversation.originalQuestion,
      String(followUp.intent),
      followUp.answer,
      input.detail
    );

    return {
      ...structured,

      mode: 'local' as const,

      usedAi: false,

      source: followUp.source,

      intent: followUp.intent,
    };
  }

  const direct = answerRetrievedMemoryQuestion(ctx.project, conversation.originalQuestion);

  const structured = structuredLocalHandoff(
    ctx,
    conversation.originalQuestion,
    String(direct.intent),
    direct.answer,
    input.detail
  );

  if ('handoff' in structured) {
    return {
      ...structured,

      mode: 'local' as const,

      usedAi: false,

      source: direct.source,

      intent: direct.intent,

      routing: 'deterministic-handoff' as const,
    };
  }

  return {
    ...structured,

    mode: 'local' as const,

    usedAi: false,

    source: direct.source,

    intent: direct.intent,
  };
}
