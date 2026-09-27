/*
 * Phase 80 — impact expansion.
 *
 * Expands changed entities along reverse dependency edges, preserving the
 * semantic path that produced each impact (never a bare risk count). Direct and
 * transitive impact are separated; cross-service and cross-repo impact are
 * reported distinctly; runtime observations corroborate but never shrink the
 * static result.
 */

import type {
  ChangeFacts,
  ChangeGap,
  ChangeLimits,
  ChangedEntity,
  ImpactClassification,
  ImpactEvidence,
  ImpactPathStep,
  RuntimeImpactEvidence,
  TestImpact,
} from './types.js';

/** Reverse-dependency edge vocabulary that expresses real structural impact. */
const IMPACT_EDGES = [
  'CALLS',
  'CALL_REFERENCE',
  'USES_TYPE',
  'IMPORTS',
  'INHERITS',
  'IMPLEMENTS',
  'HANDLES',
  'HTTP_CALLS',
  'RPC_CALLS',
  'GRAPHQL_CALLS',
  'TRPC_CALLS',
  'EMITS',
  'LISTENS_ON',
  'ROUTE',
  'WRITES',
  'READS',
  'CONFIGURES',
] as const;

const CROSS_SERVICE_EDGES = new Set(['HTTP_CALLS', 'RPC_CALLS', 'GRAPHQL_CALLS', 'TRPC_CALLS']);

const CONTRACT_EDGES = new Set([
  'INHERITS',
  'IMPLEMENTS',
  'USES_TYPE',
  'ROUTE',
  'HANDLES',
  'EMITS',
  'LISTENS_ON',
]);

export interface ImpactInput {
  entities: readonly ChangedEntity[];
  facts: ChangeFacts;
  limits: ChangeLimits;
  includeCrossService: boolean;
  includeFleet: boolean;
  includeRuntimeEvidence: boolean;
}

export interface ImpactResult {
  directImpact: ImpactEvidence[];
  transitiveImpact: ImpactEvidence[];
  crossServiceImpact: ImpactEvidence[];
  crossRepoImpact: ImpactEvidence[];
  runtimeEvidence: RuntimeImpactEvidence[];
  tests: TestImpact;
  gaps: ChangeGap[];
  truncated: boolean;
}

function classificationsFor(edgeType: string, depth: number): ImpactClassification[] {
  const classification = new Set<ImpactClassification>();

  classification.add(depth === 1 ? 'direct' : 'transitive');

  if (CROSS_SERVICE_EDGES.has(edgeType)) {
    classification.add('cross_service');
  }

  if (CONTRACT_EDGES.has(edgeType)) {
    classification.add('contract');
  }

  return [...classification];
}

export function expandImpact(input: ImpactInput): ImpactResult {
  const directImpact = new Map<string, ImpactEvidence>();
  const transitiveImpact = new Map<string, ImpactEvidence>();
  const crossServiceImpact = new Map<string, ImpactEvidence>();
  const crossRepoImpact = new Map<string, ImpactEvidence>();

  const directTests = new Set<string>();
  const transitiveTests = new Set<string>();
  const coveredChanged = new Set<string>();

  const gaps: ChangeGap[] = [];

  let edgesInspected = 0;
  let truncated = false;

  const origins = input.entities.filter(
    (entity): entity is ChangedEntity & { symbolId: string } => typeof entity.symbolId === 'string'
  );

  const impactedSymbolIds = new Set<string>();

  for (const origin of origins) {
    const visited = new Set<string>([origin.symbolId]);

    const queue: Array<{ id: string; depth: number; path: ImpactPathStep[] }> = [
      { id: origin.symbolId, depth: 0, path: [] },
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.depth >= input.limits.maxImpactDepth) {
        continue;
      }

      const incoming = input.facts.graph.incoming(current.id, IMPACT_EDGES);

      for (const edge of incoming) {
        edgesInspected += 1;

        if (edgesInspected > input.limits.maxImpactEdges) {
          truncated = true;
          break;
        }

        if (visited.has(edge.from)) {
          continue;
        }

        const symbol = input.facts.graph.symbolById(edge.from);

        if (!symbol) {
          continue;
        }

        visited.add(edge.from);

        const depth = current.depth + 1;
        const path: ImpactPathStep[] = [
          ...current.path,
          { from: edge.from, to: edge.to, edgeType: edge.type },
        ];

        const key = `${origin.id}:${symbol.id}`;

        const evidence: ImpactEvidence = {
          symbolId: symbol.id,
          name: symbol.name,
          ...(symbol.qualifiedName ? { qualifiedName: symbol.qualifiedName } : {}),
          filePath: symbol.filePath,
          type: symbol.type,
          relation: edge.type,
          depth,
          classification: classificationsFor(edge.type, depth),
          origin: 'graph',
          projectId: input.facts.projectId,
          path,
        };

        if (CROSS_SERVICE_EDGES.has(edge.type) && input.includeCrossService) {
          crossServiceImpact.set(key, evidence);
        } else if (depth === 1) {
          directImpact.set(key, evidence);
        } else {
          transitiveImpact.set(key, evidence);
        }

        impactedSymbolIds.add(symbol.id);

        if (
          directImpact.size + transitiveImpact.size + crossServiceImpact.size >
          input.limits.maxImpactNodes
        ) {
          truncated = true;
          break;
        }

        queue.push({ id: symbol.id, depth, path });
      }

      if (truncated) {
        break;
      }
    }

    if (truncated) {
      break;
    }
  }

  /* Cross-repo impact through exact Fleet identity only. */
  if (input.includeFleet && input.facts.fleetImpact) {
    const resourceIds = origins.map((origin) => origin.symbolId);

    for (const impact of input.facts.fleetImpact(resourceIds)) {
      crossRepoImpact.set(`fleet:${impact.projectId}`, {
        symbolId: `fleet:${impact.projectId}`,
        name: impact.projectId,
        filePath: '',
        type: 'project',
        relation: impact.steps.at(-1)?.edgeType ?? 'CROSS_REFERENCE',
        depth: impact.depth,
        classification: ['cross_repo'],
        origin: 'fleet',
        projectId: impact.projectId,
        path: impact.steps,
      });
    }
  }

  const sortEvidence = (values: Iterable<ImpactEvidence>): ImpactEvidence[] =>
    [...values].sort(
      (left, right) =>
        left.depth - right.depth ||
        left.filePath.localeCompare(right.filePath) ||
        left.symbolId.localeCompare(right.symbolId)
    );

  const direct = sortEvidence(directImpact.values());
  const transitive = sortEvidence(transitiveImpact.values());

  /* Runtime corroboration is additive; it never removes a static impact. */
  const runtimeEvidence: RuntimeImpactEvidence[] = [];

  if (input.includeRuntimeEvidence && input.facts.runtime) {
    const subjectIds = [
      ...new Set([...origins.map((o) => o.symbolId), ...impactedSymbolIds]),
    ].sort();

    const observations = input.facts.runtime(subjectIds);

    const observedSymbols = new Set<string>();

    for (const observation of observations) {
      runtimeEvidence.push({
        id: observation.id,
        kind: observation.kind,
        validation: observation.validation,
        observationCount: observation.observationCount,
        sessionCount: observation.sessionCount,
        compatibility: observation.compatibility,
        source: observation.source,
        target: observation.target,
      });

      if (observation.source.symbolId) {
        observedSymbols.add(observation.source.symbolId);
      }
      if (observation.target.symbolId) {
        observedSymbols.add(observation.target.symbolId);
      }
    }

    for (const item of [...direct, ...transitive, ...crossServiceImpact.values()]) {
      if (observedSymbols.has(item.symbolId)) {
        item.runtimeObserved = true;
        item.runtimeObservationCount = runtimeEvidence.filter(
          (observation) =>
            observation.source.symbolId === item.symbolId ||
            observation.target.symbolId === item.symbolId
        ).length;
        if (!item.classification.includes('runtime_observed')) {
          item.classification = [...item.classification, 'runtime_observed'];
        }
      }
    }
  }

  /*
   * Tests are mapped through the deterministic TESTS edge, never guessed from
   * a filename. A mapped test is evidence of coverage, never a correctness
   * guarantee; test execution stays an explicit caller/CI action.
   */
  const testFilesFor = (symbolId: string): string[] =>
    input.facts.graph
      .incoming(symbolId, ['TESTS'])
      .map((entry) => input.facts.graph.symbolById(entry.from)?.filePath)
      .filter((value): value is string => typeof value === 'string' && value.length > 0);

  for (const origin of origins) {
    const direct = testFilesFor(origin.symbolId);

    if (direct.length > 0) {
      coveredChanged.add(origin.symbolId);
    }

    for (const filePath of direct) {
      directTests.add(filePath);
    }
  }

  for (const item of [...direct, ...transitive, ...crossServiceImpact.values()]) {
    for (const filePath of testFilesFor(item.symbolId)) {
      transitiveTests.add(filePath);
    }
  }

  const uncoveredChangedSymbols = origins
    .map((origin) => origin.symbolId)
    .filter((id) => !coveredChanged.has(id))
    .sort();

  const tests: TestImpact = {
    directTests: [...directTests].sort(),
    transitiveTests: [...transitiveTests].sort(),
    uncoveredChangedSymbols,
  };

  return {
    directImpact: direct,
    transitiveImpact: transitive,
    crossServiceImpact: sortEvidence(crossServiceImpact.values()),
    crossRepoImpact: sortEvidence(crossRepoImpact.values()),
    runtimeEvidence: runtimeEvidence.sort((left, right) => left.id.localeCompare(right.id)),
    tests,
    gaps,
    truncated,
  };
}
