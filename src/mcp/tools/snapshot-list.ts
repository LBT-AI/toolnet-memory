import type { MCPContext } from '../context.js';

import { SnapshotManager } from '../../snapshot/index.js';

export async function snapshotList(ctx: MCPContext) {
  if (!ctx.storage) {
    throw new Error('Storage unavailable');
  }

  return new SnapshotManager(ctx.storage).list(ctx.project.id);
}
