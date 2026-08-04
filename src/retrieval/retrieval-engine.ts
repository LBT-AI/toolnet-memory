import type {
  MemoryEngine,
} from "../core/memory-engine.js";

import {
  HybridSearch,
} from "./hybrid-search.js";

import {
  ContextBuilder,
} from "./context-builder.js";

import type {
  RetrievalOptions,
  RetrievalResult,
} from "./types.js";

export class RetrievalEngine {
  private readonly searcher =
    new HybridSearch();

  private readonly contextBuilder =
    new ContextBuilder();

  constructor(
    private readonly memory:
      MemoryEngine,
  ) {}

  search(
    projectId: string,
    query: string,
    options:
      RetrievalOptions = {},
  ): RetrievalResult[] {
    return this.searcher.search(
      query,
      this.memory.list(
        projectId,
      ),
      options,
    );
  }

  context(
    projectId: string,
    query: string,
    options:
      RetrievalOptions = {},
  ): string {
    const results =
      this.search(
        projectId,
        query,
        options,
      );

    return this.contextBuilder.build(
      results,
    );
  }
}
