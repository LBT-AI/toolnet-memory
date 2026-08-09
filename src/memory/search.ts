import type { SearchQuery, SearchResult } from '../core/types.js';

import { MemoryEngine } from '../core/memory-engine.js';

export function searchMemory(engine: MemoryEngine, query: SearchQuery): SearchResult[] {
  return engine.search(query);
}
