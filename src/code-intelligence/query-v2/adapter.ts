/*
 * Phase 74 — Read-only graph adapter contract.
 *
 * The query executor only ever sees this interface. It exposes lookup and
 * traversal, never mutation: there is no addSymbol/addEdge/clear/save here, so
 * read-only enforcement is a compile-time property of the query layer and not
 * merely a runtime check.
 */

import type {
  QueryEdge,
  QueryEdgeType,
  QueryNode,
  QueryNodeType,
  QueryPropertyValue,
  QueryScope,
} from './types.js';

/** Properties the adapters maintain a direct index for. */
export const INDEXED_PROPERTIES: readonly string[] = ['id', 'name', 'qualifiedName'];

export interface ReadableGraph {
  readonly scope: QueryScope;
  readonly generation: string;

  node(id: string): QueryNode | undefined;

  nodesByType(type: QueryNodeType): readonly QueryNode[];

  /**
   * Index-backed lookup. Returns `undefined` when no index exists for the
   * (type, property) pair, so the planner can prefer an indexed start.
   */
  indexedLookup(
    type: QueryNodeType | undefined,
    property: string,
    value: QueryPropertyValue
  ): readonly QueryNode[] | undefined;

  outgoing(nodeId: string, edgeTypes: ReadonlySet<QueryEdgeType>): readonly QueryEdge[];
  incoming(nodeId: string, edgeTypes: ReadonlySet<QueryEdgeType>): readonly QueryEdge[];

  /** Edge types actually present in the current graph. */
  observedEdgeTypes(): QueryEdgeType[];

  nodeCount(): number;
  edgeCount(): number;
}
