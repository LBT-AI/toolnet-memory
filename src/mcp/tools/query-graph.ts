/*
 * Phase 74 — query_graph MCP tool.
 *
 * Runs a bounded, read-only TGQL query against the current project graph or the
 * derived Fleet overlay. Mutation clauses are rejected before execution; the
 * executor only ever receives a read-only adapter.
 */

import { z } from 'zod';

import { semanticFingerprint } from '../../code-intelligence/graph/graph-semantics.js';

import {
  FleetGraphAdapter,
  ProjectGraphAdapter,
  QueryError,
  runQuery,
  type QueryDiagnostic,
  type QueryGeneration,
  type QueryResult,
  type QueryScope,
} from '../../code-intelligence/query-v2/index.js';

import { loadFleetQueryData, loadProjectGeneration } from '../fleet.js';

import { buildQueryCoverage } from '../query-coverage.js';

import type { MCPContext } from '../context.js';

const parametersSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.array(z.string()).max(200)])
);

export const queryGraphSchema = {
  query: z.string().min(1).max(8192),
  parameters: parametersSchema.optional(),
  scope: z.enum(['project', 'fleet']).optional(),
  explain: z.boolean().optional(),
  limit: z.number().int().min(1).max(1000).optional(),
  skip: z.number().int().min(0).max(1_000_000).optional(),
  cursor: z.string().min(1).max(4096).optional(),
  evidenceProfile: z
    .enum(['scout', 'verify', 'auditor'])
    .optional()
    .describe('Phase 78 evidence profile metadata for ad-hoc queries.'),
};

/**
 * Phase 78 evidence metadata for a query result.
 *
 * Additive only: it never changes the query semantics, and an empty result is
 * still not a negative claim unless the profile reports it safe.
 */
export interface QueryGraphEvidence {
  profile: 'scout' | 'verify' | 'auditor';
  decision: 'allowed' | 'provisional' | 'blocked';
  negativeClaimSafe: boolean;
  exhaustiveClaimSafe: boolean;
  paginationComplete: boolean;
  generation: QueryGeneration;
  reasons: string[];
}

export interface QueryGraphSuccess extends QueryResult {
  ok: true;
  evidence?: QueryGraphEvidence;
}

function attachEvidenceProfile(
  result: QueryResult,
  profile: 'scout' | 'verify' | 'auditor'
): QueryGraphEvidence {
  const paginationComplete = !result.truncated && !result.nextCursor;

  const coverageSafe = result.coverage?.negativeClaimSafe === true;

  if (profile === 'scout') {
    return {
      profile,
      decision: 'provisional',
      negativeClaimSafe: false,
      exhaustiveClaimSafe: false,
      paginationComplete,
      generation: result.generation,
      reasons: ['SCOUT_PROVISIONAL_ONLY'],
    };
  }

  const reasons: string[] = [];

  if (!coverageSafe) {
    reasons.push('COVERAGE_PARTIAL');
  }

  if (profile === 'auditor' && !paginationComplete) {
    reasons.push('PAGINATION_INCOMPLETE');
  }

  const decision: QueryGraphEvidence['decision'] = reasons.length > 0 ? 'blocked' : 'allowed';

  const negativeClaimSafe = decision === 'allowed' && coverageSafe && paginationComplete;

  return {
    profile,
    decision,
    negativeClaimSafe,
    exhaustiveClaimSafe: negativeClaimSafe && profile === 'auditor',
    paginationComplete,
    generation: result.generation,
    reasons,
  };
}

export interface QueryGraphFailure {
  ok: false;
  error: QueryDiagnostic;
}

export type QueryGraphResult = QueryGraphSuccess | QueryGraphFailure;

export interface QueryGraphRuntime {
  signal?: AbortSignal;
}

function toDiagnostic(error: QueryError): QueryDiagnostic {
  return {
    code: error.code,
    message: error.message,
    ...(error.line !== undefined ? { line: error.line } : {}),
    ...(error.column !== undefined ? { column: error.column } : {}),
  };
}

export async function queryGraph(
  ctx: MCPContext,
  input: {
    query: string;
    parameters?: Record<string, string | number | boolean | string[]>;
    scope?: QueryScope;
    explain?: boolean;
    limit?: number;
    skip?: number;
    cursor?: string;
    evidenceProfile?: 'scout' | 'verify' | 'auditor';
  },
  runtime: QueryGraphRuntime = {}
): Promise<QueryGraphResult> {
  const scope: QueryScope = input.scope ?? 'project';

  const success = (result: QueryResult): QueryGraphSuccess => ({
    ok: true,
    ...result,
    ...(input.evidenceProfile
      ? { evidence: attachEvidenceProfile(result, input.evidenceProfile) }
      : {}),
  });

  const common = {
    source: input.query,
    ...(input.parameters ? { parameters: input.parameters } : {}),
    ...(input.limit !== undefined ? { limit: input.limit } : {}),
    ...(input.skip !== undefined ? { skip: input.skip } : {}),
    ...(input.cursor ? { cursor: input.cursor } : {}),
    ...(input.explain !== undefined ? { explain: input.explain } : {}),
    ...(runtime.signal ? { signal: runtime.signal } : {}),
  };

  try {
    const projectGeneration = (await loadProjectGeneration(ctx)) ?? semanticFingerprint();

    const projectAdapter = new ProjectGraphAdapter(ctx.graph, projectGeneration, ctx.project.id);

    if (scope === 'project') {
      const result = await runQuery({
        ...common,
        scope,
        graph: projectAdapter,
        coverage: async (request) => buildQueryCoverage(ctx, request, ctx.fleet ?? null),
      });

      return success(result);
    }

    const fleetData = await loadFleetQueryData(ctx);

    if (!fleetData.snapshot) {
      throw new QueryError('UNSUPPORTED_SCOPE', 'Fleet graph is unavailable for this install');
    }

    const fleetAdapter = new FleetGraphAdapter({
      snapshot: fleetData.snapshot,
      exports: fleetData.exports,
      localProjectId: ctx.project.id,
      local: projectAdapter,
    });

    const result = await runQuery({
      ...common,
      scope,
      graph: fleetAdapter,
      generation: {
        ...(fleetData.projectGeneration ? { project: fleetData.projectGeneration } : {}),
        fleet: fleetData.snapshot.generation,
      },
      coverage: async (request) => buildQueryCoverage(ctx, request, fleetData.snapshot),
    });

    return { ok: true, ...result };
  } catch (error) {
    if (error instanceof QueryError) {
      return { ok: false, error: toDiagnostic(error) };
    }

    /* Never leak a stack trace to the MCP client. */
    return {
      ok: false,
      error: {
        code: 'QUERY_SYNTAX_ERROR',
        message: error instanceof Error ? error.message : 'Query failed',
      },
    };
  }
}
