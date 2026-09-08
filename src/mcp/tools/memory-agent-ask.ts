import { z } from 'zod';

import type { MCPContext } from '../context.js';

import {
  planCompositeRetrieval,
  retrieveCompositeAnswer,
} from '../../work-continuity/composite-retrieval.js';
import {
  RETRIEVAL_INTENTS,
  type IntentAwareCodeHit,
  type IntentAwareRetrievalIntent,
} from '../../work-continuity/intent-aware-retrieval.js';
import {
  recordRetrievalTelemetry,
  recordRetrievalTelemetryError,
} from '../../work-continuity/retrieval-telemetry.js';
import {
  applyAdaptiveRetrievalRoute,
  loadAdaptiveRetrievalOverrides,
  recordRetrievalFeedback,
} from '../../work-continuity/retrieval-feedback.js';

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
  feedbackIntent: z
    .enum(RETRIEVAL_INTENTS)
    .optional()
    .describe(
      'Explicit correction for a single-intent retrieval. Feedback is stored locally as structural routing metadata only; question text is not persisted.'
    ),
};

export interface MemoryAgentAskInput {
  question: string;

  mode?: 'local';

  detail?: StructuredHandoffDetail;
  feedbackIntent?: IntentAwareRetrievalIntent;
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

export async function memoryAgentAsk(
  ctx: Pick<MCPContext, 'project' | 'storage' | 'codeSemantic'>,
  input: MemoryAgentAskInput
) {
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

  const searchCode = ctx.codeSemantic
    ? async (query: string, limit: number): Promise<IntentAwareCodeHit[]> =>
        (await ctx.codeSemantic!.search(query, limit)).map((hit) => ({
          filePath: hit.chunk.filePath,
          ...(hit.chunk.symbolName ? { symbolName: hit.chunk.symbolName } : {}),
          startLine: hit.chunk.startLine,
          endLine: hit.chunk.endLine,
          content: hit.chunk.content,
          score: hit.score,
        }))
    : undefined;

  const baselinePlan = planCompositeRetrieval(conversation.originalQuestion);
  const adaptive = loadAdaptiveRetrievalOverrides(ctx.project);
  const plan = planCompositeRetrieval(conversation.originalQuestion, {
    routeOverride: (route) => applyAdaptiveRetrievalRoute(route, adaptive),
  });
  const telemetryStarted = process.hrtime.bigint();
  let direct;
  try {
    direct = await retrieveCompositeAnswer(ctx.project, conversation.originalQuestion, {
      plan,
      ...(ctx.storage ? { storage: ctx.storage } : {}),
      ...(searchCode ? { searchCode } : {}),
    });
  } catch (error) {
    const durationMs = Number(process.hrtime.bigint() - telemetryStarted) / 1_000_000;
    recordRetrievalTelemetryError(ctx.project, plan, {
      surface: 'mcp',
      durationMs,
      error,
    });
    throw error;
  }
  const durationMs = Number(process.hrtime.bigint() - telemetryStarted) / 1_000_000;
  recordRetrievalTelemetry(ctx.project, direct, {
    surface: 'mcp',
    durationMs,
  });
  const retrievalFeedback = input.feedbackIntent
    ? recordRetrievalFeedback(ctx.project, baselinePlan, input.feedbackIntent, 'mcp')
    : undefined;

  const structured = structuredLocalHandoff(
    ctx,
    conversation.originalQuestion,
    direct.route.intent,
    direct.answer,
    input.detail
  );

  if ('handoff' in structured) {
    return {
      ...structured,

      mode: 'local' as const,

      usedAi: false,

      source: direct.source,

      intent: direct.route.intent,

      routing: 'deterministic-handoff' as const,

      retrievalRoute: direct.route,

      retrievalPlan: direct.plan,

      retrievalFragments: direct.fragments,

      retrievalConflicts: direct.conflicts,

      attemptedSources: direct.attemptedSources,

      adaptiveRules: adaptive.rules.length,

      ...(retrievalFeedback ? { retrievalFeedback } : {}),
    };
  }

  return {
    ...structured,

    mode: 'local' as const,

    usedAi: false,

    source: direct.source,

    intent: direct.route.intent,

    routing:
      direct.mode === 'composite' ? ('composite-intent-aware' as const) : ('intent-aware' as const),

    retrievalRoute: direct.route,

    retrievalPlan: direct.plan,

    retrievalFragments: direct.fragments,

    retrievalConflicts: direct.conflicts,

    attemptedSources: direct.attemptedSources,
  };
}
