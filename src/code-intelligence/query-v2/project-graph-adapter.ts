/*
 * Phase 74 — Read-only project graph adapter.
 *
 * Wraps the existing CodeGraphStore in an immutable, indexed view. Indexes are
 * built once per query so a query never degrades into "scan every symbol for
 * every reference".
 */

import type { CodeSymbol, GraphEdge } from '../../core/types.js';

import type { CodeGraphStore } from '../graph/graph-store.js';

import type { ReadableGraph } from './adapter.js';

import {
  QueryError,
  type QueryEdge,
  type QueryEdgeType,
  type QueryNode,
  type QueryNodeType,
  type QueryPropertyValue,
  type QueryScope,
} from './types.js';

import { SYMBOL_NODE_TYPE } from './types.js';

function readString(
  metadata: Record<string, unknown> | undefined,
  key: string
): string | undefined {
  const value = metadata?.[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Only these metadata keys are promoted into queryable properties. Raw
 * metadata is never exposed, so credentials or internal storage fields cannot
 * leak through a projection.
 */
function symbolProperties(symbol: CodeSymbol): Record<string, QueryPropertyValue> {
  const properties: Record<string, QueryPropertyValue> = {
    id: symbol.id,
    name: symbol.name,
    type: symbol.type,
  };

  if (symbol.qualifiedName) {
    properties.qualifiedName = symbol.qualifiedName;
  }
  properties.filePath = symbol.filePath;
  if (symbol.startLine !== undefined) {
    properties.line = symbol.startLine;
  }
  if (symbol.endLine !== undefined) {
    properties.endLine = symbol.endLine;
  }

  const language = readString(symbol.metadata, 'language');
  if (language) {
    properties.language = language;
  }

  if (symbol.type === 'route') {
    const method = readString(symbol.metadata, 'method');
    const path = readString(symbol.metadata, 'path');
    const serviceId = readString(symbol.metadata, 'serviceId');
    if (method) {
      properties.method = method;
    }
    if (path) {
      properties.path = path;
    }
    if (serviceId) {
      properties.serviceId = serviceId;
    }
  }

  if (symbol.type === 'event') {
    const provider = readString(symbol.metadata, 'provider');
    const channel = readString(symbol.metadata, 'channel');
    if (provider) {
      properties.provider = provider;
    }
    if (channel) {
      properties.channel = channel;
    }
  }

  if (symbol.type === 'service') {
    const kind = readString(symbol.metadata, 'kind');
    const rootPath = readString(symbol.metadata, 'rootPath');
    if (kind) {
      properties.kind = kind;
    }
    if (rootPath) {
      properties.rootPath = rootPath;
    }
  }

  return properties;
}

function provenanceOf(edge: GraphEdge): {
  origin?: string;
  evidence?: string[];
  certainty?: 'deterministic' | 'reference';
  generation?: string;
  filePath?: string;
  line?: number;
  language?: string;
} {
  const provenance = edge.metadata?.provenance;
  if (!provenance || typeof provenance !== 'object' || Array.isArray(provenance)) {
    return {};
  }

  const record = provenance as Record<string, unknown>;
  const output: {
    origin?: string;
    evidence?: string[];
    certainty?: 'deterministic' | 'reference';
    generation?: string;
    filePath?: string;
    line?: number;
    language?: string;
  } = {};

  if (typeof record.origin === 'string') {
    output.origin = record.origin;
  }
  if (typeof record.evidence === 'string') {
    output.evidence = [record.evidence];
  }
  if (record.certainty === 'deterministic' || record.certainty === 'reference') {
    output.certainty = record.certainty;
  }
  if (typeof record.generation === 'string') {
    output.generation = record.generation;
  }
  if (typeof record.filePath === 'string') {
    output.filePath = record.filePath;
  }
  if (typeof record.line === 'number') {
    output.line = record.line;
  }
  if (typeof record.language === 'string') {
    output.language = record.language;
  }

  return output;
}

export class ProjectGraphAdapter implements ReadableGraph {
  readonly scope: QueryScope = 'project';

  private readonly byId = new Map<string, QueryNode>();
  private readonly byType = new Map<QueryNodeType, QueryNode[]>();
  private readonly byName = new Map<string, QueryNode[]>();
  private readonly byQualifiedName = new Map<string, QueryNode[]>();

  private readonly outgoingEdges = new Map<string, QueryEdge[]>();
  private readonly incomingEdges = new Map<string, QueryEdge[]>();
  private readonly observed = new Set<QueryEdgeType>();

  constructor(
    graph: CodeGraphStore,
    readonly generation: string,
    projectId: string
  ) {
    const symbols = [...graph.allSymbols(projectId)].sort((left, right) =>
      left.id.localeCompare(right.id)
    );

    for (const symbol of symbols) {
      const type = SYMBOL_NODE_TYPE[symbol.type];

      if (!type) {
        continue;
      }

      const node: QueryNode = {
        id: symbol.id,
        type,
        scope: 'project',
        name: symbol.name,
        ...(symbol.qualifiedName ? { qualifiedName: symbol.qualifiedName } : {}),
        filePath: symbol.filePath,
        ...(symbol.startLine !== undefined ? { line: symbol.startLine } : {}),
        projectId,
        properties: { ...symbolProperties(symbol), projectId, scope: 'project' },
      };

      this.byId.set(node.id, node);

      const bucket = this.byType.get(type) ?? [];
      bucket.push(node);
      this.byType.set(type, bucket);

      const nameList = this.byName.get(node.name) ?? [];
      nameList.push(node);
      this.byName.set(node.name, nameList);

      if (node.qualifiedName) {
        const qualified = this.byQualifiedName.get(node.qualifiedName) ?? [];
        qualified.push(node);
        this.byQualifiedName.set(node.qualifiedName, qualified);
      }
    }

    const edges = [...graph.allEdges(projectId)].sort((left, right) =>
      left.id.localeCompare(right.id)
    );

    for (const edge of edges) {
      if (!this.byId.has(edge.from) || !this.byId.has(edge.to)) {
        /*
         * Dangling edges are impossible in a validated graph, but a partially
         * hydrated store must never crash a query.
         */
        continue;
      }

      this.observed.add(edge.type as QueryEdgeType);

      const provenance = provenanceOf(edge);

      const queryEdge: QueryEdge = {
        id: edge.id,
        type: edge.type as QueryEdgeType,
        scope: 'project',
        from: edge.from,
        to: edge.to,
        projectId,
        ...provenance,
      };

      const outgoing = this.outgoingEdges.get(edge.from) ?? [];
      outgoing.push(queryEdge);
      this.outgoingEdges.set(edge.from, outgoing);

      const incoming = this.incomingEdges.get(edge.to) ?? [];
      incoming.push(queryEdge);
      this.incomingEdges.set(edge.to, incoming);
    }
  }

  node(id: string): QueryNode | undefined {
    return this.byId.get(id);
  }

  nodesByType(type: QueryNodeType): readonly QueryNode[] {
    return this.byType.get(type) ?? [];
  }

  indexedLookup(
    type: QueryNodeType | undefined,
    property: string,
    value: QueryPropertyValue
  ): readonly QueryNode[] | undefined {
    const strings = typeof value === 'string' ? [value] : [];
    if (strings.length === 0) {
      return undefined;
    }

    const source =
      property === 'name'
        ? this.byName
        : property === 'qualifiedName'
          ? this.byQualifiedName
          : null;

    if (!source) {
      return undefined;
    }

    const matches = source.get(strings[0]!) ?? [];
    return type ? matches.filter((node) => node.type === type) : matches;
  }

  outgoing(nodeId: string, edgeTypes: ReadonlySet<QueryEdgeType>): readonly QueryEdge[] {
    const edges = this.outgoingEdges.get(nodeId) ?? [];
    return edges.filter((edge) => edgeTypes.has(edge.type));
  }

  incoming(nodeId: string, edgeTypes: ReadonlySet<QueryEdgeType>): readonly QueryEdge[] {
    const edges = this.incomingEdges.get(nodeId) ?? [];
    return edges.filter((edge) => edgeTypes.has(edge.type));
  }

  observedEdgeTypes(): QueryEdgeType[] {
    return [...this.observed].sort();
  }

  nodeCount(): number {
    return this.byId.size;
  }

  edgeCount(): number {
    let total = 0;
    for (const edges of this.outgoingEdges.values()) {
      total += edges.length;
    }
    return total;
  }
}

/** Guard used by tests and the MCP layer: adapters never expose mutation. */
export function assertReadOnly(graph: ReadableGraph): void {
  const forbidden = ['addSymbol', 'addEdge', 'clearProject', 'import', 'save'];
  for (const method of forbidden) {
    if (typeof (graph as unknown as Record<string, unknown>)[method] === 'function') {
      throw new QueryError(
        'READ_ONLY_VIOLATION',
        `Read-only graph adapter must not expose "${method}"`
      );
    }
  }
}
