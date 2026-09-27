/*
 * Phase 83 — MCP release-readiness plumbing.
 *
 * Bridges the MCP tool to the Phase 83 release runtime. The project root is
 * always the ToolNet project manifest root — the analysis is project-contained
 * and read-only. It never commits, tags, bumps a version or publishes.
 */

import {
  buildReleaseFacts,
  PHASE83_RELEASE_INTELLIGENCE,
  REQUIRED_RELEASE_PHASES,
  resolveReleaseLimits,
  runReleaseAnalysis,
} from '../code-intelligence/release/index.js';

import type {
  ReleaseReadinessReport,
  ReleaseReadinessRequest,
} from '../code-intelligence/release/index.js';

import type { MCPContext } from './context.js';

export interface ReleaseReadinessMcpInput {
  operation?: ReleaseReadinessRequest['operation'];
  evidenceProfile?: ReleaseReadinessRequest['evidenceProfile'];
  baselineRef?: string;
  /**
   * Phase 83 analysis is read-only; the optional controlled rebuild used for
   * reproducibility is disabled by default so a status call never builds.
   */
  rebuild?: boolean;
}

export async function releaseReadiness(
  ctx: MCPContext,
  input: ReleaseReadinessMcpInput = {}
): Promise<ReleaseReadinessReport> {
  /* Keeps the layer's certification identity inside every packaged runtime
   * that ships the release tool. */
  void PHASE83_RELEASE_INTELLIGENCE;

  const request: ReleaseReadinessRequest = {
    ...(input.operation ? { operation: input.operation } : {}),
    ...(input.evidenceProfile ? { evidenceProfile: input.evidenceProfile } : {}),
    ...(input.baselineRef !== undefined ? { baselineRef: input.baselineRef } : {}),
  };

  const limits = resolveReleaseLimits(request.limits);

  const facts = buildReleaseFacts({
    projectRoot: ctx.project.rootPath,
    profile: request.evidenceProfile ?? 'auditor',
    requiredPhases: REQUIRED_RELEASE_PHASES,
    maxCapabilities: limits.maxCapabilities,
    maxBundleReadBytes: limits.maxBundleReadBytes,
    maxPackageJsonBytes: limits.maxPackageJsonBytes,
    maxWorktreeFiles: limits.maxWorktreeFiles,
  });

  return runReleaseAnalysis({
    facts,
    request,
    rebuild: input.rebuild ?? false,
  });
}
