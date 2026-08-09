import { describe, expect, it } from 'vitest';

import { CodeGraphStore } from '../../src/code-intelligence/index.js';

import { graphDependents, graphNeighborhood, graphPath } from '../../src/mcp/tools/index.js';

describe('MCP Graph Intelligence', () => {
  it('exposes graph path, dependents and neighborhood', async () => {
    const graph = new CodeGraphStore();

    const projectId = 'test';

    for (const [id, file] of [
      ['a', 'src/a.ts'],
      ['b', 'src/b.ts'],
      ['c', 'src/c.ts'],
    ] as const) {
      graph.addSymbol({
        id,
        projectId,

        name: id,

        qualifiedName: id,

        type: 'function',

        filePath: file,

        startLine: 1,

        endLine: 5,
      });
    }

    graph.addEdge({
      id: 'ab',

      projectId,

      from: 'a',

      to: 'b',

      type: 'CALL_REFERENCE',
    });

    graph.addEdge({
      id: 'bc',

      projectId,

      from: 'b',

      to: 'c',

      type: 'CALL_REFERENCE',
    });

    const ctx = {
      project: {
        id: projectId,

        name: 'test',
      },

      graph,
    } as any;

    const path = await graphPath(ctx, {
      from: 'a',

      to: 'c',
    });

    expect(path.found).toBe(true);

    expect(path.distance).toBe(2);

    const dependents = await graphDependents(ctx, {
      symbol: 'b',
    });

    expect(dependents.count).toBe(1);

    const neighborhood = await graphNeighborhood(ctx, {
      symbol: 'b',

      depth: 1,
    });

    expect(neighborhood.found).toBe(true);

    expect(neighborhood.incomingCount).toBe(1);

    expect(neighborhood.outgoingCount).toBe(1);
  });
});
