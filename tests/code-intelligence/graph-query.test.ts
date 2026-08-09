import { describe, expect, it } from 'vitest';

import { CodeGraphStore, GraphQueryEngine } from '../../src/code-intelligence/index.js';

describe('Graph Query Engine', () => {
  it('finds callers, dependencies and shortest path', () => {
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

    const query = new GraphQueryEngine(graph);

    expect(query.callers(projectId, 'b').map((item) => item.id)).toContain('a');

    expect(query.dependencies(projectId, 'a').map((item) => item.id)).toContain('b');

    const path = query.shortestPath(projectId, 'a', 'c');

    expect(path.found).toBe(true);

    expect(path.distance).toBe(2);

    expect(path.symbols.map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });
});
