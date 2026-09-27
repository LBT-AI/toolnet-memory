/*
 * Phase 82 — test_run_status MCP tool.
 *
 * Read-only bounded status of the derived test-run evidence for this project:
 * the latest selection identity plus recent run summaries. It never returns raw
 * logs and never mutates anything.
 */

import { z } from 'zod';

import type { MCPContext } from '../context.js';

import { testRunStatus } from '../test-intelligence.js';

export const testRunStatusSchema = {
  limit: z.number().int().min(1).max(50).optional(),
};

export async function testRunStatusTool(ctx: MCPContext, input: { limit?: number } = {}) {
  return testRunStatus(ctx, input);
}
