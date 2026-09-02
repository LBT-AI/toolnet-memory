import { z } from 'zod';
import type { MCPContext } from '../context.js';
import {
  LOCAL_CODE_SEARCH_CONTRACT,
  LOCAL_CODE_SEARCH_ENGINE,
  LOCAL_CODE_SEARCH_MODE,
} from '../../code-intelligence/semantic/search-contract.js';
export const semanticCodeSearchSchema = {
  query: z.string().min(1),
  limit: z.number().int().min(1).max(20).optional(),
};
export async function semanticCodeSearch(
  ctx: MCPContext,
  input: {
    query: string;
    limit?: number;
  }
) {
  /*
   * semantic_code_search is retained as a legacy MCP name.
   * Current implementation is local lexical FTS5/BM25.
   */
  if (!ctx.codeSemantic) {
    return {
      available: false,
      engine: LOCAL_CODE_SEARCH_ENGINE,
      mode: LOCAL_CODE_SEARCH_MODE,
      semantic: false,
      embedding: false,
      vectorDatabase: false,
      legacyAlias: 'semantic_code_search',
      results: [],
    };
  }
  const results = await ctx.codeSemantic.search(input.query, input.limit ?? 8);
  return {
    available: true,
    engine: LOCAL_CODE_SEARCH_ENGINE,
    mode: LOCAL_CODE_SEARCH_MODE,
    semantic: false,
    embedding: false,
    vectorDatabase: false,
    legacyAlias: 'semantic_code_search',
    searchContract: LOCAL_CODE_SEARCH_CONTRACT,
    results: results.map((result) => ({
      id: result.chunk.id,
      filePath: result.chunk.filePath,
      symbol: result.chunk.symbolName,
      symbolType: result.chunk.symbolType,
      startLine: result.chunk.startLine,
      endLine: result.chunk.endLine,
      score: result.score,
      lexicalScore: result.lexicalScore,
      /*
       * Legacy compatibility field.
       * Always zero: vector search does not exist.
       */
      vectorScore: result.vectorScore,
      engine: result.engine,
      mode: result.mode,
      content: result.chunk.content,
    })),
  };
}
