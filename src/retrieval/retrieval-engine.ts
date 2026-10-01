import type { MemoryEngine } from '../core/memory-engine.js';

import { HybridSearch } from './hybrid-search.js';

import { ContextBuilder } from './context-builder.js';

import type { RetrievalOptions, RetrievalResult } from './types.js';

export class RetrievalEngine {
  private readonly searcher = new HybridSearch();

  private readonly contextBuilder = new ContextBuilder();

  constructor(private readonly memory: MemoryEngine) {}

  search(projectId: string, query: string, options: RetrievalOptions = {}): RetrievalResult[] {
    /*
     * Default search is "current truth": only active memories. Requesting
     * superseded memories is an explicit historical-retrieval operation.
     */
    const memories = options.includeSuperseded
      ? this.memory.listAll(projectId)
      : this.memory.list(projectId);

    return this.searcher.search(query, memories, options);
  }

  context(projectId: string, query: string, options: RetrievalOptions = {}): string {
    const results = this.search(projectId, query, options);

    return this.contextBuilder.build(results);
  }
}
