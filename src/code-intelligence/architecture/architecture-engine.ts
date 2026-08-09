import type { CodeGraphStore } from '../graph/graph-store.js';

import { ClusterDetector } from './clusters.js';

import { EntryPointDetector } from './entry-points.js';

import { HotspotAnalyzer } from './hotspots.js';

import { LayerDetector } from './layers.js';

import type { ArchitectureSnapshot } from './types.js';

export class ArchitectureEngine {
  private readonly entryPoints: EntryPointDetector;

  private readonly hotspots: HotspotAnalyzer;

  private readonly layers: LayerDetector;

  private readonly clusters: ClusterDetector;

  constructor(private readonly graph: CodeGraphStore) {
    this.entryPoints = new EntryPointDetector(graph);

    this.hotspots = new HotspotAnalyzer(graph);

    this.layers = new LayerDetector(graph);

    this.clusters = new ClusterDetector(graph);
  }

  analyze(projectId: string): ArchitectureSnapshot {
    const entryPoints = this.entryPoints.detect(projectId);

    const hotspots = this.hotspots.analyze(projectId);

    const layers = this.layers.detect(projectId);

    const clusters = this.clusters.detect(projectId);

    const files = new Set(this.graph.allSymbols(projectId).map((symbol) => symbol.filePath));

    return {
      version: 1,

      projectId,

      updatedAt: new Date().toISOString(),

      summary: {
        files: files.size,

        entryPoints: entryPoints.length,

        hotspots: hotspots.length,

        layers: layers.length,

        clusters: clusters.length,
      },

      entryPoints,
      hotspots,
      layers,
      clusters,
    };
  }
}
