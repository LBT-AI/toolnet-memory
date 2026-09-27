import { z } from 'zod';

import type { MCPContext } from '../context.js';

import { ImpactGuard } from '../../code-intelligence/impact/impact-guard.js';

import { attachToolCoverage, type ToolCoverageOutput } from '../coverage.js';

import { runMcpChangeAnalysis } from '../change.js';

import { runMcpContractAnalysis } from '../contract.js';

import { runMcpTestSelection } from '../test-intelligence.js';

import type { ChangeIntelligenceReport } from '../../code-intelligence/change/index.js';

import type { ContractIntelligenceReport } from '../../code-intelligence/contract/index.js';

import type { TestSelection } from '../../code-intelligence/test-intelligence/index.js';

export const impactGuardSchema = {
  /**
   * `git_diff` and `file` are the legacy Phase 81-era modes. `change` is the
   * Phase 80 change-intelligence pipeline.
   */
  mode: z.enum(['git_diff', 'file', 'change']).optional(),

  filePath: z.string().optional(),

  depth: z.number().int().min(1).max(10).optional(),

  /** Phase 80 change mode. */
  changeMode: z.enum(['working_tree', 'staged', 'commit', 'commit_range', 'patch']).optional(),

  base: z.string().max(200).optional(),

  head: z.string().max(200).optional(),

  /** Explicit patch payload. Never a filesystem path. */
  patch: z
    .string()
    .max(8 * 1024 * 1024)
    .optional(),

  /** The claim the caller intends to make; correctness never depends on prose. */
  claim: z
    .enum(['positive', 'negative', 'absence', 'uniqueness', 'exhaustive', 'impact', 'dead_code'])
    .optional(),

  evidenceProfile: z.enum(['scout', 'verify', 'auditor']).optional(),

  includeCrossService: z.boolean().optional(),

  includeFleet: z.boolean().optional(),

  includeRuntimeEvidence: z.boolean().optional(),

  /** Phase 81: also run structural contract compatibility over the change. */
  includeContracts: z.boolean().optional(),

  /** Phase 82: also run deterministic change-to-test selection. */
  includeTests: z.boolean().optional(),
};

type ImpactGuardResultBase =
  ReturnType<ImpactGuard['analyzeFile']> | Awaited<ReturnType<ImpactGuard['analyzeGitDiff']>>;

export type ImpactGuardResult = ImpactGuardResultBase & {
  coverage?: ToolCoverageOutput;
};

export interface ChangeWithContracts extends ChangeIntelligenceReport {
  /**
   * Phase 81 structural contract compatibility. Present only when
   * `includeContracts` was requested on a `mode: "change"` call.
   */
  contractCompatibility?: ContractIntelligenceReport;

  /**
   * Phase 82 deterministic test selection. Present only when `includeTests` was
   * requested on a `mode: "change"` call. Selection never executes a test.
   */
  testSelection?: TestSelection;
}

export type ImpactGuardToolResult = ImpactGuardResult | ChangeWithContracts;

export interface ImpactGuardInput {
  mode?: 'git_diff' | 'file' | 'change';

  filePath?: string;

  depth?: number;

  changeMode?: 'working_tree' | 'staged' | 'commit' | 'commit_range' | 'patch';

  base?: string;

  head?: string;

  patch?: string;

  claim?:
    'positive' | 'negative' | 'absence' | 'uniqueness' | 'exhaustive' | 'impact' | 'dead_code';

  evidenceProfile?: 'scout' | 'verify' | 'auditor';

  includeCrossService?: boolean;

  includeFleet?: boolean;

  includeRuntimeEvidence?: boolean;

  includeContracts?: boolean;

  includeTests?: boolean;
}

export async function impactGuard(
  ctx: MCPContext,
  input: ImpactGuardInput
): Promise<ImpactGuardToolResult> {
  const mode = input.mode ?? (input.filePath ? 'file' : input.changeMode ? 'change' : 'git_diff');

  if (mode === 'change') {
    const change = await runMcpChangeAnalysis(ctx, {
      mode: input.changeMode ?? 'working_tree',
      ...(input.base !== undefined ? { base: input.base } : {}),
      ...(input.head !== undefined ? { head: input.head } : {}),
      ...(input.patch !== undefined ? { patch: input.patch } : {}),
      ...(input.claim !== undefined ? { claim: input.claim } : {}),
      ...(input.evidenceProfile !== undefined ? { profile: input.evidenceProfile } : {}),
      ...(input.includeCrossService !== undefined
        ? { includeCrossService: input.includeCrossService }
        : {}),
      ...(input.includeFleet !== undefined ? { includeFleet: input.includeFleet } : {}),
      ...(input.includeRuntimeEvidence !== undefined
        ? { includeRuntimeEvidence: input.includeRuntimeEvidence }
        : {}),
    });

    if (!input.includeContracts && !input.includeTests) {
      return change;
    }

    const contract = input.includeContracts
      ? await runMcpContractAnalysis(ctx, change, {
          ...(input.claim !== undefined ? { claim: input.claim } : {}),
          ...(input.evidenceProfile !== undefined ? { profile: input.evidenceProfile } : {}),
          ...(input.includeCrossService !== undefined
            ? { includeCrossService: input.includeCrossService }
            : {}),
          ...(input.includeFleet !== undefined ? { includeFleet: input.includeFleet } : {}),
          ...(input.includeRuntimeEvidence !== undefined
            ? { includeRuntimeEvidence: input.includeRuntimeEvidence }
            : {}),
        })
      : undefined;

    const testSelection = input.includeTests
      ? (
          await runMcpTestSelection(ctx, {
            change,
            ...(contract ? { contract } : {}),
            ...(input.claim !== undefined ? { claim: input.claim } : {}),
            ...(input.evidenceProfile !== undefined ? { profile: input.evidenceProfile } : {}),
            includeFleet: input.includeFleet ?? false,
            includeRuntimeEvidence: input.includeRuntimeEvidence ?? false,
          })
        ).selection
      : undefined;

    return {
      ...change,
      ...(contract ? { contractCompatibility: contract } : {}),
      ...(testSelection ? { testSelection } : {}),
    };
  }

  const guard = new ImpactGuard(ctx.graph);

  let result: ImpactGuardResultBase;

  if (mode === 'file') {
    if (!input.filePath) {
      throw new Error('filePath is required when mode=file');
    }

    result = guard.analyzeFile(ctx.project.id, input.filePath, {
      maxDepth: input.depth,
    });
  } else {
    result = await guard.analyzeGitDiff(ctx.project.id, ctx.project.rootPath, {
      maxDepth: input.depth,
    });
  }

  const coverage = await attachToolCoverage(ctx, {
    capability: 'impact_analysis',
    negative: result.impacted.length === 0,
    impact: true,
    crossService: true,
  });

  return {
    ...result,

    ...(coverage ? { coverage } : {}),
  };
}
