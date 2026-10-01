import { z } from 'zod';

import type { MCPContext } from '../context.js';

import { invalidateServiceProject } from '../../service/client.js';
import { safeAppendAuditEvent } from '../../audit/log.js';
import {
  evaluateMemoryPolicy,
  loadCanonicalPromotionPolicy,
} from '../../memory/promotion-policy.js';
import type { LearnedMemoryKind } from '../../session/learner/types.js';

/**
 * Public memory_save types are a small, stable subset of the durable knowledge
 * taxonomy. Each one maps onto exactly one policy kind so explicit saves and
 * auto-capture share one authority.
 */
const KIND_BY_TYPE: Record<
  'activity' | 'decision' | 'rule' | 'todo' | 'summary',
  LearnedMemoryKind
> = {
  rule: 'rule',
  decision: 'decision',
  todo: 'todo',
  summary: 'handoff',
  activity: 'context',
};

export const memoryRememberSchema = {
  type: z.enum(['activity', 'decision', 'rule', 'todo', 'summary']),

  content: z.string().min(1),

  tags: z.array(z.string()).optional(),

  importance: z.enum(['critical', 'high', 'normal', 'temporary']).optional(),
};

export async function memoryRemember(
  ctx: MCPContext,
  input: {
    type: 'activity' | 'decision' | 'rule' | 'todo' | 'summary';

    content: string;

    tags?: string[];

    importance?: 'critical' | 'high' | 'normal' | 'temporary';
  }
) {
  const actor = process.env.TOOLNET_AGENT_ID?.trim() || 'mcp';

  /*
   * Explicit save keeps its own authority path: it is not rejected by the
   * auto-importance threshold or a low confidence, but it still must pass
   * secret safety, scope and size limits. A secret is never persisted, and
   * this gate runs BEFORE the memory engine sees the content.
   */
  const evaluation = evaluateMemoryPolicy(
    {
      kind: KIND_BY_TYPE[input.type],

      importance: input.importance ?? 'normal',

      confidence: 1,

      content: input.content,

      evidence: {
        userExplicit: true,

        sourceVerified: false,

        testVerified: false,

        crossSessionConfirmations: 1,

        assistantDerived: false,
      },
    },

    loadCanonicalPromotionPolicy(),

    { explicit: true, content: input.content }
  );

  if (!evaluation.persist) {
    await safeAppendAuditEvent(ctx.project, {
      action: 'memory.save',
      outcome: 'blocked',
      actor: { kind: 'mcp', id: actor },
      details: {
        reasonCode: evaluation.reasonCode,
        knowledgeType: evaluation.knowledgeType,
        policyVersion: evaluation.policyVersion,
        source: 'mcp',
      },
    });

    return {
      accepted: false as const,

      reasonCode: evaluation.reasonCode,

      knowledgeType: evaluation.knowledgeType,

      policyVersion: evaluation.policyVersion,
    };
  }

  const record = ctx.memory.remember({
    projectId: ctx.project.id,

    type: input.type,

    content: input.content,

    tags: input.tags,

    importance: input.importance,

    source: 'mcp',

    metadata: {
      knowledgeType: evaluation.knowledgeType,

      knowledgeClass: evaluation.knowledgeClass,

      policyReason: evaluation.reasonCode,

      policyVersion: evaluation.policyVersion,
    },
  });

  if (ctx.memoryStore) {
    await ctx.memoryStore.save(ctx.project.id, ctx.memory.exportProject(ctx.project.id));
  }

  await safeAppendAuditEvent(ctx.project, {
    action: 'memory.save',
    outcome: 'success',
    actor: {
      kind: 'mcp',
      id: actor,
    },
    details: {
      memoryId: record.id,
      type: record.type,
      importance: record.importance,
      knowledgeType: evaluation.knowledgeType,
      reasonCode: evaluation.reasonCode,
      source: 'mcp',
    },
  });

  void invalidateServiceProject(ctx.project);

  return record;
}
