import { describe, expect, it } from 'vitest';

import {
  ArchitectureEngine,
  CodeGraphStore,
  EntryPointDetector,
  HotspotAnalyzer,
} from '../../src/code-intelligence/index.js';

describe('Architecture Calibration', () => {
  it('does not mark every symbol inside server file as entry point', () => {
    const graph = new CodeGraphStore();

    const projectId = 'test';

    graph.addSymbol({
      id: 'server-file',

      projectId,

      name: 'src/api/server.ts',

      qualifiedName: 'src/api/server.ts',

      type: 'file',

      filePath: 'src/api/server.ts',

      startLine: 1,

      endLine: 100,
    });

    graph.addSymbol({
      id: 'create-server',

      projectId,

      name: 'createServer',

      qualifiedName: 'createServer',

      type: 'function',

      filePath: 'src/api/server.ts',

      startLine: 10,

      endLine: 30,
    });

    graph.addSymbol({
      id: 'helper',

      projectId,

      name: 'helper',

      qualifiedName: 'helper',

      type: 'function',

      filePath: 'src/api/server.ts',

      startLine: 40,

      endLine: 50,
    });

    const entries = new EntryPointDetector(graph).detect(projectId);

    expect(entries).toHaveLength(1);

    expect(entries[0]?.symbolId).toBe('server-file');
  });

  it('returns only top hotspot subset', () => {
    const graph = new CodeGraphStore();

    const projectId = 'test';

    for (let i = 0; i < 20; i++) {
      graph.addSymbol({
        id: `file-${i}`,

        projectId,

        name: `file-${i}`,

        qualifiedName: `file-${i}`,

        type: 'file',

        filePath: `src/file-${i}.ts`,

        startLine: 1,

        endLine: 10,
      });
    }

    for (let i = 1; i < 20; i++) {
      graph.addEdge({
        id: `edge-${i}`,

        projectId,

        from: `file-${i}`,

        to: 'file-0',

        type: 'CALL_REFERENCE',
      });
    }

    const hotspots = new HotspotAnalyzer(graph).analyze(projectId);

    expect(hotspots.length).toBeLessThan(20);

    expect(hotspots[0]?.filePath).toBe('src/file-0.ts');
  });

  it('builds calibrated architecture', () => {
    const graph = new CodeGraphStore();

    const projectId = 'test';

    graph.addSymbol({
      id: 'cli',
      projectId,
      name: 'bin/tool.ts',
      qualifiedName: 'bin/tool.ts',
      type: 'file',
      filePath: 'bin/tool.ts',
      startLine: 1,
      endLine: 10,
    });

    graph.addSymbol({
      id: 'runtime',
      projectId,
      name: 'Runtime',
      qualifiedName: 'Runtime',
      type: 'class',
      filePath: 'src/runtime/runtime.ts',
      startLine: 1,
      endLine: 30,
    });

    graph.addEdge({
      id: 'call',
      projectId,
      from: 'cli',
      to: 'runtime',
      type: 'CALL_REFERENCE',
    });

    const result = new ArchitectureEngine(graph).analyze(projectId);

    expect(result.entryPoints.length).toBe(1);

    expect(result.hotspots.length).toBeGreaterThan(0);
  });
});
