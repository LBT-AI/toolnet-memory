/*
 * Phase 78 — MCP evidence adapter.
 *
 * Builds the read-only `EvidenceFacts` surface from the hydrated MCP context and
 * runs the shared evidence executor. Phase 68 coverage stays the coverage
 * authority; Phase 75 ADRs are attached as constraints only and never influence
 * claim safety.
 */

import { semanticFingerprint } from '../code-intelligence/graph/graph-semantics.js';

import type { FreshnessCheckResult } from '../code-intelligence/graph-coverage/freshness-checker.js';

import {
  AdrStore,
  ArchitectureDecisionService,
  relevantDecisions,
} from '../knowledge/adr/index.js';

import {
  buildProjectEvidenceFacts,
  executeEvidence,
  planEvidence,
  type EvidenceAdrConstraint,
  type EvidenceBundle,
  type EvidenceRequest,
} from '../code-intelligence/evidence/index.js';

import type { MCPContext } from './context.js';

import { loadProjectGeneration } from './fleet.js';

import { loadEvidenceRuntimeFacts } from './runtime-trace.js';

export async function adrConstraintsFor(
  ctx: MCPContext,
  request: EvidenceRequest
): Promise<EvidenceAdrConstraint[]> {
  if (!ctx.storage) {
    return [];
  }

  const filePaths = new Set<string>(request.scope.paths ?? []);

  if (request.subject?.path) {
    filePaths.add(request.subject.path);
  }

  const symbolIds = new Set<string>(request.scope.symbolIds ?? []);

  if (request.subject?.symbolId) {
    symbolIds.add(request.subject.symbolId);
  }

  if (filePaths.size === 0 && symbolIds.size === 0) {
    return [];
  }

  try {
    const service = new ArchitectureDecisionService(new AdrStore(ctx.storage, ctx.project));

    await service.initialize();

    const entries = await relevantDecisions(service, {
      ...(filePaths.size > 0 ? { filePaths: [...filePaths] } : {}),
      ...(symbolIds.size > 0 ? { symbols: [...symbolIds] } : {}),
      limit: 5,
    });

    return entries.map((entry) => ({
      id: entry.id,
      title: entry.title,
      status: entry.status,
    }));
  } catch {
    /* ADR context is additive; a read failure must never fail an evidence run. */
    return [];
  }
}

function runtimeSubjectFor(request: EvidenceRequest): {
  symbolIds?: readonly string[];
  name?: string;
} {
  const symbolIds = new Set<string>(request.scope.symbolIds ?? []);

  if (request.subject?.symbolId) {
    symbolIds.add(request.subject.symbolId);
  }

  return {
    ...(symbolIds.size > 0 ? { symbolIds: [...symbolIds].sort() } : {}),
    ...(request.subject?.name ? { name: request.subject.name } : {}),
  };
}

export interface EvidenceRunOptions {
  /** Attach relevant accepted ADRs as constraints (never as proof). */
  includeAdr?: boolean;
}

export async function runEvidence(
  ctx: MCPContext,
  request: EvidenceRequest,
  options: EvidenceRunOptions = {}
): Promise<EvidenceBundle> {
  const plan = planEvidence(request);

  const generation = (await loadProjectGeneration(ctx)) ?? semanticFingerprint();

  /*
   * Phase 79 — runtime trace evidence.
   *
   * Loaded only when the caller asks for it, and attached as supporting
   * evidence only. It never enters coverage or requirements and can never make
   * a negative claim safe: absence of a runtime observation is not absence.
   */
  const runtime =
    request.options?.includeRuntimeTrace === true
      ? await loadEvidenceRuntimeFacts(ctx, runtimeSubjectFor(request))
      : null;

  const freshness: FreshnessCheckResult =
    ctx.coverage && plan.needFreshness
      ? await ctx.coverage.checkFreshness()
      : { checked: false, stale: false, added: [], modified: [], deleted: [] };

  const facts = buildProjectEvidenceFacts({
    projectId: ctx.project.id,
    rootPath: ctx.project.rootPath,
    generation,
    currentGeneration: () => generation,
    graph: ctx.graph,
    evaluator: ctx.coverage ?? null,
    freshness: { checked: freshness.checked, stale: freshness.stale },
    coverageFreshness: freshness,
    coverageSnapshot: ctx.coverage?.currentSnapshot ?? null,
    crossServiceSnapshot: ctx.crossService ?? null,
    fleetSnapshot: ctx.fleet ?? null,
    runtime,
  });

  const adrConstraints = options.includeAdr === false ? [] : await adrConstraintsFor(ctx, request);

  return executeEvidence({
    request: { ...request, adrConstraints },
    facts,
  });
}
