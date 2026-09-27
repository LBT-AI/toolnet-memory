/*
 * Phase 82 — select_tests MCP tool.
 *
 * Read-only: it maps a Phase 80 change (plus optional Phase 81 contract
 * analysis) to a deterministic test selection with categories, reason codes and
 * uncovered changed entities. It never executes a test.
 */

import { z } from 'zod';

import type { MCPContext } from '../context.js';

import { runMcpChangeAnalysis } from '../change.js';

import { runMcpContractAnalysis } from '../contract.js';

import { runMcpTestSelection } from '../test-intelligence.js';

export const selectTestsSchema = {
  mode: z.enum(['working_tree', 'staged', 'commit', 'commit_range', 'patch']).optional(),

  base: z.string().max(200).optional(),

  head: z.string().max(200).optional(),

  /** Explicit patch payload. Never a filesystem path. */
  patch: z
    .string()
    .max(8 * 1024 * 1024)
    .optional(),

  claim: z
    .enum(['positive', 'negative', 'absence', 'uniqueness', 'exhaustive', 'impact', 'dead_code'])
    .optional(),

  evidenceProfile: z.enum(['scout', 'verify', 'auditor']).optional(),

  includeContracts: z.boolean().optional(),

  includeFleet: z.boolean().optional(),

  includeRuntimeEvidence: z.boolean().optional(),
};

export interface SelectTestsInput {
  mode?: 'working_tree' | 'staged' | 'commit' | 'commit_range' | 'patch';
  base?: string;
  head?: string;
  patch?: string;
  claim?:
    'positive' | 'negative' | 'absence' | 'uniqueness' | 'exhaustive' | 'impact' | 'dead_code';
  evidenceProfile?: 'scout' | 'verify' | 'auditor';
  includeContracts?: boolean;
  includeFleet?: boolean;
  includeRuntimeEvidence?: boolean;
}

export async function selectTests(ctx: MCPContext, input: SelectTestsInput) {
  const change = await runMcpChangeAnalysis(ctx, {
    mode: input.mode ?? 'working_tree',
    ...(input.base !== undefined ? { base: input.base } : {}),
    ...(input.head !== undefined ? { head: input.head } : {}),
    ...(input.patch !== undefined ? { patch: input.patch } : {}),
    ...(input.claim !== undefined ? { claim: input.claim } : {}),
    ...(input.evidenceProfile !== undefined ? { profile: input.evidenceProfile } : {}),
  });

  const contract = input.includeContracts
    ? await runMcpContractAnalysis(ctx, change, {
        ...(input.claim !== undefined ? { claim: input.claim } : {}),
        ...(input.evidenceProfile !== undefined ? { profile: input.evidenceProfile } : {}),
        includeFleet: input.includeFleet ?? false,
        includeRuntimeEvidence: input.includeRuntimeEvidence ?? false,
      })
    : undefined;

  const { selection, verification } = await runMcpTestSelection(ctx, {
    change,
    ...(contract ? { contract } : {}),
    ...(input.claim !== undefined ? { claim: input.claim } : {}),
    ...(input.evidenceProfile !== undefined ? { profile: input.evidenceProfile } : {}),
    includeFleet: input.includeFleet ?? false,
    includeRuntimeEvidence: input.includeRuntimeEvidence ?? false,
  });

  return {
    selectionId: selection.selectionId,
    fingerprint: selection.fingerprint,
    changeFingerprint: change.fingerprint,
    ...(contract ? { contractFingerprint: contract.fingerprint } : {}),
    profile: selection.profile,
    evidenceLevel: selection.evidenceLevel,
    generations: selection.generations,
    coverage: selection.coverage,
    discovery: selection.discovery,
    categories: {
      direct: selection.categories.direct.map(simplify),
      contract: selection.categories.contract.map(simplify),
      integration: selection.categories.integration.map(simplify),
      transitive: selection.categories.transitive.map(simplify),
      related: selection.categories.related.map(simplify),
      e2e: selection.categories.e2e.map(simplify),
    },
    minimal: selection.minimal.map((entry) => entry.test.id),
    uncoveredEntities: selection.uncoveredEntities,
    reasons: selection.reasons,
    claimSafety: selection.claimSafety,
    adrConstraints: selection.adrConstraints,
    verificationBlockers: verification.blockers,
    limitations: selection.limitations,
    complete: selection.complete,
    /** Selection never authorises a merge or a deployment. */
    safeToMerge: false,
    safeToDeploy: false,
  };
}

function simplify(entry: {
  test: { id: string; path: string; framework: string; kind: string };
  category: string;
  reasonCode: string;
  targetEntityId?: string;
  runtimeObserved?: boolean;
}) {
  return {
    testId: entry.test.id,
    path: entry.test.path,
    framework: entry.test.framework,
    kind: entry.test.kind,
    category: entry.category,
    reasonCode: entry.reasonCode,
    ...(entry.targetEntityId ? { targetEntityId: entry.targetEntityId } : {}),
    ...(entry.runtimeObserved ? { runtimeObserved: true } : {}),
  };
}
