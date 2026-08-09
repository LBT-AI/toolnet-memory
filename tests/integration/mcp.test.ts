import { describe, expect, it } from 'vitest';

import { MemoryEngine, ProjectManager } from '../../src/core/index.js';

import { RetrievalEngine } from '../../src/retrieval/retrieval-engine.js';

import { CodeGraphStore, ReferenceResolver } from '../../src/code-intelligence/index.js';

import type { MCPContext } from '../../src/mcp/context.js';

import { memorySearch } from '../../src/mcp/tools/memory-search.js';

import { memoryRemember } from '../../src/mcp/tools/memory-remember.js';

import { projectContext } from '../../src/mcp/tools/project-context.js';

describe('MCP Integration', () => {
  it('exposes memory and project context handlers', async () => {
    const memory = new MemoryEngine();

    const project = new ProjectManager().detect(process.cwd());

    const retrieval = new RetrievalEngine(memory);

    const graph = new CodeGraphStore();

    const references = new ReferenceResolver(graph);

    const ctx: MCPContext = {
      project,
      memory,
      retrieval,
      graph,
      references,
    };

    await memoryRemember(ctx, {
      type: 'decision',

      content: 'Use Hugging Face for remote storage',

      tags: ['storage'],
    });

    const results = await memorySearch(ctx, {
      query: 'Hugging Face storage',
    });

    expect(results.length).toBeGreaterThan(0);

    const context = await projectContext(ctx, {
      query: 'storage',
    });

    expect(context.project.name).toBeTruthy();

    expect(context.relevant.length).toBeGreaterThan(0);
  });
});
