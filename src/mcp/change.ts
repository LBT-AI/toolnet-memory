/*
 * Phase 80 — MCP change-intelligence plumbing.
 *
 * Gathers the read-only inputs from a hydrated project and runs the
 * deterministic change analysis through the shared facts builder, so standalone
 * and daemon results are equivalent.
 *
 * Analysis only: nothing here mutates the graph, Memory, Tasks, ADRs, runtime
 * trace state or artifacts.
 */

import { runChangeAnalysis } from '../code-intelligence/change/index.js';

import { buildProjectChangeFacts } from '../code-intelligence/change/project-facts.js';

import type {
  ChangeAnalysisRequest,
  ChangeIntelligenceReport,
} from '../code-intelligence/change/index.js';

import type { RuntimeObservation } from '../code-intelligence/runtime-trace/index.js';

import type { MCPContext } from './context.js';

import { loadFleetSnapshot, loadProjectGeneration } from './fleet.js';

import { loadRelevantAdrContext } from './adr.js';

import { ensureRuntimeTraceStore } from './runtime-trace.js';

export interface ChangeToolInput {
  mode: ChangeAnalysisRequest['mode'];
  base?: string;
  head?: string;
  patch?: string;
  claim?: ChangeAnalysisRequest['claim'];
  profile?: ChangeAnalysisRequest['profile'];
  includeCrossService?: boolean;
  includeFleet?: boolean;
  includeRuntimeEvidence?: boolean;
  depth?: number;
}

export async function runMcpChangeAnalysis(
  ctx: MCPContext,
  input: ChangeToolInput
): Promise<ChangeIntelligenceReport> {
  const generation = (await loadProjectGeneration(ctx)) ?? 'unknown';

  const includeRuntime = input.includeRuntimeEvidence ?? false;
  const includeFleet = input.includeFleet ?? false;

  let runtimeObservations: readonly RuntimeObservation[] = [];

  if (includeRuntime) {
    const store = await ensureRuntimeTraceStore(ctx);

    if (store) {
      try {
        runtimeObservations = await store.loadObservations(ctx.project.id);
      } catch {
        runtimeObservations = [];
      }
    }
  }

  const fleetSnapshot = includeFleet ? await loadFleetSnapshot(ctx, { persist: false }) : null;

  const facts = buildProjectChangeFacts({
    projectId: ctx.project.id,
    rootPath: ctx.project.rootPath,
    generation,
    graph: ctx.graph,
    coverage: ctx.coverage
      ? { available: true, evaluate: (capability) => ctx.coverage!.evaluate(capability) }
      : null,
    fleetSnapshot,
    crossServiceSnapshot: ctx.crossService ?? null,
    runtimeObservations,
    includeRuntime,
    includeFleet,
    adr: async (adrInput) => {
      const entries = await loadRelevantAdrContext(ctx, {
        filePaths: adrInput.filePaths,
        symbols: adrInput.symbols,
      });

      return (entries ?? []).map((entry) => ({
        id: entry.id,
        title: entry.title,
        status: entry.status,
      }));
    },
  });

  const request: ChangeAnalysisRequest = {
    projectId: ctx.project.id,
    mode: input.mode,
    ...(input.base !== undefined ? { base: input.base } : {}),
    ...(input.head !== undefined ? { head: input.head } : {}),
    ...(input.claim !== undefined ? { claim: input.claim } : {}),
    ...(input.profile !== undefined ? { profile: input.profile } : {}),
    includeCrossService: input.includeCrossService ?? true,
    includeFleet,
    includeRuntimeEvidence: includeRuntime,
  };

  return runChangeAnalysis(request, facts, {
    rootPath: ctx.project.rootPath,
    ...(input.patch !== undefined ? { patch: input.patch } : {}),
  });
}
