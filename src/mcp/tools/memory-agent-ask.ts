import { z } from 'zod';

import type { MCPContext } from '../context.js';

import { answerRetrievedMemoryQuestion } from '../../work-continuity/memory-local-answer.js';

import { askMemoryAgent } from '../../work-continuity/memory-agent.js';

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
    .enum(['ai', 'local'])
    .optional()
    .describe(
      'ai uses ToolNet Memory Agent with configured LLM fallback chain. local returns deterministic local memory only.'
    ),

  detail: z
    .enum(['compact', 'normal', 'benchmark'])
    .optional()
    .describe(
      'Handoff detail level. compact=minimal, normal=standard, benchmark=deep evidence/files/tests for agent takeover.'
    ),
};

export interface MemoryAgentAskInput {
  question: string;

  mode?: 'ai' | 'local';

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
   * Local mode:
   * deterministic, canonical and zero external AI calls.
   */
  if (input.mode === 'local') {
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

    /*
     * Direct deterministic questions must use only
     * original user text for intent detection.
     */
    const result = answerRetrievedMemoryQuestion(ctx.project, conversation.originalQuestion);

    const structured = structuredLocalHandoff(
      ctx,
      conversation.originalQuestion,
      String(result.intent),
      result.answer,
      input.detail
    );

    return {
      ...structured,

      mode: 'local' as const,

      usedAi: false,

      source: result.source,

      intent: result.intent,
    };
  }

  /*
   * Structured continuity/takeover questions must prefer
   * canonical deterministic handoff before invoking AI.
   *
   * Benefits:
   * - no LLM paraphrase can drop evidence/files/next action
   * - zero external AI cost for handoff retrieval
   * - same result across Codex/Agy/Kiro/OpenCode/etc.
   */
  const direct = answerRetrievedMemoryQuestion(ctx.project, conversation.originalQuestion);

  const deterministicHandoff = structuredLocalHandoff(
    ctx,
    conversation.originalQuestion,
    String(direct.intent),
    direct.answer,
    input.detail
  );

  if ('handoff' in deterministicHandoff) {
    return {
      ...deterministicHandoff,

      mode: 'ai' as const,

      usedAi: false,

      source: direct.source,

      intent: direct.intent,

      routing: 'deterministic-handoff' as const,
    };
  }

  /*
   * Ordinary memory questions can still use Memory Agent AI.
   *
   * Memory Agent receives selected ToolNet context,
   * never the raw full transcript.
   */
  const result = await askMemoryAgent(ctx.project, conversation.question);

  if (!result.usedAi) {
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

        mode: 'ai' as const,

        usedAi: false,

        provider: result.provider,

        model: result.model,
      };
    }
  }

  return {
    answer: result.answer,

    mode: 'ai' as const,

    usedAi: result.usedAi,

    provider: result.provider,

    model: result.model,
  };
}
