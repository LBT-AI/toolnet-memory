import { describe, expect, it } from 'vitest';

import { CodeGraphStore, VisualizationBuilder } from '../../src/code-intelligence/index.js';

describe('Visualization Builder', () => {
  it('creates graph nodes and links', () => {
    const graph = new CodeGraphStore();

    const projectId = 'test';

    graph.addSymbol({
      id: 'a',

      projectId,

      name: 'a',

      qualifiedName: 'a',

      type: 'function',

      filePath: 'src/a.ts',

      startLine: 1,

      endLine: 5,
    });

    graph.addSymbol({
      id: 'b',

      projectId,

      name: 'b',

      qualifiedName: 'b',

      type: 'function',

      filePath: 'src/b.ts',

      startLine: 1,

      endLine: 5,
    });

    graph.addEdge({
      id: 'ab',

      projectId,

      from: 'a',

      to: 'b',

      type: 'CALL_REFERENCE',
    });

    const result = new VisualizationBuilder(graph).build(projectId);

    expect(result.summary.nodes).toBe(2);

    expect(result.summary.links).toBe(1);

    expect(result.nodes.find((node) => node.id === 'a')?.outgoing).toBe(1);

    expect(result.nodes.find((node) => node.id === 'b')?.incoming).toBe(1);
  });
});
