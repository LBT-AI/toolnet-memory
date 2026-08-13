import { z } from 'zod';

import type { MCPContext } from '../context.js';

import { readContextOffloadAsset } from '../../memory/context-offload.js';

export const contextOffloadReadSchema = {
  assetId: z
    .string()
    .regex(/^[a-f0-9]{8,64}$/iu)
    .describe('Asset reference from the ToolNet Context Offload Graph.'),

  maxChars: z
    .number()
    .int()
    .min(200)
    .max(20_000)
    .optional()
    .describe('Maximum asset characters to return. Defaults to 6000.'),
};

export interface ContextOffloadReadInput {
  assetId: string;
  maxChars?: number;
}

export async function contextOffloadRead(ctx: MCPContext, input: ContextOffloadReadInput) {
  return readContextOffloadAsset(ctx.project.rootPath, input.assetId, input.maxChars ?? 6000);
}
