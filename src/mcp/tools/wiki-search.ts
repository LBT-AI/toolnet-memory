import { z } from 'zod';

import type { MCPContext } from '../context.js';

import { WikiService, WikiStore } from '../../wiki/index.js';

export const wikiSearchSchema = {
  query: z
    .string()
    .min(2)
    .max(500)
    .describe('Knowledge topic or project concept to search in ToolNet Wiki.'),

  limit: z.number().int().min(1).max(10).optional().describe('Maximum Wiki matches. Default 5.'),
};

export interface WikiSearchInput {
  query: string;
  limit?: number;
}

export async function wikiSearch(
  ctx: Pick<MCPContext, 'project' | 'storage'>,
  input: WikiSearchInput
) {
  const storage = ctx.storage;

  if (!storage) {
    throw new Error('Wiki storage unavailable');
  }

  const wiki = new WikiService(new WikiStore(storage, ctx.project));

  await wiki.initialize();

  const results = await wiki.search(input.query, input.limit ?? 5);

  return {
    schema: 'toolnet.wiki-search.v1',
    query: input.query,
    count: results.length,
    results: results.map(({ page, score }) => ({
      id: page.id,
      slug: page.slug,
      title: page.title,
      summary: page.summary,
      tags: page.tags,
      links: page.links,
      revision: page.revision,
      updatedAt: page.updatedAt,
      score,
    })),
  };
}
