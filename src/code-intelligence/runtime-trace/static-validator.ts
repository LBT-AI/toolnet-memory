/*
 * Phase 79 — static graph validation of runtime observations.
 *
 * This module answers one question per runtime relation: "how does this line up
 * with the static graph?" It NEVER writes to the graph.
 *
 *   A CALLS B          + runtime A -> B     => validates_static_edge
 *   A CALL_REFERENCE B + runtime A -> Impl  => dynamic_dispatch
 *   no static edge     + runtime A -> B     => not_in_static_graph
 *                                             (diagnostic, never a contradiction)
 *   identity mismatch                       => identity_conflict
 */

import { ownValue } from './sanitize.js';

import { observationId, runtimeCompatibility, symbolRefKey } from './identity.js';

import { matchServiceRef, matchSymbolRef, type SymbolMatchIndex } from './matcher.js';

import type { RuntimeTraceDiagnosticCode } from './diagnostics.js';

import type {
  FleetParticipantRef,
  RuntimeCompatibility,
  RuntimeObservation,
  RuntimeRelationKind,
  RuntimeSymbolRef,
  RuntimeTraceEvent,
  RuntimeValidationState,
} from './types.js';

import type { EvidenceRuntimeFacts } from '../evidence/types.js';

import type { CodeSymbol, GraphEdge } from '../../core/types.js';

import type { CodeGraphStore } from '../graph/graph-store.js';

/** Edge vocabulary a plain runtime call can corroborate. */
const CALL_EDGE_TYPES: readonly string[] = ['CALLS', 'RPC_CALLS', 'GRAPHQL_CALLS', 'TRPC_CALLS'];

const DISPATCH_REFERENCE_TYPES: readonly string[] = ['CALL_REFERENCE'];

const DISPATCH_IMPLEMENTATION_TYPES: readonly string[] = ['IMPLEMENTS', 'INHERITS', 'OVERRIDES'];

const HTTP_EDGE_TYPES: readonly string[] = ['HTTP_CALLS'];

const EVENT_EDGE_TYPES: readonly string[] = ['EMITS', 'LISTENS_ON'];

export interface StaticGraphIndex {
  projectId: string;
  byId: Map<string, CodeSymbol>;
  routes: CodeSymbol[];
  events: CodeSymbol[];
  incoming: Map<string, GraphEdge[]>;
  outgoing: Map<string, GraphEdge[]>;
  matches: SymbolMatchIndex;
}

export function buildStaticGraphIndex(
  graph: CodeGraphStore,
  projectId: string,
  matches: SymbolMatchIndex
): StaticGraphIndex {
  const byId = new Map<string, CodeSymbol>();

  const routes: CodeSymbol[] = [];

  const events: CodeSymbol[] = [];

  const incoming = new Map<string, GraphEdge[]>();

  const outgoing = new Map<string, GraphEdge[]>();

  for (const symbol of graph.allSymbols(projectId)) {
    byId.set(symbol.id, symbol);

    if (symbol.type === 'route') {
      routes.push(symbol);
    }

    if (symbol.type === 'event') {
      events.push(symbol);
    }
  }

  for (const edge of graph.allEdges(projectId)) {
    const out = outgoing.get(edge.from) ?? [];
    out.push(edge);
    outgoing.set(edge.from, out);

    const inc = incoming.get(edge.to) ?? [];
    inc.push(edge);
    incoming.set(edge.to, inc);
  }

  return {
    projectId,
    byId,
    routes: routes.sort((left, right) => left.id.localeCompare(right.id)),
    events: events.sort((left, right) => left.id.localeCompare(right.id)),
    incoming,
    outgoing,
    matches,
  };
}

function metadataString(symbol: CodeSymbol, key: string): string | undefined {
  const value = ownValue(symbol.metadata, key);

  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** Tracked route symbol for a canonical HTTP method + path. Exact match only. */
export function findRouteSymbol(
  index: StaticGraphIndex,
  method: string,
  path: string
): { status: 'matched' | 'unresolved' | 'ambiguous'; symbol?: CodeSymbol } {
  const candidates = index.routes.filter((symbol) => {
    const routePath = metadataString(symbol, 'path') ?? symbol.name;

    if (routePath !== path) {
      return false;
    }

    const routeMethod = metadataString(symbol, 'method')?.toUpperCase();

    return routeMethod === undefined || routeMethod === method;
  });

  if (candidates.length === 1) {
    return { status: 'matched', symbol: candidates[0]! };
  }

  return candidates.length > 1 ? { status: 'ambiguous' } : { status: 'unresolved' };
}

/** Tracked event channel symbol for a provider + channel. Exact match only. */
export function findEventSymbol(
  index: StaticGraphIndex,
  provider: string,
  channel: string
): { status: 'matched' | 'unresolved' | 'ambiguous'; symbol?: CodeSymbol } {
  const candidates = index.events.filter((symbol) => {
    const symbolChannel = metadataString(symbol, 'channel') ?? symbol.name;

    if (symbolChannel !== channel) {
      return false;
    }

    const symbolProvider = metadataString(symbol, 'provider');

    return symbolProvider === undefined || symbolProvider === provider;
  });

  if (candidates.length === 1) {
    return { status: 'matched', symbol: candidates[0]! };
  }

  return candidates.length > 1 ? { status: 'ambiguous' } : { status: 'unresolved' };
}

function outgoingOfType(
  index: StaticGraphIndex,
  from: string,
  types: readonly string[]
): GraphEdge[] {
  return (index.outgoing.get(from) ?? []).filter((edge) => types.includes(String(edge.type)));
}

function incomingOfType(
  index: StaticGraphIndex,
  to: string,
  types: readonly string[]
): GraphEdge[] {
  return (index.incoming.get(to) ?? []).filter((edge) => types.includes(String(edge.type)));
}

/**
 * Interface/base symbols the target implements, walking two implementation hops.
 *
 * `Impl IMPLEMENTS Interface` is an outgoing edge from the implementation, so
 * the walk goes outward from the observed target.
 */
function implementedAncestors(index: StaticGraphIndex, symbolId: string): Set<string> {
  const ancestors = new Set<string>();

  for (const edge of outgoingOfType(index, symbolId, DISPATCH_IMPLEMENTATION_TYPES)) {
    ancestors.add(edge.to);

    for (const second of outgoingOfType(index, edge.to, DISPATCH_IMPLEMENTATION_TYPES)) {
      ancestors.add(second.to);
    }
  }

  return ancestors;
}

function identityConflict(index: StaticGraphIndex, ref: RuntimeSymbolRef | undefined): boolean {
  if (!ref?.symbolId) {
    return false;
  }

  const symbol = index.byId.get(ref.symbolId);

  if (!symbol) {
    return false;
  }

  if (symbol.projectId !== index.projectId) {
    return true;
  }

  const claimed = ref.filePath;

  if (claimed && symbol.filePath) {
    const left = claimed.replaceAll('\\', '/');

    const right = symbol.filePath.replaceAll('\\', '/');

    return left !== right && !left.endsWith(right) && !right.endsWith(left);
  }

  return false;
}

interface RelationDraft {
  kind: RuntimeRelationKind;
  source: RuntimeSymbolRef;
  target: RuntimeSymbolRef;
  sourceKey: string;
  targetKey: string;
  event: RuntimeTraceEvent;
  validation: RuntimeValidationState;
  diagnostics: RuntimeTraceDiagnosticCode[];
  staticEdgeIds: string[];
}

function unresolvedDraft(input: {
  kind: RuntimeRelationKind;
  source: RuntimeSymbolRef;
  target: RuntimeSymbolRef;
  sourceKey: string;
  targetKey: string;
  event: RuntimeTraceEvent;
  validation: RuntimeValidationState;
  diagnostics: RuntimeTraceDiagnosticCode[];
}): RelationDraft {
  return { ...input, staticEdgeIds: [] };
}

function callDraft(
  index: StaticGraphIndex,
  event: RuntimeTraceEvent & { kind: 'call' }
): RelationDraft {
  const sourceKey = symbolRefKey(event.caller) ?? 'unknown';

  const targetKey = symbolRefKey(event.callee) ?? 'unknown';

  const base = {
    source: event.caller,
    target: event.callee,
    sourceKey,
    targetKey,
    event,
  };

  if (identityConflict(index, event.caller) || identityConflict(index, event.callee)) {
    return unresolvedDraft({
      ...base,
      kind: 'call',
      validation: 'identity_conflict',
      diagnostics: ['RUNTIME_IDENTITY_CONFLICT', 'TRACE_IDENTITY_CONFLICT'],
    });
  }

  const sourceMatch = matchSymbolRef(index.matches, event.caller);

  const targetMatch = matchSymbolRef(index.matches, event.callee);

  if (sourceMatch.status === 'ambiguous' || targetMatch.status === 'ambiguous') {
    return unresolvedDraft({
      ...base,
      kind: 'call',
      validation: 'ambiguous',
      diagnostics: ['TRACE_SYMBOL_AMBIGUOUS'],
    });
  }

  if (sourceMatch.status !== 'matched' || targetMatch.status !== 'matched') {
    return unresolvedDraft({
      ...base,
      kind: 'call',
      validation: 'unresolved',
      diagnostics: ['TRACE_SYMBOL_UNRESOLVED'],
    });
  }

  const sourceSymbol = sourceMatch.symbol;

  const targetSymbol = targetMatch.symbol;

  /*
   * Enrich the observation with the resolved static identity. The relation key
   * still comes from the runtime reference, so identity stays stable no matter
   * how the caller described it.
   */
  const resolved = {
    source: resolvedRef(sourceSymbol, event.caller),
    target: resolvedRef(targetSymbol, event.callee),
  };

  const direct = outgoingOfType(index, sourceSymbol.id, CALL_EDGE_TYPES).filter(
    (edge) => edge.to === targetSymbol.id
  );

  if (direct.length > 0) {
    return {
      ...base,
      ...resolved,
      kind: 'call',
      validation: 'validates_static_edge',
      diagnostics: ['RUNTIME_OBSERVED'],
      staticEdgeIds: direct.map((edge) => edge.id).sort(),
    };
  }

  /*
   * Dynamic dispatch: the static graph has A CALL_REFERENCE B and the runtime
   * observed A -> Impl where Impl implements B. The observation is dispatch
   * evidence; the static CALL_REFERENCE is never rewritten into CALLS.
   */
  const references = outgoingOfType(index, sourceSymbol.id, DISPATCH_REFERENCE_TYPES);

  const ancestors = implementedAncestors(index, targetSymbol.id);

  const dispatch = references.filter(
    (edge) => edge.to === targetSymbol.id || ancestors.has(edge.to)
  );

  if (dispatch.length > 0) {
    return {
      ...base,
      ...resolved,
      kind: 'dispatch',
      validation: 'dynamic_dispatch',
      diagnostics: ['RUNTIME_DISPATCH_OBSERVED'],
      staticEdgeIds: dispatch.map((edge) => edge.id).sort(),
    };
  }

  return unresolvedDraft({
    ...base,
    ...resolved,
    kind: 'call',
    validation: 'not_in_static_graph',
    diagnostics: ['RUNTIME_RELATION_NOT_IN_STATIC_GRAPH'],
  });
}

/** A reference enriched with its resolved static identity, when known. */
function resolvedRef(symbol: CodeSymbol, fallback: RuntimeSymbolRef): RuntimeSymbolRef {
  return {
    symbolId: symbol.id,
    name: symbol.name,
    ...(symbol.qualifiedName ? { qualifiedName: symbol.qualifiedName } : {}),
    ...(symbol.filePath ? { filePath: symbol.filePath } : {}),
    ...(fallback.module ? { module: fallback.module } : {}),
  };
}

/**
 * Resolve a runtime target to a registered Fleet participant.
 *
 * Exact identity only: project id, project name, or a declared service name.
 * A matching URL/host string alone is deliberately NOT sufficient.
 */
export function matchFleetParticipant(
  participants: readonly FleetParticipantRef[],
  target: { serviceId?: string; host?: string }
): FleetParticipantRef | undefined {
  const keys = new Set<string>();

  if (target.serviceId) {
    keys.add(target.serviceId.toLowerCase());
  }

  if (target.host) {
    const host = target.host.split(':')[0]!.toLowerCase();

    keys.add(host);
    keys.add(host.split('.')[0]!);
  }

  if (keys.size === 0) {
    return undefined;
  }

  const matches = participants.filter((participant) => {
    const candidates = [
      participant.projectId,
      participant.name,
      ...(participant.serviceNames ?? []),
    ];

    return candidates.some((candidate) => keys.has(candidate.toLowerCase()));
  });

  /* More than one participant claiming the same target is never guessed. */
  return matches.length === 1 ? matches[0] : undefined;
}

interface CrossRepoResult {
  participant: FleetParticipantRef;
}

function httpDraft(
  index: StaticGraphIndex,
  event: RuntimeTraceEvent & { kind: 'http' },
  fleet: readonly FleetParticipantRef[]
): RelationDraft & Partial<CrossRepoResult> {
  const service: RuntimeSymbolRef = event.serviceId
    ? { symbolId: event.serviceId, name: event.serviceId }
    : event.host
      ? { name: event.host }
      : {};

  const sourceKey = event.serviceId
    ? `service:${event.serviceId}`
    : event.host
      ? `service:${event.host}`
      : 'service:unknown';

  const targetKey = `http:${event.method} ${event.path}`;

  const route = findRouteSymbol(index, event.method, event.path);

  const base = {
    source: service,
    target: { name: `${event.method} ${event.path}` },
    sourceKey,
    targetKey,
    event,
  };

  if (route.status === 'ambiguous') {
    return unresolvedDraft({
      ...base,
      kind: 'http',
      validation: 'ambiguous',
      diagnostics: ['TRACE_SERVICE_UNRESOLVED'],
    });
  }

  if (route.status !== 'matched' || !route.symbol) {
    /*
     * No tracked local route. A runtime target may still be a registered Fleet
     * participant — but only when its identity matches exactly. Otherwise the
     * target stays unresolved rather than being linked by URL similarity.
     */
    const participant = matchFleetParticipant(fleet, {
      ...(event.serviceId ? { serviceId: event.serviceId } : {}),
      ...(event.host ? { host: event.host } : {}),
    });

    if (participant) {
      return {
        ...base,
        kind: 'cross_repo',
        target: { name: `${event.method} ${event.path}` },
        validation: 'not_in_static_graph',
        diagnostics: ['RUNTIME_OBSERVED', 'RUNTIME_RELATION_NOT_IN_STATIC_GRAPH'],
        staticEdgeIds: [],
        participant,
      };
    }

    return unresolvedDraft({
      ...base,
      kind: 'http',
      validation: 'unresolved',
      diagnostics: ['TRACE_SERVICE_UNRESOLVED'],
    });
  }

  const routeSymbol = route.symbol;

  const serviceMatch =
    event.serviceId || event.host
      ? matchServiceRef(index.matches, {
          ...(event.serviceId ? { serviceId: event.serviceId } : {}),
          ...(event.host ? { host: event.host } : {}),
        })
      : { status: 'unresolved' as const };

  const incomingCalls = incomingOfType(index, routeSymbol.id, HTTP_EDGE_TYPES);

  const matching =
    serviceMatch.status === 'matched' && serviceMatch.symbol
      ? incomingCalls.filter((edge) => edge.from === serviceMatch.symbol?.id)
      : incomingCalls;

  if (matching.length > 0) {
    return {
      ...base,
      source:
        serviceMatch.status === 'matched' && serviceMatch.symbol
          ? { symbolId: serviceMatch.symbol.id, name: serviceMatch.symbol.name }
          : service,
      target: { symbolId: routeSymbol.id, name: routeSymbol.name },
      kind: 'http',
      validation: 'validates_static_edge',
      diagnostics: ['RUNTIME_OBSERVED'],
      staticEdgeIds: matching.map((edge) => edge.id).sort(),
    };
  }

  /*
   * The route exists but nothing in the static graph calls it from the observed
   * source. Reported as a runtime-only relation: never a graph mutation and
   * never proof that no client exists.
   */
  return unresolvedDraft({
    ...base,
    target: { symbolId: routeSymbol.id, name: routeSymbol.name },
    kind: 'http',
    validation: 'not_in_static_graph',
    diagnostics: ['RUNTIME_RELATION_NOT_IN_STATIC_GRAPH'],
  });
}

function eventDraft(
  index: StaticGraphIndex,
  event: RuntimeTraceEvent & { kind: 'event_emit' | 'event_consume' }
): RelationDraft {
  const isEmit = event.kind === 'event_emit';

  const kind: RuntimeRelationKind = isEmit ? 'event_emit' : 'event_consume';

  const actor: RuntimeSymbolRef = isEmit ? event.producer : event.consumer;

  const sourceKey = symbolRefKey(actor) ?? 'unknown';

  const targetKey = `channel:${event.provider}:${event.channel}`;

  const base = {
    source: actor,
    target: { name: event.channel },
    sourceKey,
    targetKey,
    event,
  };

  const channel = findEventSymbol(index, event.provider, event.channel);

  if (channel.status === 'ambiguous') {
    return unresolvedDraft({
      ...base,
      kind,
      validation: 'ambiguous',
      diagnostics: ['TRACE_SYMBOL_AMBIGUOUS'],
    });
  }

  const actorMatch = matchSymbolRef(index.matches, actor);

  if (actorMatch.status === 'ambiguous') {
    return unresolvedDraft({
      ...base,
      kind,
      validation: 'ambiguous',
      diagnostics: ['TRACE_SYMBOL_AMBIGUOUS'],
    });
  }

  if (channel.status !== 'matched' || !channel.symbol) {
    return unresolvedDraft({
      ...base,
      kind,
      validation: 'unresolved',
      diagnostics: ['TRACE_SYMBOL_UNRESOLVED'],
    });
  }

  const channelSymbol = channel.symbol;

  if (actorMatch.status !== 'matched') {
    return unresolvedDraft({
      ...base,
      target: { symbolId: channelSymbol.id, name: channelSymbol.name },
      kind,
      validation: 'unresolved',
      diagnostics: ['TRACE_SYMBOL_UNRESOLVED'],
    });
  }

  const expected = isEmit ? 'EMITS' : 'LISTENS_ON';

  const edges = outgoingOfType(index, actorMatch.symbol.id, EVENT_EDGE_TYPES).filter(
    (edge) => edge.to === channelSymbol.id && String(edge.type) === expected
  );

  return {
    ...base,
    source: resolvedRef(actorMatch.symbol, actor),
    target: { symbolId: channelSymbol.id, name: channelSymbol.name },
    kind,
    validation: edges.length > 0 ? 'validates_static_edge' : 'not_in_static_graph',
    diagnostics: edges.length > 0 ? ['RUNTIME_OBSERVED'] : ['RUNTIME_RELATION_NOT_IN_STATIC_GRAPH'],
    staticEdgeIds: edges.map((edge) => edge.id).sort(),
  };
}

/**
 * Derive producer→consumer flows.
 *
 * A flow is asserted only when a producer emit and a consumer receive share a
 * deterministic correlation identity in the same import. Timestamp proximity is
 * never used: an event observed 10ms later is not a consequence.
 */
function eventFlowDrafts(
  index: StaticGraphIndex,
  events: readonly RuntimeTraceEvent[]
): RelationDraft[] {
  const emits = events.filter(
    (event): event is RuntimeTraceEvent & { kind: 'event_emit' } => event.kind === 'event_emit'
  );

  const consumes = events.filter(
    (event): event is RuntimeTraceEvent & { kind: 'event_consume' } =>
      event.kind === 'event_consume'
  );

  const drafts: RelationDraft[] = [];

  for (const emit of emits) {
    if (!emit.correlationId) {
      continue;
    }

    const matched = consumes.filter(
      (consume) =>
        consume.correlationId === emit.correlationId &&
        consume.provider === emit.provider &&
        consume.channel === emit.channel
    );

    for (const consume of matched) {
      const sourceKey = symbolRefKey(emit.producer) ?? 'unknown';

      const targetKey = symbolRefKey(consume.consumer) ?? 'unknown';

      const producerMatch = matchSymbolRef(index.matches, emit.producer);

      const consumerMatch = matchSymbolRef(index.matches, consume.consumer);

      const diagnostics: RuntimeTraceDiagnosticCode[] = ['RUNTIME_OBSERVED'];

      let validation: RuntimeValidationState = 'validates_static_edge';

      const staticEdgeIds: string[] = [];

      if (producerMatch.status === 'matched' && consumerMatch.status === 'matched') {
        const listens = incomingOfType(index, consumerMatch.symbol.id, ['LISTENS_ON']);

        const chain = outgoingOfType(index, producerMatch.symbol.id, ['EMITS']).filter((edge) =>
          listens.some((listen) => listen.to === edge.to)
        );

        staticEdgeIds.push(...chain.map((edge) => edge.id).sort());

        if (chain.length === 0) {
          validation = 'not_in_static_graph';

          diagnostics.push('RUNTIME_RELATION_NOT_IN_STATIC_GRAPH');
        }
      } else {
        validation = 'unresolved';

        diagnostics.push('TRACE_SYMBOL_UNRESOLVED');
      }

      drafts.push({
        kind: 'event_flow',
        source: emit.producer,
        target: consume.consumer,
        sourceKey,
        targetKey,
        event: consume,
        validation,
        diagnostics,
        staticEdgeIds,
      });
    }
  }

  return drafts;
}

export interface ValidatedTraceDocument {
  observations: RuntimeObservation[];
  compatibility: RuntimeCompatibility;
  diagnostics: RuntimeTraceDiagnosticCode[];
}

/**
 * Turn normalized events into aggregated, statically-validated observations.
 * The static graph is read-only throughout.
 */
export function validateTraceDocument(input: {
  events: readonly RuntimeTraceEvent[];
  index: StaticGraphIndex;
  projectId: string;
  traceGeneration?: string;
  graphGeneration?: string;
  sourceManifestHash?: string;
  /** Registered Fleet participants, used only for exact cross-repo identity. */
  fleetParticipants?: readonly FleetParticipantRef[];
}): ValidatedTraceDocument {
  const fleet = input.fleetParticipants ?? [];

  const drafts: Array<RelationDraft & Partial<CrossRepoResult>> = [];

  for (const event of input.events) {
    if (event.kind === 'call') {
      drafts.push(callDraft(input.index, event));
      continue;
    }

    if (event.kind === 'http') {
      drafts.push(httpDraft(input.index, event, fleet));
      continue;
    }

    drafts.push(eventDraft(input.index, event));
  }

  drafts.push(...eventFlowDrafts(input.index, input.events));

  const compatibility = runtimeCompatibility(
    input.traceGeneration,
    input.graphGeneration,
    input.sourceManifestHash
  );

  const diagnostics: RuntimeTraceDiagnosticCode[] = [];

  if (compatibility === 'stale') {
    diagnostics.push('TRACE_GENERATION_STALE');
  } else if (compatibility === 'unknown') {
    diagnostics.push('TRACE_GENERATION_UNKNOWN');
  }

  const grouped = new Map<string, Array<RelationDraft & Partial<CrossRepoResult>>>();

  for (const draft of drafts) {
    const key = `${draft.kind}|${draft.sourceKey}|${draft.targetKey}`;

    const list = grouped.get(key) ?? [];

    list.push(draft);

    grouped.set(key, list);
  }

  const observations: RuntimeObservation[] = [];

  const orderedGroups = [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, group]) => group);

  for (const group of orderedGroups) {
    const first = group[0]!;

    const eventIds = [...new Set(group.map((draft) => draft.event.eventId))].sort();

    const timestamps = group
      .map((draft) => draft.event.timestamp)
      .filter((value): value is string => typeof value === 'string')
      .sort();

    const sessionIds = [...new Set(group.map((draft) => draft.event.sessionId))].sort();

    const groupDiagnostics = [
      ...new Set(group.flatMap((draft) => draft.diagnostics)),
    ].sort() as RuntimeTraceDiagnosticCode[];

    const staticEdgeIds = [...new Set(group.flatMap((draft) => draft.staticEdgeIds))].sort();

    const fallbackTimestamp = new Date(0).toISOString();

    observations.push({
      id: observationId({
        projectId: input.projectId,
        kind: first.kind,
        sourceKey: first.sourceKey,
        targetKey: first.targetKey,
      }),
      projectId: input.projectId,
      kind: first.kind,
      source: first.source,
      target: first.target,
      ...(first.source.symbolId ? { sourceSymbolId: first.source.symbolId } : {}),
      ...(first.target.symbolId ? { targetSymbolId: first.target.symbolId } : {}),
      staticEdgeIds,
      validation: first.validation,
      diagnostics: groupDiagnostics,
      observationCount: eventIds.length,
      sessionIds,
      sessionCount: sessionIds.length,
      sampleEventIds: eventIds.slice(0, 8),
      firstObservedAt: timestamps[0] ?? fallbackTimestamp,
      lastObservedAt: timestamps.at(-1) ?? fallbackTimestamp,
      compatibility,
      ...(first.participant ? { crossProjectId: first.participant.projectId } : {}),
    });
  }

  return { observations, compatibility, diagnostics };
}

/** Empty runtime facts, used when a project has never imported a trace. */
export function emptyRuntimeFacts(): EvidenceRuntimeFacts {
  return {
    available: false,
    compatibility: 'unknown',
    sessions: 0,
    observations: 0,
    relevant: [],
    executedSymbolIds: [],
    reasons: [],
  };
}
