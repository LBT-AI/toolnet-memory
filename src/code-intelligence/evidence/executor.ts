/*
 * Phase 78 — evidence executor.
 *
 * Reads only through the injected `EvidenceFacts` surface, so it can never
 * mutate the graph and never loads a second copy. Collection is bounded and
 * deterministically ordered; an audit that cannot finish inside its budget is
 * reported incomplete rather than silently truncated.
 */

import {
  getCallEdgeTypes,
  getDataEdgeTypes,
  getDependencyEdgeTypes,
  getEventEdgeTypes,
  getRouteEdgeTypes,
  getTestEdgeTypes,
  getTypeEdgeTypes,
} from '../graph/edge-semantic-registry.js';

import { planEvidence } from './planner.js';

import { combineCoverage } from './coverage.js';

import { collectPages } from './pagination.js';

import { runSourceFallback } from './source-fallback.js';

import { evaluateClaim } from './claims.js';

import { buildEvidenceBundle } from './report.js';

import type {
  EvidenceBundle,
  EvidenceEdge,
  EvidenceFacts,
  EvidenceGap,
  EvidenceItem,
  EvidencePlan,
  EvidenceRequest,
  EvidenceRuntimeFacts,
  EvidenceRuntimeReport,
  EvidenceSymbol,
  EvidenceUnresolvedReport,
} from './types.js';

/**
 * Phase 79 — resolve the runtime evidence section of a bundle.
 *
 * Runtime data is additive: it is collected only when asked for, it never
 * enters coverage, requirements or unresolved state, and it can never make a
 * claim safer. Absence of a runtime observation is reported as "not observed",
 * never as "does not exist".
 */
function resolveRuntimeEvidence(
  facts: EvidenceFacts,
  request: EvidenceRequest
): { report: EvidenceRuntimeReport; items: EvidenceItem[]; executed: boolean; blockers: string[] } {
  const requested = request.options?.includeRuntimeTrace === true;

  const empty: EvidenceRuntimeReport = {
    requested,
    available: false,
    compatibility: 'unknown',
    sessions: 0,
    observations: 0,
    relevant: 0,
    canEstablishAbsence: false,
    items: [],
    reasons: [],
  };

  const runtime: EvidenceRuntimeFacts | null =
    facts.runtime?.(buildRuntimeSubject(request)) ?? null;

  if (!runtime) {
    return { report: empty, items: [], executed: false, blockers: [] };
  }

  const subjectSymbolIds = collectSubjectSymbolIds(facts, request);

  const executed =
    subjectSymbolIds.length > 0 &&
    subjectSymbolIds.some((symbolId) => runtime.executedSymbolIds.includes(symbolId));

  if (!requested) {
    return { report: empty, items: [], executed, blockers: [] };
  }

  const relevant = runtime.relevant;

  const items: EvidenceItem[] = relevant.map((observation) => ({
    origin: 'runtime_trace' as const,
    kind: 'observation' as const,
    id: observation.id,
    observation,
  }));

  return {
    report: {
      requested: true,
      available: runtime.available,
      compatibility: runtime.compatibility,
      sessions: runtime.sessions,
      observations: runtime.observations,
      relevant: relevant.length,
      canEstablishAbsence: false,
      items: relevant,
      reasons: [...runtime.reasons],
    },
    items,
    executed,
    blockers: [],
  };
}

function buildRuntimeSubject(request: EvidenceRequest): {
  symbolIds?: readonly string[];
  name?: string;
} {
  const symbolIds = new Set<string>(request.scope.symbolIds ?? []);

  if (request.subject?.symbolId) {
    symbolIds.add(request.subject.symbolId);
  }

  return {
    ...(symbolIds.size > 0 ? { symbolIds: [...symbolIds].sort() } : {}),
    ...(request.subject?.name ? { name: request.subject.name } : {}),
  };
}

function collectSubjectSymbolIds(facts: EvidenceFacts, request: EvidenceRequest): string[] {
  const ids = new Set<string>(buildRuntimeSubject(request).symbolIds ?? []);

  for (const symbol of subjectsFor(facts, request)) {
    ids.add(symbol.id);
  }

  return [...ids].sort();
}

const CALL_EDGES: string[] = getCallEdgeTypes();

const DEPENDENCY_EDGES: string[] = getDependencyEdgeTypes();

const TYPE_EDGES: string[] = getTypeEdgeTypes();

const DATA_EDGES: string[] = getDataEdgeTypes();

const ROUTE_EDGES: string[] = getRouteEdgeTypes();

const TEST_EDGES: string[] = getTestEdgeTypes();

const EVENT_EDGES: string[] = getEventEdgeTypes();

/** Usage edges mirror the Phase 68 dead-code analyzer: structure edges excluded. */
const USAGE_EDGES: string[] = [
  ...new Set([
    ...CALL_EDGES,
    ...DEPENDENCY_EDGES,
    ...TYPE_EDGES,
    ...DATA_EDGES,
    ...ROUTE_EDGES,
    ...TEST_EDGES,
    ...EVENT_EDGES,
  ]),
];

const TRAVERSAL_EDGES: string[] = [...new Set([...CALL_EDGES, ...DEPENDENCY_EDGES])];

export interface ExecuteEvidenceOptions {
  request: EvidenceRequest;
  facts: EvidenceFacts;
}

interface Collection {
  items: EvidenceItem[];
  deadCodeParticipation: boolean;
}

function symbolItem(symbol: EvidenceSymbol, generation: string): EvidenceItem {
  return { origin: 'graph', kind: 'symbol', id: symbol.id, symbol, generation };
}

function edgeItem(edge: EvidenceEdge, generation: string): EvidenceItem {
  return { origin: 'graph', kind: 'edge', id: edge.id, edge, generation };
}

function dedupeItems(items: EvidenceItem[]): EvidenceItem[] {
  const seen = new Set<string>();
  const output: EvidenceItem[] = [];

  for (const item of items) {
    const key = `${item.origin}:${item.kind}:${item.id}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(item);
  }

  return output;
}

function sortItems(items: EvidenceItem[]): EvidenceItem[] {
  return items.sort((left, right) => {
    if (left.origin !== right.origin) {
      return left.origin.localeCompare(right.origin);
    }

    if (left.kind !== right.kind) {
      return left.kind.localeCompare(right.kind);
    }

    return left.id.localeCompare(right.id);
  });
}

function subjectsFor(facts: EvidenceFacts, request: EvidenceRequest): EvidenceSymbol[] {
  const ids = new Set<string>();

  if (request.subject?.symbolId) {
    ids.add(request.subject.symbolId);
  }

  for (const id of request.scope.symbolIds ?? []) {
    ids.add(id);
  }

  const resolved: EvidenceSymbol[] = [];

  for (const id of [...ids].sort()) {
    const symbol = facts.symbolById(id);

    if (symbol) {
      resolved.push(symbol);
    }
  }

  if (resolved.length > 0) {
    return resolved;
  }

  const exactName = request.subject?.name;

  if (exactName) {
    return facts
      .symbols()
      .filter((symbol) => symbol.name === exactName || symbol.qualifiedName === exactName)
      .sort((left, right) => left.id.localeCompare(right.id));
  }

  const path =
    request.subject?.path ?? (request.scope.kind === 'path' ? request.scope.paths?.[0] : undefined);

  if (path) {
    return facts
      .symbols()
      .filter((symbol) => symbol.filePath === path || symbol.filePath.startsWith(`${path}/`))
      .sort((left, right) => left.id.localeCompare(right.id));
  }

  return [];
}

/** Bounded breadth-first expansion that respects the plan depth limit. */
function expand(
  facts: EvidenceFacts,
  roots: readonly EvidenceSymbol[],
  edgeTypes: readonly string[],
  maxDepth: number
): { symbols: EvidenceSymbol[]; edges: EvidenceEdge[] } {
  const symbols = new Map<string, EvidenceSymbol>();
  const edges = new Map<string, EvidenceEdge>();

  const queue: Array<{ id: string; depth: number }> = roots.map((root) => ({
    id: root.id,
    depth: 0,
  }));

  const visited = new Set<string>(roots.map((root) => root.id));

  for (const root of roots) {
    symbols.set(root.id, root);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.depth >= maxDepth) {
      continue;
    }

    const outgoing = [...facts.outgoing(current.id, edgeTypes)].sort((left, right) =>
      left.id.localeCompare(right.id)
    );

    for (const edge of outgoing) {
      edges.set(edge.id, edge);

      if (visited.has(edge.to)) {
        continue;
      }

      visited.add(edge.to);

      const symbol = facts.symbolById(edge.to);

      if (symbol) {
        symbols.set(symbol.id, symbol);
      }

      queue.push({ id: edge.to, depth: current.depth + 1 });
    }
  }

  return {
    symbols: [...symbols.values()].sort((left, right) => left.id.localeCompare(right.id)),
    edges: [...edges.values()].sort((left, right) => left.id.localeCompare(right.id)),
  };
}

function findPath(
  facts: EvidenceFacts,
  from: string,
  to: string,
  edgeTypes: readonly string[],
  maxDepth: number
): { symbols: string[]; edges: EvidenceEdge[] } | null {
  const queue: Array<{ id: string; path: EvidenceEdge[] }> = [{ id: from, path: [] }];

  const visited = new Set<string>([from]);

  let steps = 0;

  while (queue.length > 0 && steps < maxDepth * 64) {
    steps += 1;

    const current = queue.shift()!;

    if (current.path.length >= maxDepth) {
      continue;
    }

    const outgoing = [...facts.outgoing(current.id, edgeTypes)].sort((left, right) =>
      left.id.localeCompare(right.id)
    );

    for (const edge of outgoing) {
      const nextPath = [...current.path, edge];

      if (edge.to === to) {
        return {
          symbols: [from, ...nextPath.map((item) => item.to)],
          edges: nextPath,
        };
      }

      if (visited.has(edge.to)) {
        continue;
      }

      visited.add(edge.to);

      queue.push({ id: edge.to, path: nextPath });
    }
  }

  return null;
}

function collectForOperation(
  facts: EvidenceFacts,
  request: EvidenceRequest,
  plan: EvidencePlan
): Collection {
  const generation = facts.generation;

  const items: EvidenceItem[] = [];

  let deadCodeParticipation = false;

  switch (request.operation) {
    case 'find_symbol': {
      const name = request.subject?.name;

      const query = request.subject?.query;

      const matches = facts.symbols().filter((symbol) => {
        if (name) {
          return symbol.name === name || symbol.qualifiedName === name;
        }

        if (query) {
          return symbol.name.includes(query) || (symbol.qualifiedName?.includes(query) ?? false);
        }

        return true;
      });

      for (const symbol of matches) {
        items.push(symbolItem(symbol, generation));
      }

      break;
    }

    case 'find_callers': {
      for (const subject of subjectsFor(facts, request)) {
        items.push(symbolItem(subject, generation));

        for (const edge of facts.incoming(subject.id, CALL_EDGES)) {
          items.push(edgeItem(edge, generation));

          const caller = facts.symbolById(edge.from);

          if (caller) {
            items.push(symbolItem(caller, generation));
          }
        }
      }

      break;
    }

    case 'find_dependents': {
      for (const subject of subjectsFor(facts, request)) {
        items.push(symbolItem(subject, generation));

        for (const edge of facts.incoming(subject.id, DEPENDENCY_EDGES)) {
          items.push(edgeItem(edge, generation));
        }
      }

      break;
    }

    case 'graph_path': {
      const from = request.subject?.fromSymbolId ?? request.subject?.symbolId;

      const to = request.subject?.toSymbolId ?? request.subject?.symbolId;

      if (from && to) {
        const result = findPath(facts, from, to, TRAVERSAL_EDGES, plan.limits.maxDepth);

        if (result) {
          items.push({
            origin: 'graph',
            kind: 'path',
            id: `path:${from}->${to}`,
            symbols: result.symbols,
            edges: result.edges,
            generation,
          });
        }
      }

      break;
    }

    case 'impact': {
      const roots = subjectsFor(facts, request);

      const expanded = expand(facts, roots, TRAVERSAL_EDGES, plan.limits.maxDepth);

      for (const symbol of expanded.symbols) {
        items.push(symbolItem(symbol, generation));
      }

      for (const edge of expanded.edges) {
        items.push(edgeItem(edge, generation));
      }

      break;
    }

    case 'dead_code': {
      for (const subject of subjectsFor(facts, request)) {
        items.push(symbolItem(subject, generation));

        const incoming = facts.incoming(subject.id, USAGE_EDGES);

        if (incoming.length > 0) {
          deadCodeParticipation = true;
        }

        for (const edge of incoming) {
          items.push(edgeItem(edge, generation));
        }
      }

      break;
    }

    case 'cross_service_endpoint': {
      const route = request.subject?.route ?? request.subject?.name;

      const routes = facts.symbols().filter((symbol) => {
        if (symbol.type !== 'route') {
          return false;
        }

        if (!route) {
          return true;
        }

        return symbol.name === route || (symbol.qualifiedName?.includes(route) ?? false);
      });

      for (const symbol of routes) {
        items.push(symbolItem(symbol, generation));

        for (const edge of facts.outgoing(symbol.id, [...ROUTE_EDGES, ...EVENT_EDGES])) {
          items.push(edgeItem(edge, generation));
        }

        for (const edge of facts.incoming(symbol.id, [...ROUTE_EDGES, ...EVENT_EDGES])) {
          items.push(edgeItem(edge, generation));
        }
      }

      break;
    }

    case 'fleet_dependency': {
      const fleet = facts.fleet();

      if (fleet) {
        for (const projectId of [...fleet.registeredProjects].sort()) {
          const availability = fleet.staleProjects.includes(projectId)
            ? 'stale'
            : fleet.missingProjects.includes(projectId)
              ? 'missing'
              : 'available';

          items.push({
            origin: 'fleet',
            kind: 'project',
            id: `fleet:${projectId}`,
            projectId,
            availability,
          });
        }
      }

      break;
    }

    case 'query':
    default: {
      const capabilityEdge = request.options?.edgeType;

      const query = request.subject?.query ?? request.subject?.name;

      if (capabilityEdge) {
        for (const edge of facts
          .symbols()
          .flatMap((symbol) => facts.outgoing(symbol.id, [capabilityEdge]))) {
          items.push(edgeItem(edge, generation));
        }
      } else if (query) {
        for (const symbol of facts
          .symbols()
          .filter(
            (candidate) =>
              candidate.name.includes(query) || (candidate.qualifiedName?.includes(query) ?? false)
          )) {
          items.push(symbolItem(symbol, generation));
        }
      }

      break;
    }
  }

  return {
    items: sortItems(dedupeItems(items)),
    deadCodeParticipation,
  };
}

function isRelevantGap(gap: EvidenceGap, plan: EvidencePlan): boolean {
  if (gap.capability === 'source_fallback') {
    return false;
  }

  const capabilityRequired = plan.requirements.some(
    (requirement) => requirement.capability === gap.capability
  );

  const structurallyRelevant = gap.kind === 'parse_failure' || gap.kind === 'unsupported_language';

  if (!capabilityRequired && !structurallyRelevant) {
    return false;
  }

  if (plan.scope.kind === 'path' && gap.path && plan.scope.paths) {
    return plan.scope.paths.some(
      (prefix) => gap.path === prefix || gap.path!.startsWith(`${prefix}/`)
    );
  }

  return true;
}

export function executeEvidenceSync(options: ExecuteEvidenceOptions): EvidenceBundle {
  const { request, facts } = options;

  const plan = planEvidence(request);

  const collection = collectForOperation(facts, request, plan);

  const pagination = collectPages(collection.items, plan.limits, {
    exhaust: plan.needPaginationComplete,
    ...(facts.staleAfterPage !== undefined ? { staleAfterPage: facts.staleAfterPage } : {}),
  });

  const gaps = facts.gaps();

  const relevantGaps = gaps.filter((gap) => isRelevantGap(gap, plan));

  const unresolved: EvidenceUnresolvedReport = {
    total: gaps.length,
    relevant: relevantGaps.filter((gap) => gap.kind === 'unresolved_reference').length,
    ambiguous: relevantGaps.filter((gap) => gap.kind === 'ambiguous_reference').length,
    dynamic: relevantGaps.filter((gap) => gap.kind === 'dynamic_target').length,
    items: relevantGaps.slice(0, 200),
  };

  const needle =
    request.subject?.name ??
    (request.subject?.symbolId
      ? (facts.symbolById(request.subject.symbolId)?.name ?? request.subject.symbolId)
      : undefined);

  const fallback = plan.needSourceFallback
    ? runSourceFallback({
        facts,
        gaps: relevantGaps,
        scope: plan.scope,
        ...(needle ? { needle } : {}),
      })
    : {
        report: {
          requested: false,
          performed: false,
          gapsChecked: [],
          matches: 0,
          skipped: [],
        },
        items: [] as EvidenceItem[],
        blockers: [] as string[],
        unclosedGaps: [] as EvidenceGap[],
      };

  const coverage = combineCoverage(facts, plan.requirements, request.options?.edgeType);

  const runtimeEvidence = resolveRuntimeEvidence(facts, request);

  const current = facts.currentGeneration();

  /*
   * A caller may pin the generation it believes it is auditing. A mismatch is
   * reported as a stale-generation blocker rather than silently auditing the
   * newer graph the caller never agreed to.
   */
  const expected = request.options?.expectedGeneration;

  const expectedMismatch = expected !== undefined && expected !== facts.generation;

  const evaluation = evaluateClaim({
    plan,
    coverage,
    generation: { current, changed: current !== facts.generation, expectedMismatch },
    freshness: facts.freshness,
    pagination,
    unresolved,
    sourceFallbackBlockers: fallback.blockers,
    fleet: facts.fleet(),
    crossService: facts.crossService(),
    deadCodeParticipation: collection.deadCodeParticipation,
    runtimeExecuted: runtimeEvidence.executed,
  });

  const fleet = facts.fleet();

  return buildEvidenceBundle({
    plan,
    generation: {
      project: facts.generation,
      ...(fleet ? { fleet: fleet.generation } : {}),
    },
    evidence: [...pagination.items, ...fallback.items, ...runtimeEvidence.items],
    pagination: {
      complete: pagination.complete,
      pages: pagination.pages,
      rows: pagination.rows,
      truncated: pagination.truncated,
    },
    coverage: coverage.entries,
    sourceFallback: fallback.report,
    unresolved,
    safety: evaluation.safety,
    runtime: runtimeEvidence.report,
    complete: evaluation.complete,
    limitations: evaluation.limitations,
    adrConstraints: request.adrConstraints ?? [],
  });
}

export async function executeEvidence(options: ExecuteEvidenceOptions): Promise<EvidenceBundle> {
  return executeEvidenceSync(options);
}
