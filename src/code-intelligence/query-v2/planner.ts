/*
 * Phase 74 — TGQL planner.
 *
 * Not a cost-based optimizer: it selects a deterministic starting access path
 * and produces a bounded estimate so a pathological query is rejected before
 * execution instead of after.
 */

import type { ReadableGraph } from './adapter.js';

import { MAX_ESTIMATED_OPERATIONS, MAX_EXPANSIONS } from './limits.js';

import { QueryError, type QueryAst, type QueryPlan } from './types.js';

import type { ValidatedQuery } from './validator.js';

interface StartSelection {
  startingIndex: string;
  candidateCount: number;
  usesIndex: boolean;
}

function equalityValue(
  ast: QueryAst,
  alias: string,
  properties: readonly string[]
): { property: string; value: string | number | boolean } | undefined {
  const where = ast.where;
  if (!where || where.kind !== 'comparison' || where.op !== '=') {
    return undefined;
  }

  for (const [left, right] of [
    [where.left, where.right],
    [where.right, where.left],
  ] as const) {
    if (
      left.kind === 'property' &&
      left.variable === alias &&
      properties.includes(left.property) &&
      right.kind === 'literal' &&
      typeof right.value !== 'object' &&
      right.value !== null
    ) {
      return { property: left.property, value: right.value };
    }
  }

  return undefined;
}

export function planQuery(validated: ValidatedQuery, graph: ReadableGraph): QueryPlan {
  const { ast } = validated;

  const first = ast.match[0]?.elements[0]?.node;
  let start: StartSelection = {
    startingIndex: 'nodesByType',
    candidateCount: 0,
    usesIndex: false,
  };

  if (first?.type) {
    const candidates = graph.nodesByType(first.type);
    start = {
      startingIndex: `nodesByType(${first.type})`,
      candidateCount: candidates.length,
      usesIndex: true,
    };
  }

  if (first?.alias) {
    const equality = equalityValue(ast, first.alias, ['id', 'name', 'qualifiedName']);
    if (equality) {
      const indexed = graph.indexedLookup(first.type, equality.property, equality.value);
      if (indexed) {
        start = {
          startingIndex: `${equality.property}Index`,
          candidateCount: indexed.length,
          usesIndex: true,
        };
      }
    }
  }

  if (!start.usesIndex) {
    start = { startingIndex: 'allNodes', candidateCount: graph.nodeCount(), usesIndex: false };
  }

  const edgeTypes = validated.edgeTypes;

  /*
   * Deterministic estimate: starting candidates x per-hop fan-out x pattern
   * length. Uses the observed edge count as the fan-out bound.
   */
  const fanOut = Math.max(1, Math.ceil(graph.edgeCount() / Math.max(1, graph.nodeCount())));
  const hops = Math.max(1, validated.patternCount);
  const branches = Math.max(1, ast.match.length);

  const estimatedOperations = Math.min(
    Number.MAX_SAFE_INTEGER,
    Math.max(1, start.candidateCount) * Math.pow(fanOut + 1, hops) * branches
  );

  const estimatedExpansions = Math.min(MAX_EXPANSIONS + 1, estimatedOperations);

  if (estimatedOperations > MAX_ESTIMATED_OPERATIONS) {
    throw new QueryError(
      'QUERY_TOO_COMPLEX',
      `Estimated query cost (${estimatedOperations}) exceeds the allowed budget`
    );
  }

  return {
    scope: validated.scope,
    startingIndex: start.startingIndex,
    edgeTypes,
    patternCount: validated.patternCount,
    maxDepth: validated.maxDepth,
    estimatedOperations,
    estimatedExpansions,
    requiredCapabilities: validated.requiredCapabilities,
    usesIndex: start.usesIndex,
  };
}
