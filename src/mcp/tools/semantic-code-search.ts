import { z } from 'zod';

import type { MCPContext } from '../context.js';

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
  if (!ctx.codeSemantic) {
    return {
      available: false,
      results: [],
    };
  }

  const results = await ctx.codeSemantic.search(input.query, input.limit ?? 8);

  return {
    available: true,

    results: results.map((result) => ({
      id: result.chunk.id,

      filePath: result.chunk.filePath,

      symbol: result.chunk.symbolName,

      symbolType: result.chunk.symbolType,

      startLine: result.chunk.startLine,

      endLine: result.chunk.endLine,

      score: result.score,

      vectorScore: result.vectorScore,

      lexicalScore: result.lexicalScore,

      content: result.chunk.content,
    })),
  };
}
