/*
 * Phase 74 — Bounded traversal.
 *
 * Single shared traversal implementation used by the executor for both
 * single-hop and variable-length relationships. Paths are simple (no repeated
 * node), so a cyclic graph terminates by construction, and the expansion
 * budget is checked on every step.
 */

import type { ReadableGraph } from './adapter.js';

import { MAX_EXPANSIONS } from './limits.js';

import {
  QueryError,
  type EdgePattern,
  type QueryEdge,
  type QueryEdgeType,
  type QueryNode,
} from './types.js';

export interface TraversalState {
  expansions: number;
}

export interface HopResult {
  node: QueryNode;
  intermediateNodes: QueryNode[];
  edges: QueryEdge[];
}

export function assertNotAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new QueryError('QUERY_EXECUTION_ABORTED', 'Query execution was aborted');
  }
}

function edgesFor(
  graph: ReadableGraph,
  nodeId: string,
  pattern: EdgePattern,
  allowedTypes: ReadonlySet<QueryEdgeType>
): QueryEdge[] {
  const direction = pattern.direction;

  const outgoing = direction === 'incoming' ? [] : graph.outgoing(nodeId, allowedTypes);
  const incoming = direction === 'outgoing' ? [] : graph.incoming(nodeId, allowedTypes);

  return [...outgoing, ...incoming].sort((left, right) => left.id.localeCompare(right.id));
}

export function expandEdge(
  graph: ReadableGraph,
  fromId: string,
  pattern: EdgePattern,
  allowedTypes: ReadonlySet<QueryEdgeType>,
  state: TraversalState,
  signal?: AbortSignal
): HopResult[] {
  const results: HopResult[] = [];

  interface Frame {
    nodeId: string;
    hops: number;
    nodes: QueryNode[];
    edges: QueryEdge[];
    visited: ReadonlySet<string>;
  }

  const start: Frame = {
    nodeId: fromId,
    hops: 0,
    nodes: [],
    edges: [],
    visited: new Set([fromId]),
  };

  const queue: Frame[] = [start];

  while (queue.length > 0) {
    assertNotAborted(signal);
    const frame = queue.shift()!;

    if (frame.hops >= pattern.maxHops) {
      continue;
    }

    for (const edge of edgesFor(graph, frame.nodeId, pattern, allowedTypes)) {
      /*
       * The "other" endpoint is whichever side is not the current node. This
       * is correct for directed, reverse and undirected patterns alike, and
       * keeps self-loops (target === current) filtered by the visited guard.
       */
      const target = edge.from === frame.nodeId ? edge.to : edge.from;

      if (frame.visited.has(target)) {
        continue;
      }

      state.expansions += 1;
      if (state.expansions > MAX_EXPANSIONS) {
        throw new QueryError(
          'QUERY_LIMIT_EXCEEDED',
          `Traversal exceeded the expansion budget of ${MAX_EXPANSIONS}`
        );
      }

      const node = graph.node(target);
      if (!node) {
        continue;
      }

      const nodes = [...frame.nodes, node];
      const edges = [...frame.edges, edge];
      const visited = new Set([...frame.visited, target]);

      if (edges.length >= pattern.minHops) {
        results.push({ node, intermediateNodes: nodes.slice(0, -1), edges });
      }

      queue.push({ nodeId: target, hops: frame.hops + 1, nodes, edges, visited });
    }
  }

  return results.sort((left, right) => {
    const leftKey = left.edges.map((edge) => edge.id).join('>');
    const rightKey = right.edges.map((edge) => edge.id).join('>');
    return leftKey.localeCompare(rightKey) || left.node.id.localeCompare(right.node.id);
  });
}

/**
 * Bounded BFS shortest path over selected edge types. Deterministic and
 * unweighted — there is no probabilistic or weighted path scoring.
 */
export interface PathStep {
  node: QueryNode;
  edge?: QueryEdge;
}

export function shortestPath(
  graph: ReadableGraph,
  fromId: string,
  toId: string,
  edgeTypes: ReadonlySet<QueryEdgeType>,
  maxDepth: number,
  signal?: AbortSignal
): PathStep[] | null {
  if (fromId === toId) {
    const node = graph.node(fromId);
    return node ? [{ node }] : null;
  }

  const from = graph.node(fromId);
  if (!from) {
    return null;
  }

  const visited = new Set<string>([fromId]);
  const previous = new Map<string, { node: string; edge: QueryEdge }>();
  const queue: Array<{ id: string; depth: number }> = [{ id: fromId, depth: 0 }];

  while (queue.length > 0) {
    assertNotAborted(signal);
    const current = queue.shift()!;

    if (current.depth >= maxDepth) {
      continue;
    }

    for (const edge of graph.outgoing(current.id, edgeTypes)) {
      if (visited.has(edge.to)) {
        continue;
      }
      visited.add(edge.to);
      previous.set(edge.to, { node: current.id, edge });

      if (edge.to === toId) {
        return rebuild(graph, fromId, toId, previous);
      }

      queue.push({ id: edge.to, depth: current.depth + 1 });
    }
  }

  return null;
}

function rebuild(
  graph: ReadableGraph,
  fromId: string,
  toId: string,
  previous: ReadonlyMap<string, { node: string; edge: QueryEdge }>
): PathStep[] | null {
  const steps: PathStep[] = [];
  let cursor = toId;

  while (cursor !== fromId) {
    const entry = previous.get(cursor);
    if (!entry) {
      return null;
    }
    const node = graph.node(cursor);
    if (!node) {
      return null;
    }
    steps.push({ node, edge: entry.edge });
    cursor = entry.node;
  }

  const head = graph.node(fromId);
  if (!head) {
    return null;
  }
  steps.push({ node: head });

  return steps.reverse();
}
