import { describe, expect, it } from 'vitest';

import { MemoryEngine } from '../../src/core/memory-engine.js';

import { RetrievalEngine } from '../../src/retrieval/retrieval-engine.js';

import { CodeGraphStore } from '../../src/code-intelligence/graph/graph-store.js';

import { ReferenceResolver } from '../../src/code-intelligence/symbols/reference-resolver.js';

import {
  createMCPRuntimeState,
  markDependencyReady,
  markHydrationCompleted,
  markMCPConnected,
} from '../../src/mcp/runtime-state.js';

import { toolnetStatus } from '../../src/mcp/tools/toolnet-status.js';

import type { MCPContext } from '../../src/mcp/context.js';

describe('toolnet_status', () => {
  it('returns compact MCP runtime health', () => {
    const memory = new MemoryEngine();

    const graph = new CodeGraphStore();

    const runtime = createMCPRuntimeState(100);

    markMCPConnected(runtime, 110);

    markDependencyReady(runtime, 'memory', 120);
    markDependencyReady(runtime, 'graph', 130);
    markDependencyReady(runtime, 'semantic', 140);

    markHydrationCompleted(runtime, 150);

    const ctx: MCPContext = {
      project: {
        id: 'project-1',
        name: 'demo',
        remote: 'demo',
        rootPath: '/tmp/demo',
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
        graphVersion: 1,
        memoryVersion: 1,
      },

      memory,

      retrieval: new RetrievalEngine(memory),

      graph,

      references: new ReferenceResolver(graph),

      runtime,
    };

    const status = toolnetStatus(ctx);

    expect(status.project.name).toBe('demo');

    expect(status.runtime?.phase).toBe('ready');

    expect(status.runtime?.metrics.startupMs).toBe(10);

    expect(status.data.memories).toBe(0);

    expect(status.data.graphSymbols).toBe(0);
  });
});
