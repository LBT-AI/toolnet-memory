/*
 * Phase 74 — TGQL schema registry.
 *
 * Single source of truth for the queryable graph schema. Project edge
 * definitions are derived from the Phase 71 semantic registry (never
 * re-declared), and Fleet edge definitions come from the Phase 73
 * cross-project vocabulary.
 *
 * `status` distinguishes vocabulary that has a real producer from vocabulary
 * that is reserved. Reserved edges stay queryable (the query is valid) but are
 * reported as `currentlyProduced: false`, so the schema never implies that
 * GraphQL/gRPC/tRPC relationships exist when no producer emits them.
 */

import { createHash } from 'node:crypto';

import type { CodeSymbol } from '../../core/types.js';

import { EDGE_SEMANTIC_REGISTRY, type GraphEdgeType } from '../graph/edge-semantic-registry.js';

import { GRAPH_SEMANTIC_SCHEMA_VERSION } from '../graph/graph-semantics.js';

import { GRAPH_CAPABILITIES, type GraphCapability } from '../graph-coverage/types.js';

import type { QueryEdgeType, QueryNodeType, QueryScope } from './types.js';

import { QUERY_NODE_TYPES, SYMBOL_NODE_TYPE } from './types.js';

import {
  DEFAULT_ROWS,
  MAX_DEPTH,
  MAX_EXPANSIONS,
  MAX_MATCH_PATTERNS,
  MAX_QUERY_LENGTH,
  MAX_QUERY_TOKENS,
  MAX_ROWS,
} from './limits.js';

export const QUERY_SCHEMA_VERSION = 1;
export const QUERY_GRAMMAR_VERSION = 1;

/* ------------------------------------------------------------------ *
 * Node schema
 * ------------------------------------------------------------------ */

const SYMBOL_PROPERTIES = [
  'id',
  'name',
  'qualifiedName',
  'filePath',
  'line',
  'endLine',
  'language',
  'projectId',
  'type',
  'scope',
] as const;

/**
 * Per-node-type property allowlist.
 *
 * Anything not listed here is rejected with INVALID_PROPERTY, so callers can
 * never reach raw metadata, credentials or internal storage fields.
 */
export const PROPERTY_ALLOWLIST: Readonly<Record<QueryNodeType, readonly string[]>> = {
  File: SYMBOL_PROPERTIES,
  Module: SYMBOL_PROPERTIES,
  Class: SYMBOL_PROPERTIES,
  Interface: SYMBOL_PROPERTIES,
  Function: SYMBOL_PROPERTIES,
  Method: SYMBOL_PROPERTIES,
  Route: [...SYMBOL_PROPERTIES, 'method', 'path', 'serviceId', 'handler'],
  Property: SYMBOL_PROPERTIES,
  Service: [...SYMBOL_PROPERTIES, 'kind', 'rootPath'],
  EventChannel: [...SYMBOL_PROPERTIES, 'provider', 'channel', 'direction'],

  /* Fleet scope. */
  Project: ['id', 'name', 'availability', 'stale', 'generation', 'remoteIdentity', 'projectId'],
  Package: ['id', 'name', 'source', 'manifest', 'projectId', 'type', 'scope'],
  HttpCall: ['id', 'method', 'path', 'host', 'filePath', 'line', 'projectId', 'type', 'scope'],
  PackageDependency: [
    'id',
    'name',
    'specifier',
    'local',
    'manifest',
    'source',
    'projectId',
    'type',
    'scope',
  ],
};

/**
 * Properties that are never queryable, regardless of node type. Kept explicit
 * so a test can prove the ban instead of relying on the allowlist staying
 * narrow by accident.
 */
export const DENIED_PROPERTIES: readonly string[] = [
  'metadata',
  'rawMetadata',
  'secret',
  'secrets',
  'token',
  'credentials',
  'password',
  'apiKey',
  'headers',
  'env',
  'source',
  'snippet',
  'body',
  'content',
];

export interface NodeSchemaDefinition {
  name: QueryNodeType;
  scope: QueryScope;
  properties: readonly string[];
}

export const NODE_SCHEMA: readonly NodeSchemaDefinition[] = QUERY_NODE_TYPES.map((name) => ({
  name,
  scope:
    name === 'Project' || name === 'Package' || name === 'HttpCall' || name === 'PackageDependency'
      ? 'fleet'
      : 'project',
  properties: PROPERTY_ALLOWLIST[name],
}));

export function isKnownNodeType(value: string): value is QueryNodeType {
  return (QUERY_NODE_TYPES as readonly string[]).includes(value);
}

export function nodeSchemaFor(type: QueryNodeType): NodeSchemaDefinition | undefined {
  return NODE_SCHEMA.find((definition) => definition.name === type);
}

export function isPropertyAllowed(type: QueryNodeType, property: string): boolean {
  if (DENIED_PROPERTIES.includes(property)) {
    return false;
  }
  return PROPERTY_ALLOWLIST[type]?.includes(property) ?? false;
}

/* ------------------------------------------------------------------ *
 * Edge schema
 * ------------------------------------------------------------------ */

export type EdgeStatus = 'active' | 'reserved';

export interface EdgeSchemaDefinition {
  name: QueryEdgeType;
  scope: QueryScope;
  status: EdgeStatus;
  producers: readonly string[];
  currentlyProduced: boolean;
  sourceTypes: readonly QueryNodeType[];
  targetTypes: readonly QueryNodeType[];
  category: string;
  /** Project capability this edge's trust depends on (undefined for fleet). */
  capability?: GraphCapability;
  /** Fleet edges project to their owning projects when a pattern asks for it. */
  projectProjection?: boolean;
  description: string;
}

function symbolTypesToNodeTypes(types: readonly CodeSymbol['type'][]): QueryNodeType[] {
  const output = new Set<QueryNodeType>();
  for (const type of types) {
    const mapped = SYMBOL_NODE_TYPE[type];
    if (mapped) {
      output.add(mapped);
    }
  }
  return [...output];
}

/*
 * Primary capability per project edge type.
 *
 * Unlike the Phase 71 capability -> edge map (used for coverage "everything
 * that matters" checks), this is the single capability a query must trust for
 * one specific edge type.
 */
export const EDGE_CAPABILITY: Readonly<Partial<Record<QueryEdgeType, GraphCapability>>> = {
  DEFINES: 'symbol_graph',
  CONFIGURES: 'architecture',
  IMPORTS: 'dependency_graph',
  USES_TYPE: 'dependency_graph',
  INHERITS: 'dependency_graph',
  IMPLEMENTS: 'dependency_graph',
  CALLS: 'call_graph',
  CALL_REFERENCE: 'call_graph',
  READS: 'impact_analysis',
  WRITES: 'impact_analysis',
  TESTS: 'impact_analysis',
  ROUTE: 'cross_service_graph',
  HANDLES: 'cross_service_graph',
  HTTP_CALLS: 'cross_service_graph',
  RPC_CALLS: 'cross_service_graph',
  GRAPHQL_CALLS: 'cross_service_graph',
  TRPC_CALLS: 'cross_service_graph',
  EMITS: 'cross_service_graph',
  LISTENS_ON: 'cross_service_graph',
};

/**
 * Phase 71 edge producers that actually emit edges today.
 *
 * RPC/GraphQL/tRPC project edges have no producer (Phase 72 declares those
 * protocols unsupported), so they are reserved rather than advertised.
 */
const PROJECT_EDGE_PRODUCERS: Readonly<Partial<Record<GraphEdgeType, readonly string[]>>> = {
  DEFINES: ['phase71-graph-builder', 'phase71-rich-graph-enricher'],
  IMPORTS: ['phase70-module-resolver', 'phase71-graph-builder'],
  CALLS: ['phase70-resolution-engine'],
  CALL_REFERENCE: ['phase70-resolution-engine'],
  USES_TYPE: ['phase71-rich-graph-enricher'],
  INHERITS: ['phase71-graph-builder', 'phase70-resolution-engine'],
  IMPLEMENTS: ['phase71-graph-builder', 'phase70-resolution-engine'],
  READS: ['phase71-rich-graph-enricher'],
  WRITES: ['phase71-rich-graph-enricher'],
  HANDLES: ['phase72-cross-service-linker'],
  CONFIGURES: ['phase71-rich-graph-enricher'],
  ROUTE: ['phase72-cross-service-linker'],
  TESTS: ['phase71-graph-builder'],
  HTTP_CALLS: ['phase72-cross-service-linker'],
  RPC_CALLS: [],
  GRAPHQL_CALLS: [],
  TRPC_CALLS: [],
  EMITS: ['phase72-cross-service-linker'],
  LISTENS_ON: ['phase72-cross-service-linker'],
};

const CROSS_EDGE_STATUS: Readonly<
  Record<
    Extract<
      QueryEdgeType,
      | 'CROSS_HTTP_CALLS'
      | 'CROSS_RPC_CALLS'
      | 'CROSS_GRAPHQL_CALLS'
      | 'CROSS_TRPC_CALLS'
      | 'CROSS_EMITS'
      | 'CROSS_LISTENS_ON'
      | 'CROSS_PACKAGE_DEPENDS_ON'
    >,
    readonly string[]
  >
> = {
  CROSS_HTTP_CALLS: ['phase73-cross-project-linker'],
  CROSS_RPC_CALLS: [],
  CROSS_GRAPHQL_CALLS: [],
  CROSS_TRPC_CALLS: [],
  CROSS_EMITS: ['phase73-cross-project-linker'],
  CROSS_LISTENS_ON: ['phase73-cross-project-linker'],
  CROSS_PACKAGE_DEPENDS_ON: ['phase73-cross-project-linker'],
};

function projectEdgeDefinitions(): EdgeSchemaDefinition[] {
  return (Object.keys(EDGE_SEMANTIC_REGISTRY) as GraphEdgeType[]).map((type) => {
    const definition = EDGE_SEMANTIC_REGISTRY[type];
    const producers = PROJECT_EDGE_PRODUCERS[type] ?? [];
    const status: EdgeStatus = producers.length > 0 ? 'active' : 'reserved';
    const capability = EDGE_CAPABILITY[type];

    return {
      name: type,
      scope: 'project' as const,
      status,
      producers,
      currentlyProduced: status === 'active',
      sourceTypes: symbolTypesToNodeTypes(definition.allowedSourceTypes),
      targetTypes: symbolTypesToNodeTypes(definition.allowedTargetTypes),
      category: definition.category,
      ...(capability ? { capability } : {}),
      description: definition.description,
    };
  });
}

function crossEdgeDefinitions(): EdgeSchemaDefinition[] {
  const fleetTypes: Array<{
    name: QueryEdgeType;
    source: QueryNodeType[];
    target: QueryNodeType[];
    protocol?: string;
    description: string;
  }> = [
    {
      name: 'CROSS_HTTP_CALLS',
      /*
       * For the current project the edge originates from the real caller
       * symbol (the export proves it); remote call sites are exposed as an
       * HttpCall resource node.
       */
      source: ['Function', 'Method', 'Class', 'HttpCall'],
      target: ['Route'],
      description: 'HTTP call site in one project targets a route in another project',
    },
    {
      name: 'CROSS_RPC_CALLS',
      source: ['HttpCall'],
      target: ['Route'],
      description: 'Reserved: no gRPC producer exists yet',
    },
    {
      name: 'CROSS_GRAPHQL_CALLS',
      source: ['HttpCall'],
      target: ['Route'],
      description: 'Reserved: no GraphQL producer exists yet',
    },
    {
      name: 'CROSS_TRPC_CALLS',
      source: ['HttpCall'],
      target: ['Route'],
      description: 'Reserved: no tRPC producer exists yet',
    },
    {
      name: 'CROSS_EMITS',
      source: ['EventChannel'],
      target: ['EventChannel'],
      description: 'Event channel emitted by one project and consumed by another',
    },
    {
      name: 'CROSS_LISTENS_ON',
      source: ['EventChannel'],
      target: ['EventChannel'],
      description: 'Event channel consumed by one project and emitted by another',
    },
    {
      name: 'CROSS_PACKAGE_DEPENDS_ON',
      source: ['PackageDependency'],
      target: ['Package'],
      description: 'Project declares a local/workspace dependency on another project package',
    },
  ];

  return fleetTypes.map((entry) => {
    const producers = CROSS_EDGE_STATUS[entry.name as keyof typeof CROSS_EDGE_STATUS] ?? [];
    const status: EdgeStatus = producers.length > 0 ? 'active' : 'reserved';
    return {
      name: entry.name,
      scope: 'fleet' as const,
      status,
      producers,
      currentlyProduced: status === 'active',
      sourceTypes: entry.source,
      targetTypes: entry.target,
      category: 'cross-project',
      projectProjection: true,
      description: entry.description,
    };
  });
}

export const EDGE_SCHEMA: readonly EdgeSchemaDefinition[] = [
  ...projectEdgeDefinitions(),
  ...crossEdgeDefinitions(),
];

export function edgeSchemaFor(type: QueryEdgeType): EdgeSchemaDefinition | undefined {
  return EDGE_SCHEMA.find((definition) => definition.name === type);
}

export function isKnownEdgeType(value: string): value is QueryEdgeType {
  return EDGE_SCHEMA.some((definition) => definition.name === value);
}

export function availableEdgeTypes(scope: QueryScope): QueryEdgeType[] {
  return EDGE_SCHEMA.filter((definition) => definition.scope === scope).map(
    (definition) => definition.name
  );
}

/**
 * Edge vocabulary a query may reference.
 *
 * Project scope is strictly local. Fleet scope is a composite view: the
 * sanitized fleet overlay plus the current project's local edges, which is what
 * makes a bounded composite path expressible without exposing remote graphs.
 */
export function availableEdgeTypesForQuery(scope: QueryScope): QueryEdgeType[] {
  return EDGE_SCHEMA.filter(
    (definition) => scope === 'fleet' || definition.scope === 'project'
  ).map((definition) => definition.name);
}

/** Node types a query may reference in a scope. */
export function availableNodeTypesForQuery(scope: QueryScope): QueryNodeType[] {
  return NODE_SCHEMA.filter(
    (definition) => scope === 'fleet' || definition.scope === 'project'
  ).map((definition) => definition.name);
}

/* ------------------------------------------------------------------ *
 * Capability derivation
 * ------------------------------------------------------------------ */

/**
 * Capabilities a query must trust, derived from the edge types it touches.
 * `lexical_search` is never required (it has no edges), so a query can never
 * use lexical coverage to justify a structural or cross-repo conclusion.
 */
export function requiredCapabilities(edgeTypes: readonly QueryEdgeType[]): GraphCapability[] {
  const required = new Set<GraphCapability>();

  for (const type of edgeTypes) {
    const definition = edgeSchemaFor(type);
    if (definition?.scope === 'fleet') {
      continue;
    }
    const capability = EDGE_CAPABILITY[type];
    if (capability) {
      required.add(capability);
    }
  }

  return GRAPH_CAPABILITIES.filter((capability) => required.has(capability));
}

export function usesFleetEdges(edgeTypes: readonly QueryEdgeType[]): boolean {
  return edgeTypes.some((type) => edgeSchemaFor(type)?.scope === 'fleet');
}

/* ------------------------------------------------------------------ *
 * Schema fingerprint
 * ------------------------------------------------------------------ */

export function schemaFingerprint(): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        querySchemaVersion: QUERY_SCHEMA_VERSION,
        grammarVersion: QUERY_GRAMMAR_VERSION,
        graphSemanticSchemaVersion: GRAPH_SEMANTIC_SCHEMA_VERSION,
        nodeTypes: NODE_SCHEMA.map((definition) => ({
          name: definition.name,
          scope: definition.scope,
          properties: [...definition.properties].sort(),
        })),
        edgeTypes: EDGE_SCHEMA.map((definition) => ({
          name: definition.name,
          scope: definition.scope,
          status: definition.status,
          sourceTypes: [...definition.sourceTypes].sort(),
          targetTypes: [...definition.targetTypes].sort(),
        })),
        deniedProperties: [...DENIED_PROPERTIES].sort(),
      })
    )
    .digest('hex');
}

/* ------------------------------------------------------------------ *
 * Machine-readable schema
 * ------------------------------------------------------------------ */

export interface GraphSchemaOutput {
  version: number;
  grammarVersion: number;
  fingerprint: string;
  nodeTypes: Array<{ name: QueryNodeType; scope: QueryScope; properties: string[] }>;
  edgeTypes: Array<{
    name: QueryEdgeType;
    scope: QueryScope;
    status: EdgeStatus;
    producers: string[];
    currentlyProduced: boolean;
    sourceTypes: QueryNodeType[];
    targetTypes: QueryNodeType[];
    category: string;
    capability?: GraphCapability;
    description: string;
  }>;
  query: {
    language: 'TGQL';
    cypherCompatible: false;
    readOnly: true;
    clauses: string[];
    unsupportedClauses: string[];
    scopes: QueryScope[];
    maxDepth: number;
    maxRows: number;
    defaultRows: number;
    maxQueryLength: number;
    maxTokens: number;
    maxMatchPatterns: number;
    maxExpansions: number;
  };
}

export const SUPPORTED_CLAUSES = ['MATCH', 'WHERE', 'RETURN', 'ORDER BY', 'LIMIT', 'SKIP'] as const;

export const UNSUPPORTED_CLAUSES = [
  'CREATE',
  'MERGE',
  'DELETE',
  'DETACH DELETE',
  'SET',
  'REMOVE',
  'DROP',
  'CALL',
  'LOAD CSV',
  'FOREACH',
  'UNWIND',
  'WITH',
] as const;

export function buildGraphSchema(): GraphSchemaOutput {
  return {
    version: QUERY_SCHEMA_VERSION,
    grammarVersion: QUERY_GRAMMAR_VERSION,
    fingerprint: schemaFingerprint(),
    nodeTypes: NODE_SCHEMA.map((definition) => ({
      name: definition.name,
      scope: definition.scope,
      properties: [...definition.properties],
    })),
    edgeTypes: EDGE_SCHEMA.map((definition) => ({
      name: definition.name,
      scope: definition.scope,
      status: definition.status,
      producers: [...definition.producers],
      currentlyProduced: definition.currentlyProduced,
      sourceTypes: [...definition.sourceTypes],
      targetTypes: [...definition.targetTypes],
      category: definition.category,
      ...(definition.capability ? { capability: definition.capability } : {}),
      description: definition.description,
    })),
    query: {
      language: 'TGQL',
      cypherCompatible: false,
      readOnly: true,
      clauses: [...SUPPORTED_CLAUSES],
      unsupportedClauses: [...UNSUPPORTED_CLAUSES],
      scopes: ['project', 'fleet'],
      maxDepth: MAX_DEPTH,
      maxRows: MAX_ROWS,
      defaultRows: DEFAULT_ROWS,
      maxQueryLength: MAX_QUERY_LENGTH,
      maxTokens: MAX_QUERY_TOKENS,
      maxMatchPatterns: MAX_MATCH_PATTERNS,
      maxExpansions: MAX_EXPANSIONS,
    },
  };
}
