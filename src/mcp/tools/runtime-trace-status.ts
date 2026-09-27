/*
 * Phase 79 — runtime_trace_status MCP tool.
 *
 * Bounded, read-only status of the project's runtime trace evidence: session
 * counts, compatibility, observation count, storage usage and retention policy.
 *
 * No raw trace payload is ever returned, and `canEstablishAbsence` is always
 * false: not observing something at runtime is never proof that it does not
 * exist.
 */

import { z } from 'zod';

import {
  applyRuntimeTraceRetention,
  runtimeTraceStatus,
} from '../../code-intelligence/runtime-trace/index.js';

import type { RuntimeTraceStatus } from '../../code-intelligence/runtime-trace/index.js';

import type { MCPContext } from '../context.js';

import { ensureRuntimeTraceStore } from '../runtime-trace.js';

export const runtimeTraceStatusSchema = {
  prune: z
    .boolean()
    .optional()
    .describe('Apply bounded retention (session count, age, bytes) before reporting.'),
  maxAgeDays: z.number().int().min(0).max(3650).optional(),
  maxSessions: z.number().int().min(1).max(200).optional(),
  dryRun: z
    .boolean()
    .optional()
    .describe('With prune: report what would be removed, remove nothing.'),
};

export interface RuntimeTraceStatusInput {
  prune?: boolean;
  maxAgeDays?: number;
  maxSessions?: number;
  dryRun?: boolean;
}

export interface RuntimeTraceStatusResult extends RuntimeTraceStatus {
  pruned?: { removed: string[]; retained: number; dryRun: boolean };
  available: boolean;
}

export async function runtimeTraceStatusTool(
  ctx: MCPContext,
  input: RuntimeTraceStatusInput
): Promise<RuntimeTraceStatusResult> {
  const store = await ensureRuntimeTraceStore(ctx);

  if (!store) {
    return {
      available: false,
      sessions: 0,
      compatibleSessions: 0,
      staleSessions: 0,
      unknownSessions: 0,
      observations: 0,
      storedBytes: 0,
      retention: { maxSessions: 0, maxAgeDays: 0, maxObservations: 0 },
      adapters: [],
      canEstablishAbsence: false,
    };
  }

  let pruned: RuntimeTraceStatusResult['pruned'];

  if (input.prune === true) {
    const result = await applyRuntimeTraceRetention(store, ctx.project.id, {
      ...(input.maxAgeDays !== undefined ? { maxAgeDays: input.maxAgeDays } : {}),
      ...(input.maxSessions !== undefined ? { maxSessions: input.maxSessions } : {}),
      ...(input.dryRun !== undefined ? { dryRun: input.dryRun } : {}),
    });

    pruned = { removed: result.removed, retained: result.retained, dryRun: result.dryRun };
  }

  const status = await runtimeTraceStatus({
    store,
    projectId: ctx.project.id,
    ...(input.maxAgeDays !== undefined ? { maxAgeDays: input.maxAgeDays } : {}),
    ...(input.maxSessions !== undefined ? { maxSessions: input.maxSessions } : {}),
  });

  return {
    ...status,
    available: true,
    ...(pruned ? { pruned } : {}),
  };
}
