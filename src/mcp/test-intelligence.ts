/*
 * Phase 82 — MCP test-intelligence plumbing.
 *
 * Selection is read-only and reuses the Phase 80 change report and the Phase 81
 * contract report (never a second change parse). Execution is explicit only and
 * runs a selection the caller previously obtained through `select_tests`.
 *
 * A module-scoped bounded store holds derived selections/runs for this process.
 * It is derived state: nothing here mutates the graph, Memory, Tasks, ADRs,
 * runtime traces or an artifact.
 */

import {
  buildTestSelection,
  buildTestVerification,
} from '../code-intelligence/test-intelligence/index.js';

import { resolveTestLimits } from '../code-intelligence/test-intelligence/limits.js';

import { runSelectedTests } from '../code-intelligence/test-intelligence/execution.js';

import { buildProjectTestFacts } from '../code-intelligence/test-intelligence/project-facts.js';

import { TestIntelligenceStore } from '../code-intelligence/test-intelligence/store.js';

import type {
  RunSelectedTestsRequest,
  TestSelection,
  TestSelectionRequest,
  TestVerificationReport,
} from '../code-intelligence/test-intelligence/index.js';

import type { ChangeIntelligenceReport } from '../code-intelligence/change/index.js';

import type { ContractIntelligenceReport } from '../code-intelligence/contract/index.js';

import type { RuntimeObservation } from '../code-intelligence/runtime-trace/index.js';

import type { MCPContext } from './context.js';

import { loadFleetSnapshot, loadProjectGeneration } from './fleet.js';

import { loadRelevantAdrContext } from './adr.js';

import { ensureRuntimeTraceStore } from './runtime-trace.js';

const processStore = new TestIntelligenceStore(resolveTestLimits().maxRetainedRuns);

export function testIntelligenceStore(): TestIntelligenceStore {
  return processStore;
}

export interface TestSelectionToolInput {
  claim?: TestSelectionRequest['claim'];
  profile?: TestSelectionRequest['profile'];
  includeFleet?: boolean;
  includeRuntimeEvidence?: boolean;
}

export interface SelectTestsMcpInput extends TestSelectionToolInput {
  change: ChangeIntelligenceReport;
  contract?: ContractIntelligenceReport;
}

export async function runMcpTestSelection(
  ctx: MCPContext,
  input: SelectTestsMcpInput
): Promise<{ selection: TestSelection; verification: TestVerificationReport }> {
  const generation =
    input.change.generations.baseline ?? (await loadProjectGeneration(ctx)) ?? 'unknown';

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

  const facts = buildProjectTestFacts({
    projectId: ctx.project.id,
    rootPath: ctx.project.rootPath,
    generation,
    graph: ctx.graph,
    coverage: ctx.coverage
      ? { available: true, evaluate: (capability) => ctx.coverage!.evaluate(capability) }
      : null,
    fleetSnapshot,
    runtimeObservations,
    change: input.change,
    contract: input.contract ?? null,
    includeRuntime,
    includeFleet,
    /* Relevant accepted ADRs are attached as architectural constraints. */
    adrConstraints: input.change.adrConstraints.map((entry) => ({
      id: entry.id,
      title: entry.title,
      status: entry.status,
    })),
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

  const request: TestSelectionRequest = {
    projectId: ctx.project.id,
    ...(input.claim !== undefined ? { claim: input.claim } : {}),
    ...(input.profile !== undefined ? { profile: input.profile } : {}),
    includeFleet,
    includeRuntimeEvidence: includeRuntime,
  };

  const { selection } = await buildTestSelection({ request, facts });

  processStore.putSelection(selection);

  return { selection, verification: buildTestVerification({ selection, facts }) };
}

export type RunTestsMcpInput = RunSelectedTestsRequest;

export interface RunTestsMcpResult {
  selection: TestSelection;
  verification: TestVerificationReport;
}

export async function runMcpTestExecution(
  ctx: MCPContext,
  input: RunTestsMcpInput
): Promise<RunTestsMcpResult> {
  const selection = processStore.getSelection(ctx.project.id, input.selectionId);

  if (!selection) {
    throw new Error(
      'TEST_SELECTION_NOT_FOUND: run select_tests first and use the returned selectionId.'
    );
  }

  const generation = selection.generations.baseline ?? 'unknown';

  const facts = buildProjectTestFacts({
    projectId: ctx.project.id,
    rootPath: ctx.project.rootPath,
    generation,
    graph: ctx.graph,
    coverage: ctx.coverage
      ? { available: true, evaluate: (capability) => ctx.coverage!.evaluate(capability) }
      : null,
  });

  const limits = resolveTestLimits();

  const run = await runSelectedTests({
    selection,
    request: input,
    facts,
    limits: {
      maxProcesses: limits.maxProcesses,
      maxRunOutputBytes: limits.maxRunOutputBytes,
      runTimeoutMs: limits.runTimeoutMs,
    },
  });

  processStore.putRun(run);

  return { selection, verification: buildTestVerification({ selection, run, facts }) };
}

export interface TestStatusMcpInput {
  limit?: number;
}

export async function testRunStatus(ctx: MCPContext, input: TestStatusMcpInput = {}) {
  const selection = processStore.latestSelection(ctx.project.id);

  const runs = processStore.listRuns(ctx.project.id, Math.max(1, Math.min(input.limit ?? 10, 50)));

  return {
    projectId: ctx.project.id,
    selectionId: selection?.selectionId,
    changeFingerprint: selection?.changeFingerprint,
    sourceGeneration: selection?.generations.baseline,
    selectedTests: selection
      ? Object.values(selection.categories).reduce((total, group) => total + group.length, 0)
      : 0,
    runs: runs.map((run) => ({
      id: run.id,
      status: run.status,
      framework: run.framework,
      selectedTests: run.selectedTests.length,
      startedAt: run.startedAt,
      endedAt: run.endedAt,
      stale: run.stale,
      changeFingerprint: run.changeFingerprint,
      sourceGeneration: run.sourceGeneration,
      errors: run.errors,
      summary: summarizeRun(run),
    })),
  };
}

function summarizeRun(run: { results: Array<{ status: string }> }): {
  passed: number;
  failed: number;
  skipped: number;
  errored: number;
} {
  const summary = { passed: 0, failed: 0, skipped: 0, errored: 0 };

  for (const result of run.results) {
    if (result.status === 'passed') summary.passed += 1;
    else if (result.status === 'failed') summary.failed += 1;
    else if (result.status === 'skipped' || result.status === 'todo') summary.skipped += 1;
    else summary.errored += 1;
  }

  return summary;
}
