import { describe, expect, it } from 'vitest';

import { ClusterDetector, CodeGraphStore } from '../../src/code-intelligence/index.js';

describe('Cluster Detector', () => {
  it('creates meaningful subsystem clusters', () => {
    const graph = new CodeGraphStore();

    const projectId = 'test';

    const values = [
      ['memory-a', 'src/memory/a.ts'],
      ['memory-b', 'src/memory/b.ts'],
      ['storage', 'src/storage/store.ts'],
      ['mcp', 'src/mcp/server.ts'],
    ] as const;

    for (const [id, filePath] of values) {
      graph.addSymbol({
        id,
        projectId,

        name: id,

        qualifiedName: id,

        type: 'function',

        filePath,

        startLine: 1,

        endLine: 5,
      });
    }

    graph.addEdge({
      id: 'memory-link',

      projectId,

      from: 'memory-a',

      to: 'memory-b',

      type: 'CALL_REFERENCE',
    });

    const clusters = new ClusterDetector(graph).detect(projectId);

    const memory = clusters.find((cluster) => cluster.subsystem === 'src/memory');

    const storage = clusters.find((cluster) => cluster.subsystem === 'src/storage');

    const mcp = clusters.find((cluster) => cluster.subsystem === 'src/mcp');

    expect(memory).toBeTruthy();

    expect(memory?.files).toContain('src/memory/a.ts');

    expect(memory?.files).toContain('src/memory/b.ts');

    expect(storage?.label).toBe('Storage');

    expect(mcp?.label).toBe('MCP');
  });
});
