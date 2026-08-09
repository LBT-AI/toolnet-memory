import type { GraphEdge } from '../../core/types.js';

import type { CodeGraphStore } from '../graph/graph-store.js';

import type { ArchitectureHotspot } from './types.js';

const EDGE_WEIGHT: Partial<Record<GraphEdge['type'], number>> = {
  CALL_REFERENCE: 6,
  CALLS: 4,
  IMPORTS: 3,
  USES_TYPE: 4,
  WRITES: 5,
  ROUTE: 4,
  TESTS: 1,
  INHERITS: 5,
  IMPLEMENTS: 5,
  DEFINES: 0.25,
};

interface FileStats {
  symbols: number;

  incoming: number;
  outgoing: number;

  weightedIncoming: number;
  weightedOutgoing: number;

  writes: number;
  callReferences: number;

  crossFile: number;
}

export class HotspotAnalyzer {
  constructor(private readonly graph: CodeGraphStore) {}

  analyze(projectId: string): ArchitectureHotspot[] {
    const symbols = this.graph.allSymbols(projectId);

    const edges = this.graph.allEdges(projectId);

    const symbolById = new Map(symbols.map((symbol) => [symbol.id, symbol]));

    const files = new Map<string, FileStats>();

    const get = (filePath: string): FileStats => {
      let value = files.get(filePath);

      if (!value) {
        value = {
          symbols: 0,

          incoming: 0,
          outgoing: 0,

          weightedIncoming: 0,
          weightedOutgoing: 0,

          writes: 0,
          callReferences: 0,

          crossFile: 0,
        };

        files.set(filePath, value);
      }

      return value;
    };

    for (const symbol of symbols) {
      get(symbol.filePath).symbols++;
    }

    for (const edge of edges) {
      const from = symbolById.get(edge.from);

      const to = symbolById.get(edge.to);

      if (!from || !to) {
        continue;
      }

      const weight = EDGE_WEIGHT[edge.type] ?? 1;

      const source = get(from.filePath);

      const target = get(to.filePath);

      source.outgoing++;
      target.incoming++;

      source.weightedOutgoing += weight;

      target.weightedIncoming += weight;

      if (edge.type === 'WRITES') {
        source.writes++;
      }

      if (edge.type === 'CALL_REFERENCE') {
        source.callReferences++;
      }

      if (from.filePath !== to.filePath) {
        source.crossFile++;
        target.crossFile++;
      }
    }

    const scored = [...files.entries()]
      .map(([filePath, value]): ArchitectureHotspot => {
        const score = Number(
          (
            value.symbols * 0.4 +
            value.weightedIncoming * 1.75 +
            value.weightedOutgoing * 0.65 +
            value.crossFile * 1.5 +
            value.writes * 3 +
            value.callReferences * 2
          ).toFixed(2)
        );

        const reasons: string[] = [];

        if (value.incoming >= 10) {
          reasons.push('high incoming dependency');
        }

        if (value.crossFile >= 10) {
          reasons.push('high cross-file coupling');
        }

        if (value.callReferences >= 5) {
          reasons.push('many exact call references');
        }

        if (value.writes > 0) {
          reasons.push('contains write relationships');
        }

        if (value.symbols >= 10) {
          reasons.push('high symbol density');
        }

        return {
          filePath,

          score,

          symbols: value.symbols,

          incoming: value.incoming,

          outgoing: value.outgoing,

          reasons,
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.filePath.localeCompare(b.filePath));

    if (scored.length === 0) {
      return [];
    }

    /*
     * Top 15%, tối đa 30.
     * Repo nhỏ vẫn giữ tối thiểu 1 hotspot.
     */
    const limit = Math.max(1, Math.min(30, Math.ceil(scored.length * 0.15)));

    return scored.slice(0, limit);
  }
}
