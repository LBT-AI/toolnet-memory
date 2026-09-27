import { z } from 'zod';

import type { MCPContext } from '../context.js';

import { ImpactAnalyzer } from '../../code-intelligence/impact/impact-analyzer.js';

import { attachToolCoverage, type ToolCoverageOutput } from '../coverage.js';

import { FleetImpactAnalyzer } from '../../code-intelligence/fleet/impact.js';

import { loadFleetSnapshot } from '../fleet.js';

import { loadRelevantAdrIds } from '../adr.js';

import { loadEvidenceRuntimeFacts } from '../runtime-trace.js';

export const analyzeImpactSchema = {
  symbolId: z.string().min(1),

  depth: z.number().int().min(1).max(10).optional(),

  /**
   * Phase 73 additive option. Defaults to false so project-local impact
   * semantics and performance are unchanged.
   */
  includeCrossRepo: z.boolean().optional(),

  /**
   * Phase 79 additive option: attach runtime-observed paths alongside the static
   * blast radius. The static blast radius is never reduced to the observed
   * subset, and runtime absence is never evidence of no impact.
   */
  includeRuntimeEvidence: z.boolean().optional(),
};

/**
 * Phase 79 runtime corroboration, reported SEPARATELY from the static blast
 * radius. `staticBlastRadius` is always the full static number. Runtime
 * evidence can only ever add corroboration, never shrink the answer, and
 * `canEstablishAbsence` is always false.
 */
export interface RuntimeObservedPathsOutput {
  available: boolean;
  compatibility: string;
  staticBlastRadius: number;
  observedPaths: number;
  canEstablishAbsence: false;
  observations: Array<{
    id: string;
    kind: string;
    validation: string;
    observationCount: number;
    sessionCount: number;
    source: { symbolId?: string; name?: string };
    target: { symbolId?: string; name?: string };
  }>;
}

export interface ImpactTargetOutput {
  id: string;

  name: string;

  qualifiedName?: string;

  filePath: string;

  type: string;
}

export interface ImpactItemOutput {
  id: string;

  name: string;

  qualifiedName?: string;

  filePath: string;

  type: string;

  relation: string;

  depth: number;
}

export interface CrossRepoImpactOutput {
  origin: { projectId: string; resourceId?: string };
  impactedProjects: string[];
  paths: Array<{
    projectId: string;
    depth: number;
    steps: Array<{
      edgeType: string;
      protocol?: string;
      fromProjectId: string;
      toProjectId: string;
      direction: 'forward' | 'reverse';
    }>;
  }>;
  fleetCoverage: {
    status: string;
    negativeClaimSafe: boolean;
    reasons: string[];
    impactMayBeUnderreported: boolean;
  };
}

export interface AnalyzeImpactResult {
  found: boolean;

  target?: ImpactTargetOutput;

  impacts: ImpactItemOutput[];

  coverage?: ToolCoverageOutput;

  /** Phase 73 additive cross-repo blast radius (opt-in). */
  crossRepoImpact?: CrossRepoImpactOutput;

  /**
   * Phase 75 additive engineering context: human ids of accepted ADRs that
   * affect the target file/symbol. ADRs are context, never impact calculation.
   */
  relevantADRs?: string[];

  /** Phase 79 additive runtime-observed paths (opt-in, never authoritative). */
  runtimeObservedPaths?: RuntimeObservedPathsOutput;
}

export async function analyzeImpact(
  ctx: MCPContext,
  input: {
    symbolId: string;
    depth?: number;
    includeCrossRepo?: boolean;
    includeRuntimeEvidence?: boolean;
  }
): Promise<AnalyzeImpactResult> {
  const symbol = ctx.graph.getSymbol(input.symbolId);

  if (!symbol) {
    const coverage = await attachToolCoverage(ctx, {
      capability: 'impact_analysis',
      negative: true,
      impact: true,
      crossService: true,
    });

    return {
      found: false,
      impacts: [],

      ...(coverage ? { coverage } : {}),
    };
  }

  const analyzer = new ImpactAnalyzer(ctx.graph);

  const impacts = analyzer.analyze(ctx.project.id, symbol.id, input.depth ?? 4);

  const relevantADRs = await loadRelevantAdrIds(ctx, {
    filePaths: [symbol.filePath],
    symbols: [symbol.id, symbol.qualifiedName].filter(
      (value): value is string => typeof value === 'string' && value.length > 0
    ),
  });

  const coverage = await attachToolCoverage(ctx, {
    capability: 'impact_analysis',
    negative: impacts.length === 0,
    impact: true,
    crossService: true,
  });

  return {
    found: true,

    target: {
      id: symbol.id,

      name: symbol.name,

      qualifiedName: symbol.qualifiedName,

      filePath: symbol.filePath,

      type: symbol.type,
    },

    impacts: impacts.map((item) => ({
      id: item.symbol.id,

      name: item.symbol.name,

      qualifiedName: item.symbol.qualifiedName,

      filePath: item.symbol.filePath,

      type: item.symbol.type,

      relation: item.relation,

      depth: item.depth,
    })),

    ...(coverage ? { coverage } : {}),

    ...(relevantADRs && relevantADRs.length > 0 ? { relevantADRs } : {}),

    ...(input.includeRuntimeEvidence
      ? { runtimeObservedPaths: await buildRuntimeObservedPaths(ctx, symbol.id, impacts.length) }
      : {}),

    ...(input.includeCrossRepo
      ? { crossRepoImpact: await buildCrossRepoImpact(ctx, symbol.id) }
      : {}),
  };
}

/**
 * Phase 79 — runtime corroboration for one impact target.
 *
 * Reported as a SEPARATE section: `staticBlastRadius` keeps the full static
 * number and is never reduced to the runtime-observed subset. A runtime
 * observation is corroboration; not observing something is not evidence that it
 * has no impact.
 */
async function buildRuntimeObservedPaths(
  ctx: MCPContext,
  symbolId: string,
  staticBlastRadius: number
): Promise<RuntimeObservedPathsOutput> {
  const facts = await loadEvidenceRuntimeFacts(ctx, { symbolIds: [symbolId] });

  const observations = facts?.relevant ?? [];

  return {
    available: facts?.available === true,
    compatibility: facts?.compatibility ?? 'unknown',
    staticBlastRadius,
    observedPaths: observations.length,
    canEstablishAbsence: false,
    observations: observations.map((observation) => ({
      id: observation.id,
      kind: observation.kind,
      validation: observation.validation,
      observationCount: observation.observationCount,
      sessionCount: observation.sessionCount,
      source: observation.source,
      target: observation.target,
    })),
  };
}

async function buildCrossRepoImpact(
  ctx: MCPContext,
  resourceId: string
): Promise<CrossRepoImpactOutput | undefined> {
  const snapshot = await loadFleetSnapshot(ctx, { persist: true });

  if (!snapshot) {
    return undefined;
  }

  const impact = new FleetImpactAnalyzer(snapshot).analyze({
    projectId: ctx.project.id,
    resourceId,
  });

  return {
    origin: {
      projectId: impact.originProjectId,
      ...(impact.originResourceId ? { resourceId: impact.originResourceId } : {}),
    },
    impactedProjects: impact.impactedProjects,
    paths: impact.paths.map((path) => ({
      projectId: path.projectId,
      depth: path.depth,
      steps: path.steps.map((step) => ({
        edgeType: step.edgeType,
        ...(step.protocol ? { protocol: step.protocol } : {}),
        fromProjectId: step.fromProjectId,
        toProjectId: step.toProjectId,
        direction: step.direction,
      })),
    })),
    fleetCoverage: {
      status: impact.coverage.status,
      negativeClaimSafe: impact.coverage.negativeClaimSafe,
      reasons: impact.coverage.reasons,
      impactMayBeUnderreported: impact.coverage.status !== 'complete',
    },
  };
}
