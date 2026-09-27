/*
 * Phase 81 — contract consumer mapping.
 *
 * Maps changed contract surfaces onto known consumers through the graph and the
 * registered Fleet scope. Consumer evidence never influences structural
 * compatibility: a breaking change with zero known consumers is still breaking.
 *
 * Reserved protocol vocabulary is respected: a cross-repo edge type with no
 * producer leaves consumer coverage PARTIAL rather than "complete".
 */

import type {
  ConsumerImpact,
  ContractDelta,
  ContractFacts,
  ContractLimits,
  ContractSymbol,
} from './types.js';

const EDGE_VOCABULARY: Record<string, readonly string[]> = {
  http: ['HTTP_CALLS'],
  openapi: ['HTTP_CALLS'],
  graphql: ['GRAPHQL_CALLS'],
  grpc: ['RPC_CALLS'],
  type: ['USES_TYPE', 'IMPLEMENTS', 'CALL_REFERENCE'],
  package_export: ['IMPORTS'],
  event: ['LISTENS_ON', 'EMITS'],
  json_schema: ['USES_TYPE'],
};

export interface ConsumerDiscoveryResult {
  consumers: ConsumerImpact[];
  partial: boolean;
  reasons: string[];
  truncated: boolean;
}

function symbolsFor(delta: ContractDelta, facts: ContractFacts): ContractSymbol[] {
  const symbols = facts.graph.symbols();

  const identity = delta.identity;

  if (delta.kind === 'event') {
    const channel = identity.startsWith('event:') ? identity.slice('event:'.length) : identity;

    return symbols.filter(
      (symbol) => symbol.type === 'event' && (symbol.name === channel || symbol.name === identity)
    );
  }

  if (delta.kind === 'http' || delta.kind === 'openapi') {
    return symbols.filter(
      (symbol) =>
        symbol.type === 'route' && (symbol.name === identity || symbol.qualifiedName === identity)
    );
  }

  /* Type / gRPC operation / package identities match on the symbol name. */
  return symbols.filter((symbol) => symbol.name === identity || symbol.qualifiedName === identity);
}

export function findConsumers(input: {
  deltas: readonly ContractDelta[];
  facts: ContractFacts;
  limits: ContractLimits;
}): ConsumerDiscoveryResult {
  const { deltas, facts, limits } = input;

  const consumers = new Map<string, ConsumerImpact>();

  const reasons = new Set<string>();

  let partial = false;
  let truncated = false;

  for (const delta of deltas) {
    const edgeTypes = EDGE_VOCABULARY[delta.kind] ?? [];

    for (const symbol of symbolsFor(delta, facts)) {
      for (const edge of facts.graph.incoming(symbol.id, edgeTypes)) {
        if (consumers.size >= limits.maxConsumers) {
          truncated = true;
          break;
        }

        const consumer = facts.graph.symbolById(edge.from);

        if (!consumer) {
          continue;
        }

        const key = `${delta.contractId}:${consumer.id}:${edge.type}`;

        consumers.set(key, {
          contractId: delta.contractId,
          identity: delta.identity,
          relation: edge.type,
          symbolId: consumer.id,
          name: consumer.name,
          filePath: consumer.filePath,
          origin: 'local',
          projectId: facts.projectId,
        });
      }
    }

    /* Cross-repo consumers through exact Fleet identity only. */
    if (facts.fleetImpact && facts.fleet && delta.kind !== 'type') {
      const symbolIds = symbolsFor(delta, facts).map((symbol) => symbol.id);

      /* A package/event may have no local node, so its canonical identity is
         the Fleet resource identity. Never a URL or name resemblance. */
      const resourceIds =
        symbolIds.length > 0
          ? symbolIds
          : [delta.identity, delta.identity.replace(/^event:/u, '')].filter(
              (value) => value.length > 0
            );

      if (resourceIds.length > 0) {
        for (const impact of facts.fleetImpact(resourceIds).slice(0, limits.maxFleetProjects)) {
          const key = `${delta.contractId}:fleet:${impact.projectId}`;

          consumers.set(key, {
            contractId: delta.contractId,
            identity: delta.identity,
            relation: impact.steps.at(-1)?.edgeType ?? 'CROSS_REFERENCE',
            symbolId: `fleet:${impact.projectId}`,
            name: impact.projectId,
            filePath: '',
            origin: 'fleet',
            projectId: impact.projectId,
          });
        }
      }
    }
  }

  /* Reserved-capability honesty: a producer-less edge vocabulary is partial. */
  if (facts.capabilityProduced) {
    for (const delta of deltas) {
      for (const edgeType of EDGE_VOCABULARY[delta.kind] ?? []) {
        if (!facts.capabilityProduced('cross_service_graph', edgeType)) {
          partial = true;
          reasons.add('CONSUMER_COVERAGE_PARTIAL');
        }
      }
    }
  }

  if (
    facts.fleet &&
    (facts.fleet.staleProjects.length > 0 || facts.fleet.missingProjects.length > 0)
  ) {
    partial = true;
    reasons.add('FLEET_STALE');
  }

  const list = [...consumers.values()].sort(
    (left, right) =>
      left.contractId.localeCompare(right.contractId) ||
      left.origin.localeCompare(right.origin) ||
      left.symbolId.localeCompare(right.symbolId)
  );

  /* Runtime corroboration is additive and never removes a consumer. */
  if (facts.runtime) {
    const subjectIds = [...new Set(list.flatMap((consumer) => [consumer.symbolId]))].sort();

    const runtimeObservations = subjectIds.length > 0 ? facts.runtime(subjectIds) : [];

    const observed = new Set<string>();

    for (const observation of runtimeObservations) {
      if (observation.source.symbolId) {
        observed.add(observation.source.symbolId);
      }

      if (observation.target.symbolId) {
        observed.add(observation.target.symbolId);
      }
    }

    for (const consumer of list) {
      if (observed.has(consumer.symbolId)) {
        consumer.runtimeObserved = true;
        consumer.runtimeObservationCount = runtimeObservations.filter(
          (observation) =>
            observation.source.symbolId === consumer.symbolId ||
            observation.target.symbolId === consumer.symbolId
        ).length;
      }
    }
  }

  return { consumers: list, partial, reasons: [...reasons].sort(), truncated };
}
