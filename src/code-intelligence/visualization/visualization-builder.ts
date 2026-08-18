import type { ArchitectureSnapshot } from '../architecture/types.js';

import type { CodeAnalysisSnapshot } from '../analysis/types.js';

import type { CodeGraphStore } from '../graph/graph-store.js';

import type { VisualizationGraph, VisualizationLink, VisualizationNode } from './types.js';

import type { StageProgressCallback } from '../types.js';

export class VisualizationBuilder {
  constructor(private readonly graph: CodeGraphStore) {}

  build(
    projectId: string,
    architecture?: ArchitectureSnapshot | null,
    analysis?: CodeAnalysisSnapshot | null,
    onProgress?: StageProgressCallback
  ): VisualizationGraph {
    const symbols = this.graph.allSymbols(projectId);

    const edges = this.graph.allEdges(projectId);

    const layers = new Map(
      architecture?.layers.map((item) => [item.filePath, item.layer] as const) ?? []
    );

    const clusterByFile = new Map<
      string,
      {
        id: string;
        label: string;
      }
    >();

    for (const cluster of architecture?.clusters ?? []) {
      for (const file of cluster.files) {
        clusterByFile.set(file, {
          id: cluster.id,

          label: cluster.label,
        });
      }
    }

    const hotspotByFile = new Map(
      architecture?.hotspots.map((item) => [item.filePath, item.score] as const) ?? []
    );

    const deadCodeBySymbol = new Map(
      analysis?.deadCode.map(
        (item) =>
          [
            item.symbolId,
            {
              confidence: item.confidence,

              score: item.score,
            },
          ] as const
      ) ?? []
    );

    const incoming = new Map<string, number>();

    const outgoing = new Map<string, number>();

    for (const edge of edges) {
      outgoing.set(edge.from, (outgoing.get(edge.from) ?? 0) + 1);

      incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
    }

    const nodes: VisualizationNode[] = [];

    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      const cluster = clusterByFile.get(symbol.filePath);

      nodes.push({
        id: symbol.id,

        name: symbol.name,

        qualifiedName: symbol.qualifiedName,

        type: symbol.type,

        filePath: symbol.filePath,

        layer: layers.get(symbol.filePath),

        cluster: cluster?.id,

        clusterLabel: cluster?.label,

        hotspotScore: hotspotByFile.get(symbol.filePath),

        deadCode: deadCodeBySymbol.get(symbol.id),

        incoming: incoming.get(symbol.id) ?? 0,

        outgoing: outgoing.get(symbol.id) ?? 0,
      });

      // Report progress every 100 nodes
      if ((i + 1) % 100 === 0 || i === symbols.length - 1) {
        onProgress?.({
          current: i + 1,
          total: symbols.length,
          phase: 'nodes',
        });
      }
    }

    const symbolIds = new Set(nodes.map((node) => node.id));

    const validEdges = edges.filter((edge) => symbolIds.has(edge.from) && symbolIds.has(edge.to));

    const links: VisualizationLink[] = [];

    for (let i = 0; i < validEdges.length; i++) {
      const edge = validEdges[i];

      links.push({
        source: edge.from,

        target: edge.to,

        type: edge.type,

        confidence:
          typeof edge.metadata?.confidence === 'string' ? edge.metadata.confidence : undefined,

        resolver: typeof edge.metadata?.resolver === 'string' ? edge.metadata.resolver : undefined,
      });

      // Report progress every 100 links
      if ((i + 1) % 100 === 0 || i === validEdges.length - 1) {
        onProgress?.({
          current: i + 1,
          total: validEdges.length,
          phase: 'links',
        });
      }
    }

    return {
      version: 1,

      projectId,

      generatedAt: new Date().toISOString(),

      summary: {
        nodes: nodes.length,

        links: links.length,

        files: new Set(nodes.map((node) => node.filePath)).size,

        clusters: new Set(nodes.map((node) => node.cluster).filter(Boolean)).size,
      },

      nodes,

      links,
    };
  }
}
