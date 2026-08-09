import { describe, expect, it } from 'vitest';

import { CodeGraphStore, LayerDetector } from '../../src/code-intelligence/index.js';

describe('Layer Detector', () => {
  it('classifies architecture layers', () => {
    const graph = new CodeGraphStore();

    const projectId = 'test';

    const files = [
      ['core', 'src/core/memory.ts'],
      ['storage', 'src/storage/store.ts'],
      ['runtime', 'src/runtime/runtime.ts'],
      ['mcp', 'src/mcp/server.ts'],
      ['test', 'tests/runtime.test.ts'],
    ];

    for (const [id, filePath] of files) {
      graph.addSymbol({
        id,
        projectId,
        name: id,
        qualifiedName: id,
        type: 'file',
        filePath,
        startLine: 1,
        endLine: 1,
      });
    }

    const result = new LayerDetector(graph).detect(projectId);

    const byFile = new Map(result.map((item) => [item.filePath, item.layer]));

    expect(byFile.get('src/core/memory.ts')).toBe('domain');

    expect(byFile.get('src/storage/store.ts')).toBe('infrastructure');

    expect(byFile.get('src/runtime/runtime.ts')).toBe('application');

    expect(byFile.get('src/mcp/server.ts')).toBe('interface');

    expect(byFile.get('tests/runtime.test.ts')).toBe('tests');
  });
});
