import type {
  MemoryRecord,
  MemoryType,
} from "../core/types.js";

export interface RetrievalOptions {
  topK?: number;
  minScore?: number;
  types?: MemoryType[];
}

export interface RetrievalResult {
  memory: MemoryRecord;

  score: number;

  scores: {
    keyword: number;
    recency: number;
    importance: number;
    type: number;
  };
}
