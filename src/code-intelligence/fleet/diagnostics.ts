import type { FleetSnapshot, UnresolvedCrossProjectReference } from './types.js';

export const MAX_FLEET_DIAGNOSTIC_ENTRIES = 50;

export interface FleetDiagnosticSummary {
  total: number;
  truncated: boolean;
  byReason: Record<string, number>;
  entries: Array<{
    type: UnresolvedCrossProjectReference['type'];
    fromProjectId: string;
    reason: UnresolvedCrossProjectReference['reason'];
    candidates?: string[];
  }>;
}

/**
 * Bounded, source-free Fleet diagnostics.
 *
 * Never contains source text, credentials or environment values.
 */
export function summarizeFleetDiagnostics(
  snapshot: FleetSnapshot | null | undefined,
  maxEntries = MAX_FLEET_DIAGNOSTIC_ENTRIES
): FleetDiagnosticSummary {
  const unresolved = snapshot?.unresolved ?? [];
  const byReason: Record<string, number> = {};
  const entries: FleetDiagnosticSummary['entries'] = [];

  for (const reference of unresolved) {
    byReason[reference.reason] = (byReason[reference.reason] ?? 0) + 1;

    if (entries.length < maxEntries) {
      entries.push({
        type: reference.type,
        fromProjectId: reference.fromProjectId,
        reason: reference.reason,
        ...(reference.candidates ? { candidates: [...reference.candidates] } : {}),
      });
    }
  }

  return {
    total: snapshot?.stats.unresolved ?? unresolved.length,
    truncated: unresolved.length > maxEntries,
    byReason,
    entries,
  };
}

export interface FleetArchitectureSummary {
  projects: number;
  crossProjectEdges: number;
  protocols: Record<string, number>;
  edgeTypes: Record<string, number>;
  /** Projects with the highest incoming dependency count (deterministic). */
  highFanIn: Array<{ projectId: string; count: number }>;
  /** Projects with the highest outgoing dependency count (deterministic). */
  highFanOut: Array<{ projectId: string; count: number }>;
  /** Deterministic dependency cycles across projects. */
  cycles: string[][];
}

/**
 * Deterministic Fleet architecture summary.
 *
 * Cycle detection is a bounded DFS over project-to-project dependency edges;
 * no clustering or fuzzy grouping is performed.
 */
export function summarizeFleetArchitecture(
  snapshot: FleetSnapshot | null | undefined
): FleetArchitectureSummary {
  const edges = snapshot?.edges ?? [];

  const dependencyTypes = new Set([
    'CROSS_HTTP_CALLS',
    'CROSS_RPC_CALLS',
    'CROSS_GRAPHQL_CALLS',
    'CROSS_TRPC_CALLS',
    'CROSS_PACKAGE_DEPENDS_ON',
  ]);

  const fanIn = new Map<string, number>();
  const fanOut = new Map<string, number>();
  const protocols: Record<string, number> = {};
  const edgeTypes: Record<string, number> = {};
  const adjacency = new Map<string, Set<string>>();

  for (const edge of edges) {
    edgeTypes[edge.type] = (edgeTypes[edge.type] ?? 0) + 1;
    if (edge.protocol) {
      protocols[edge.protocol] = (protocols[edge.protocol] ?? 0) + 1;
    }

    if (!dependencyTypes.has(edge.type)) {
      continue;
    }

    fanOut.set(edge.fromProjectId, (fanOut.get(edge.fromProjectId) ?? 0) + 1);
    fanIn.set(edge.toProjectId, (fanIn.get(edge.toProjectId) ?? 0) + 1);

    const list = adjacency.get(edge.fromProjectId) ?? new Set<string>();
    list.add(edge.toProjectId);
    adjacency.set(edge.fromProjectId, list);
  }

  const toSorted = (map: Map<string, number>): Array<{ projectId: string; count: number }> =>
    [...map.entries()]
      .map(([projectId, count]) => ({ projectId, count }))
      .sort((left, right) =>
        left.count === right.count
          ? left.projectId.localeCompare(right.projectId)
          : right.count - left.count
      )
      .slice(0, 10);

  const cycles: string[][] = [];
  const state = new Map<string, 'visiting' | 'done'>();
  const stack: string[] = [];

  const visit = (node: string): void => {
    if (state.get(node) === 'done') {
      return;
    }
    if (state.get(node) === 'visiting') {
      const start = stack.indexOf(node);
      if (start >= 0) {
        const cycle = [...stack.slice(start), node];
        cycles.push(cycle);
      }
      return;
    }

    state.set(node, 'visiting');
    stack.push(node);

    for (const next of [...(adjacency.get(node) ?? [])].sort()) {
      visit(next);
    }

    stack.pop();
    state.set(node, 'done');
  };

  for (const node of [...adjacency.keys()].sort()) {
    visit(node);
  }

  return {
    projects: snapshot?.projects.length ?? 0,
    crossProjectEdges: edges.length,
    protocols: Object.fromEntries(
      Object.entries(protocols).sort(([left], [right]) => left.localeCompare(right))
    ),
    edgeTypes: Object.fromEntries(
      Object.entries(edgeTypes).sort(([left], [right]) => left.localeCompare(right))
    ),
    highFanIn: toSorted(fanIn),
    highFanOut: toSorted(fanOut),
    cycles: cycles
      .map((cycle) => [...cycle])
      .sort((left, right) => left.join('>').localeCompare(right.join('>'))),
  };
}
