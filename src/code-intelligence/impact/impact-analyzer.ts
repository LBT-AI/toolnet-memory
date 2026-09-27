import type { CodeSymbol, GraphEdge } from '../../core/types.js';

import { CodeGraphStore } from '../graph/graph-store.js';

export interface ImpactResult {
  symbol: CodeSymbol;

  depth: number;

  relation: string;

  edgeType?: GraphEdge['type'];
}

export class ImpactAnalyzer {
  constructor(private readonly graph: CodeGraphStore) {}

  analyze(projectId: string, symbolId: string, maxDepth = 4): ImpactResult[] {
    const edges = this.graph.allEdges(projectId);

    const visited = new Set<string>([symbolId]);

    const queue = [
      {
        id: symbolId,

        depth: 0,
      },
    ];

    const result: ImpactResult[] = [];

    while (queue.length) {
      const current = queue.shift()!;

      if (current.depth >= maxDepth) {
        continue;
      }

      /*
       * Reverse relationships:
       * "Ai phụ thuộc vào symbol này?"
       */
      const incoming = edges.filter(
        (edge) =>
          edge.to === current.id &&
          [
            'CALLS',
            'CALL_REFERENCE',
            'IMPORTS',
            'INHERITS',
            'IMPLEMENTS',
            'USES_TYPE',
            'WRITES',
            'READS',
            /*
             * Phase 72: cross-service blast radius. Changing a route must
             * surface its callers and handlers; changing an event channel must
             * surface producers and consumers.
             */
            'HTTP_CALLS',
            'RPC_CALLS',
            'GRAPHQL_CALLS',
            'TRPC_CALLS',
            'EMITS',
            'LISTENS_ON',
            'HANDLES',
            'ROUTE',
          ].includes(edge.type)
      );

      for (const edge of incoming) {
        if (visited.has(edge.from)) {
          continue;
        }

        visited.add(edge.from);

        const symbol = this.graph.getSymbol(edge.from);

        if (!symbol) {
          continue;
        }

        const depth = current.depth + 1;

        result.push({
          symbol,
          depth,
          relation: edge.type,
          edgeType: edge.type,
        });

        queue.push({
          id: edge.from,
          depth,
        });
      }
    }

    return result;
  }
}
