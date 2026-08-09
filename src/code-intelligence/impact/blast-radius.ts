import type { CodeSymbol, GraphEdge } from '../../core/types.js';

import type { CodeGraphStore } from '../graph/graph-store.js';

import type { ChangedSymbol } from './change-mapper.js';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface BlastImpact {
  symbol: CodeSymbol;

  relation: GraphEdge['type'];

  depth: number;

  sourceSymbolId: string;
}

export interface BlastRadiusResult {
  risk: RiskLevel;

  riskScore: number;

  changedSymbols: ChangedSymbol[];

  impacted: BlastImpact[];

  impactedFiles: string[];

  suggestedTests: string[];
}

const RELATION_WEIGHT: Record<string, number> = {
  CALLS: 4,
  CALL_REFERENCE: 6,
  USES_TYPE: 4,
  TESTS: 2,
  ROUTE: 4,
  WRITES: 3,
  IMPORTS: 3,
  INHERITS: 5,
  IMPLEMENTS: 5,
  DEFINES: 1,
};

function riskLevel(score: number): RiskLevel {
  if (score >= 30) {
    return 'CRITICAL';
  }

  if (score >= 16) {
    return 'HIGH';
  }

  if (score >= 6) {
    return 'MEDIUM';
  }

  return 'LOW';
}

function isTestFile(path: string): boolean {
  const value = path.toLowerCase().replaceAll('\\', '/');

  return (
    value.startsWith('tests/') ||
    value.includes('/tests/') ||
    value.includes('__tests__') ||
    /\.(test|spec)\.[^.]+$/.test(value)
  );
}

export class BlastRadiusAnalyzer {
  constructor(private readonly graph: CodeGraphStore) {}

  analyze(projectId: string, changedSymbols: ChangedSymbol[], maxDepth = 4): BlastRadiusResult {
    const edges = this.graph.allEdges(projectId);

    const impacted = new Map<string, BlastImpact>();

    let score = 0;

    for (const changed of changedSymbols) {
      if (changed.fileStatus === 'deleted') {
        score += 8;
      } else if (changed.fileStatus === 'renamed') {
        score += 5;
      } else {
        score += 2;
      }

      if (changed.symbol.type === 'interface') {
        score += 5;
      }

      if (changed.symbol.type === 'class') {
        score += 3;
      }

      const visited = new Set<string>([changed.symbol.id]);

      const queue = [
        {
          id: changed.symbol.id,

          depth: 0,
        },
      ];

      while (queue.length) {
        const current = queue.shift()!;

        if (current.depth >= maxDepth) {
          continue;
        }

        /*
         * Blast radius đi NGƯỢC dependency:
         *
         * B thay đổi
         * A CALLS B
         * => A có nguy cơ ảnh hưởng.
         */
        const incoming = edges.filter(
          (edge) =>
            edge.to === current.id &&
            [
              'CALLS',
              'CALL_REFERENCE',
              'USES_TYPE',
              'TESTS',
              'ROUTE',
              'WRITES',

              'IMPORTS',
              'INHERITS',
              'IMPLEMENTS',
              'DEFINES',
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

          const key = `${changed.symbol.id}:${symbol.id}`;

          impacted.set(key, {
            symbol,
            relation: edge.type,
            depth,
            sourceSymbolId: changed.symbol.id,
          });

          const relationWeight = RELATION_WEIGHT[edge.type] ?? 1;

          score += Math.max(1, relationWeight - (depth - 1));

          queue.push({
            id: symbol.id,
            depth,
          });
        }
      }
    }

    const impactedList = [...impacted.values()].sort((a, b) => a.depth - b.depth);

    const impactedFiles = [...new Set(impactedList.map((item) => item.symbol.filePath))];

    /*
     * Nếu graph đã index tests,
     * ưu tiên đề nghị đúng test liên quan.
     */
    const suggestedTests = impactedFiles.filter(isTestFile);

    /*
     * Nếu không tìm thấy test trực tiếp,
     * trả file production cần verify.
     */
    if (suggestedTests.length === 0) {
      suggestedTests.push(...impactedFiles.filter((file) => !isTestFile(file)).slice(0, 10));
    }

    return {
      risk: riskLevel(score),

      riskScore: score,

      changedSymbols,

      impacted: impactedList,

      impactedFiles,

      suggestedTests,
    };
  }
}
