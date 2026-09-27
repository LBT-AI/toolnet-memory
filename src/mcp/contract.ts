/*
 * Phase 81 — MCP contract-intelligence plumbing.
 *
 * Consumes the Phase 80 change report (never a second change parse) and runs
 * the deterministic contract analysis through the shared facts builder, so
 * standalone and daemon results are equivalent.
 *
 * Analysis only: nothing here mutates the graph, Memory, Tasks, ADRs, runtime
 * trace state or artifacts, and no remote $ref is ever fetched.
 */

import { analyzeContracts } from '../code-intelligence/contract/index.js';

import { buildProjectContractFacts } from '../code-intelligence/contract/project-facts.js';

import type { ChangeIntelligenceReport } from '../code-intelligence/change/index.js';

import type {
  ContractAnalysisRequest,
  ContractIntelligenceReport,
} from '../code-intelligence/contract/index.js';

import type { RuntimeObservation } from '../code-intelligence/runtime-trace/index.js';

import type { MCPContext } from './context.js';

import { loadFleetSnapshot, loadProjectGeneration } from './fleet.js';

import { loadRelevantAdrContext } from './adr.js';

import { ensureRuntimeTraceStore } from './runtime-trace.js';

export interface ContractToolInput {
  claim?: ContractAnalysisRequest['claim'];
  profile?: ContractAnalysisRequest['profile'];
  includeCrossService?: boolean;
  includeFleet?: boolean;
  includeRuntimeEvidence?: boolean;
}

export async function runMcpContractAnalysis(
  ctx: MCPContext,
  change: ChangeIntelligenceReport,
  input: ContractToolInput
): Promise<ContractIntelligenceReport> {
  const generation = change.generations.baseline ?? (await loadProjectGeneration(ctx)) ?? 'unknown';

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

  const request: ContractAnalysisRequest = {
    projectId: ctx.project.id,
    ...(input.claim !== undefined ? { claim: input.claim } : {}),
    ...(input.profile !== undefined ? { profile: input.profile } : {}),
    includeCrossService: input.includeCrossService ?? true,
    includeFleet,
    includeRuntimeEvidence: includeRuntime,
  };

  const facts = buildProjectContractFacts({
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
    changedFiles: change.change.files.map((file) => ({ path: file.path, kind: file.kind })),
    baseRevision: change.change.base ?? 'HEAD',
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

  return analyzeContracts({ request, facts });
}
