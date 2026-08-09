import { z } from 'zod';

import type { MCPContext } from '../context.js';

import { SnapshotManager } from '../../snapshot/index.js';

export const snapshotCreateSchema = {
  reason: z.string().optional(),
};

export async function snapshotCreate(
  ctx: MCPContext,
  input: {
    reason?: string;
  }
) {
  if (!ctx.storage) {
    throw new Error('Storage unavailable');
  }

  return new SnapshotManager(ctx.storage).create(ctx.project.id, input.reason ?? 'manual-mcp');
}
