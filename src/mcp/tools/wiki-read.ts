import { z } from 'zod';

import type { MCPContext } from '../context.js';

import { WikiService, WikiStore } from '../../wiki/index.js';

export const wikiReadSchema = {
  page: z.string().min(1).max(200).describe('Wiki page slug or page id.'),
};

export interface WikiReadInput {
  page: string;
}

export async function wikiRead(ctx: Pick<MCPContext, 'project' | 'storage'>, input: WikiReadInput) {
  const storage = ctx.storage;

  if (!storage) {
    throw new Error('Wiki storage unavailable');
  }

  const wiki = new WikiService(new WikiStore(storage, ctx.project));

  await wiki.initialize();

  const page = await wiki.getPage(input.page);
  const backlinks = await wiki.backlinks(page.slug);

  return {
    schema: 'toolnet.wiki-read.v1',
    page,
    backlinks: backlinks.map((item) => ({
      slug: item.slug,
      title: item.title,
    })),
  };
}
