/*
 * Phase 83 — release_readiness MCP tool.
 *
 * Read-only deterministic release analysis for the ToolNet project: source vs
 * packaged capability parity, version/manifest truth, public-surface
 * compatibility, package contents and structured readiness. It never commits,
 * pushes, tags, bumps a version or publishes, and never returns
 * safeToPublish/safeToMerge.
 */

import { z } from 'zod';

import type { MCPContext } from '../context.js';

import { releaseReadiness } from '../release.js';

export const releaseReadinessSchema = {
  operation: z.enum(['status', 'analyze', 'manifest', 'notes']).optional(),
  evidenceProfile: z.enum(['scout', 'verify', 'auditor']).optional(),
  baselineRef: z
    .string()
    .regex(/^[A-Za-z0-9_][A-Za-z0-9_./@{}~^:-]{0,199}$/u)
    .optional(),
  rebuild: z.boolean().optional(),
};

export async function releaseReadinessTool(ctx: MCPContext, input: unknown) {
  const parsed = input as {
    operation?: 'status' | 'analyze' | 'manifest' | 'notes';
    evidenceProfile?: 'scout' | 'verify' | 'auditor';
    baselineRef?: string;
    rebuild?: boolean;
  };

  return releaseReadiness(ctx, {
    ...(parsed.operation ? { operation: parsed.operation } : {}),
    ...(parsed.evidenceProfile ? { evidenceProfile: parsed.evidenceProfile } : {}),
    ...(parsed.baselineRef !== undefined ? { baselineRef: parsed.baselineRef } : {}),
    ...(parsed.rebuild !== undefined ? { rebuild: parsed.rebuild } : {}),
  });
}
