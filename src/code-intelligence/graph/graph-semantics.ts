import { createHash } from 'node:crypto';

import type { GraphCapability } from '../graph-coverage/types.js';

import { EDGE_SEMANTIC_REGISTRY, type GraphEdgeType } from './edge-semantic-registry.js';

/**
 * Phase 71 — Graph semantics identity.
 *
 * The semantic graph has its own version axis, separate from package version,
 * parser fingerprint and resolution fingerprint. Changing edge meaning,
 * the factory or the relationship rules must invalidate previously persisted
 * graphs instead of silently reusing them.
 *
 * No timestamps are used as identity.
 */
export const GRAPH_SEMANTIC_SCHEMA_VERSION = 3;
export const EDGE_FACTORY_VERSION = 1;
export const RELATIONSHIP_RULES_VERSION = 2;

const EDGE_TYPES = (Object.keys(EDGE_SEMANTIC_REGISTRY) as GraphEdgeType[]).sort();

export function semanticFingerprint(): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        semanticSchemaVersion: GRAPH_SEMANTIC_SCHEMA_VERSION,
        edgeFactoryVersion: EDGE_FACTORY_VERSION,
        relationshipRulesVersion: RELATIONSHIP_RULES_VERSION,
        edgeTypes: EDGE_TYPES,
      })
    )
    .digest('hex');
}

/**
 * Central capability -> edge type mapping.
 *
 * A capability's negative-claim safety depends only on the edge types that
 * capability actually uses. DEFINES coverage must never be used to justify a
 * call-graph conclusion.
 */
export const CAPABILITY_EDGE_TYPES: Readonly<Record<GraphCapability, readonly GraphEdgeType[]>> = {
  lexical_search: [],
  symbol_graph: ['DEFINES'],
  dependency_graph: ['IMPORTS', 'USES_TYPE', 'INHERITS', 'IMPLEMENTS'],
  call_graph: ['CALLS', 'CALL_REFERENCE'],
  architecture: [
    'DEFINES',
    'IMPORTS',
    'CALLS',
    'CALL_REFERENCE',
    'INHERITS',
    'IMPLEMENTS',
    'USES_TYPE',
  ],
  impact_analysis: [
    'CALLS',
    'CALL_REFERENCE',
    'IMPORTS',
    'USES_TYPE',
    'INHERITS',
    'IMPLEMENTS',
    'READS',
    'WRITES',
    'ROUTE',
    'TESTS',
    'HTTP_CALLS',
    'RPC_CALLS',
    'GRAPHQL_CALLS',
    'TRPC_CALLS',
    'EMITS',
    'LISTENS_ON',
  ],
  /*
   * Phase 72 — cross-service capability.
   *
   * A negative cross-service claim is only justified when the protocol
   * linking edges are complete AND no unresolved/ambiguous reference remains.
   */
  cross_service_graph: [
    'HANDLES',
    'ROUTE',
    'HTTP_CALLS',
    'RPC_CALLS',
    'GRAPHQL_CALLS',
    'TRPC_CALLS',
    'EMITS',
    'LISTENS_ON',
  ],
};

export function edgeTypesForCapability(capability: GraphCapability): readonly GraphEdgeType[] {
  return CAPABILITY_EDGE_TYPES[capability] ?? [];
}

/**
 * One semantic authority per edge type.
 *
 * Used to detect when two producers both claim the same relationship, which is
 * the class of bug that previously allowed the same call to be created as a
 * CALLS edge by more than one stage.
 */
export function isPrimaryProducerOf(type: GraphEdgeType, origin: string): boolean {
  const definition = EDGE_SEMANTIC_REGISTRY[type];
  if (!definition) {
    return false;
  }
  return definition.primaryProducer === origin;
}
