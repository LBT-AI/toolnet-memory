import type { CodeSymbol, GraphEdge } from '../../core/types.js';

import type { CodeGraphStore } from '../graph/graph-store.js';

import type { GraphNeighborhood, GraphPath, GraphQueryNode } from './types.js';

const DEPENDENCY_EDGES = new Set<GraphEdge['type']>([
  'CALLS',
  'CALL_REFERENCE',
  'IMPORTS',
  'USES_TYPE',
  'WRITES',
  'INHERITS',
  'IMPLEMENTS',
  'ROUTE',
]);

const CALL_EDGES = new Set<GraphEdge['type']>(['CALLS', 'CALL_REFERENCE']);

export class GraphQueryEngine {
  constructor(private readonly graph: CodeGraphStore) {}

  findSymbols(projectId: string, query: string): CodeSymbol[] {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return [];
    }

    return this.graph
      .allSymbols(projectId)
      .filter(
        (symbol) =>
          symbol.name.toLowerCase().includes(normalized) ||
          (symbol.qualifiedName?.toLowerCase().includes(normalized) ?? false) ||
          symbol.filePath.toLowerCase().includes(normalized)
      )
      .sort((a, b) => {
        const aExact = a.name.toLowerCase() === normalized;

        const bExact = b.name.toLowerCase() === normalized;

        if (aExact !== bExact) {
          return aExact ? -1 : 1;
        }

        return a.filePath.localeCompare(b.filePath);
      });
  }

  callers(projectId: string, symbolId: string): CodeSymbol[] {
    return this.relatedIncoming(projectId, symbolId, CALL_EDGES);
  }

  callees(projectId: string, symbolId: string): CodeSymbol[] {
    return this.relatedOutgoing(projectId, symbolId, CALL_EDGES);
  }

  dependents(projectId: string, symbolId: string): CodeSymbol[] {
    return this.relatedIncoming(projectId, symbolId, DEPENDENCY_EDGES);
  }

  dependencies(projectId: string, symbolId: string): CodeSymbol[] {
    return this.relatedOutgoing(projectId, symbolId, DEPENDENCY_EDGES);
  }

  neighborhood(projectId: string, symbolId: string, depth = 1): GraphNeighborhood | null {
    const center = this.graph.getSymbol(symbolId);

    if (!center || center.projectId !== projectId) {
      return null;
    }

    return {
      center,

      incoming: this.walk(projectId, symbolId, 'incoming', depth),

      outgoing: this.walk(projectId, symbolId, 'outgoing', depth),
    };
  }

  shortestPath(projectId: string, fromId: string, toId: string, maxDepth = 12): GraphPath {
    const from = this.graph.getSymbol(fromId);

    const to = this.graph.getSymbol(toId);

    if (!from || !to || from.projectId !== projectId || to.projectId !== projectId) {
      return {
        found: false,
        distance: -1,
        symbols: [],
        edges: [],
      };
    }

    if (fromId === toId) {
      return {
        found: true,
        distance: 0,
        symbols: [from],
        edges: [],
      };
    }

    const edges = this.graph.allEdges(projectId).filter((edge) => DEPENDENCY_EDGES.has(edge.type));

    const outgoing = new Map<string, GraphEdge[]>();

    for (const edge of edges) {
      const list = outgoing.get(edge.from) ?? [];

      list.push(edge);

      outgoing.set(edge.from, list);
    }

    const queue: {
      id: string;
      depth: number;
    }[] = [
      {
        id: fromId,
        depth: 0,
      },
    ];

    const visited = new Set<string>([fromId]);

    const previous = new Map<
      string,
      {
        node: string;
        edge: GraphEdge;
      }
    >();

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.depth >= maxDepth) {
        continue;
      }

      for (const edge of outgoing.get(current.id) ?? []) {
        if (visited.has(edge.to)) {
          continue;
        }

        visited.add(edge.to);

        previous.set(edge.to, {
          node: current.id,

          edge,
        });

        if (edge.to === toId) {
          return this.buildPath(fromId, toId, previous);
        }

        queue.push({
          id: edge.to,

          depth: current.depth + 1,
        });
      }
    }

    return {
      found: false,
      distance: -1,
      symbols: [],
      edges: [],
    };
  }

  private buildPath(
    fromId: string,
    toId: string,
    previous: Map<
      string,
      {
        node: string;
        edge: GraphEdge;
      }
    >
  ): GraphPath {
    const symbolIds: string[] = [toId];

    const edges: GraphEdge[] = [];

    let current = toId;

    while (current !== fromId) {
      const previousNode = previous.get(current);

      if (!previousNode) {
        return {
          found: false,
          distance: -1,
          symbols: [],
          edges: [],
        };
      }

      edges.push(previousNode.edge);

      current = previousNode.node;

      symbolIds.push(current);
    }

    symbolIds.reverse();
    edges.reverse();

    const symbols = symbolIds
      .map((id) => this.graph.getSymbol(id))
      .filter((symbol): symbol is CodeSymbol => Boolean(symbol));

    return {
      found: true,

      distance: edges.length,

      symbols,

      edges,
    };
  }

  private walk(
    projectId: string,
    symbolId: string,
    direction: 'incoming' | 'outgoing',
    maxDepth: number
  ): GraphQueryNode[] {
    const edges = this.graph.allEdges(projectId).filter((edge) => DEPENDENCY_EDGES.has(edge.type));

    const queue: {
      id: string;
      depth: number;
    }[] = [
      {
        id: symbolId,

        depth: 0,
      },
    ];

    const visited = new Set<string>([symbolId]);

    const output: GraphQueryNode[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.depth >= maxDepth) {
        continue;
      }

      for (const edge of edges) {
        const matches =
          direction === 'incoming' ? edge.to === current.id : edge.from === current.id;

        if (!matches) {
          continue;
        }

        const nextId = direction === 'incoming' ? edge.from : edge.to;

        if (visited.has(nextId)) {
          continue;
        }

        const symbol = this.graph.getSymbol(nextId);

        if (!symbol) {
          continue;
        }

        visited.add(nextId);

        output.push({
          symbol,

          depth: current.depth + 1,

          via: edge,
        });

        queue.push({
          id: nextId,

          depth: current.depth + 1,
        });
      }
    }

    return output;
  }

  private relatedIncoming(
    projectId: string,
    symbolId: string,
    types: Set<GraphEdge['type']>
  ): CodeSymbol[] {
    const ids = new Set(
      this.graph
        .allEdges(projectId)
        .filter((edge) => edge.to === symbolId && types.has(edge.type))
        .map((edge) => edge.from)
    );

    return [...ids]
      .map((id) => this.graph.getSymbol(id))
      .filter((symbol): symbol is CodeSymbol => Boolean(symbol));
  }

  private relatedOutgoing(
    projectId: string,
    symbolId: string,
    types: Set<GraphEdge['type']>
  ): CodeSymbol[] {
    const ids = new Set(
      this.graph
        .allEdges(projectId)
        .filter((edge) => edge.from === symbolId && types.has(edge.type))
        .map((edge) => edge.to)
    );

    return [...ids]
      .map((id) => this.graph.getSymbol(id))
      .filter((symbol): symbol is CodeSymbol => Boolean(symbol));
  }
}
