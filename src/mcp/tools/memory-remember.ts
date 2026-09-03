import { z } from 'zod';

import type { MCPContext } from '../context.js';

import { invalidateServiceProject } from '../../service/client.js';
import { safeAppendAuditEvent } from '../../audit/log.js';

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
  const record = ctx.memory.remember({
    projectId: ctx.project.id,

    type: input.type,

    content: input.content,

    tags: input.tags,

    importance: input.importance,

    source: 'mcp',
  });

  if (ctx.memoryStore) {
    await ctx.memoryStore.save(ctx.project.id, ctx.memory.exportProject(ctx.project.id));
  }

  await safeAppendAuditEvent(ctx.project, {
    action: 'memory.save',
    outcome: 'success',
    actor: {
      kind: 'mcp',
      id: process.env.TOOLNET_AGENT_ID?.trim() || 'mcp',
    },
    details: {
      memoryId: record.id,
      type: record.type,
      importance: record.importance,
      source: 'mcp',
    },
  });

  void invalidateServiceProject(ctx.project);

  return record;
}
