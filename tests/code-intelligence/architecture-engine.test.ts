import { describe, expect, it } from 'vitest';

import { ArchitectureEngine, CodeGraphStore } from '../../src/code-intelligence/index.js';

describe('Architecture Engine', () => {
  it('builds architecture intelligence snapshot', () => {
    const graph = new CodeGraphStore();

    const projectId = 'test';

    graph.addSymbol({
      id: 'cli',

      projectId,

      name: 'tool',

      qualifiedName: 'tool',

      type: 'file',

      filePath: 'bin/tool.ts',

      startLine: 1,

      endLine: 20,
    });

    graph.addSymbol({
      id: 'service',

      projectId,

      name: 'Service',

      qualifiedName: 'Service',

      type: 'class',

      filePath: 'src/core/service.ts',

      startLine: 1,

      endLine: 30,
    });

    graph.addSymbol({
      id: 'store',

      projectId,

      name: 'Store',

      qualifiedName: 'Store',

      type: 'class',

      filePath: 'src/storage/store.ts',

      startLine: 1,

      endLine: 30,
    });

    graph.addEdge({
      id: 'cli-service',

      projectId,

      from: 'cli',

      to: 'service',

      type: 'CALL_REFERENCE',
    });

    graph.addEdge({
      id: 'service-store',

      projectId,

      from: 'service',

      to: 'store',

      type: 'CALL_REFERENCE',
    });

    const result = new ArchitectureEngine(graph).analyze(projectId);

    expect(result.summary.files).toBe(3);

    expect(result.entryPoints.length).toBeGreaterThan(0);

    expect(result.hotspots.length).toBeGreaterThan(0);

    expect(result.layers.length).toBe(3);

    expect(result.clusters.length).toBeGreaterThan(0);
  });
});
