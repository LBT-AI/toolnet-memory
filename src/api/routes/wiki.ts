import type { MemoryHubScope, MemoryHubService } from '../../hub/index.js';

import {
  WikiError,
  type WikiCreatePageInput,
  type WikiService,
  type WikiUpdatePageInput,
} from '../../wiki/index.js';

async function requireScope(
  hub: MemoryHubService,
  principal: string,
  scope: MemoryHubScope
): Promise<void> {
  if (!(await hub.authorize(principal, scope))) {
    throw new WikiError(`Principal '${principal}' lacks '${scope}'`, 403);
  }
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new WikiError('Invalid Wiki request', 400);
  }

  return value as Record<string, unknown>;
}

function text(value: unknown, name: string, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new WikiError(`Invalid ${name}`, 400);
  }

  return value.trim();
}

function optionalText(value: unknown, name: string, max: number): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || value.length > max) {
    throw new WikiError(`Invalid ${name}`, 400);
  }

  return value;
}

function tags(value: unknown): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (
    !Array.isArray(value) ||
    value.length > 50 ||
    value.some((item) => typeof item !== 'string' || item.length > 100)
  ) {
    throw new WikiError('Invalid Wiki tags', 400);
  }

  return value as string[];
}

export async function apiWikiSummary(wiki: WikiService, hub: MemoryHubService, principal: string) {
  await requireScope(hub, principal, 'wiki:read');

  return {
    schema: 'toolnet.api-wiki-summary.v1',
    wiki: await wiki.summary(),
  };
}

export async function apiWikiPages(wiki: WikiService, hub: MemoryHubService, principal: string) {
  await requireScope(hub, principal, 'wiki:read');

  return {
    schema: 'toolnet.api-wiki-pages.v1',
    pages: await wiki.listPages(),
  };
}

export async function apiWikiCreatePage(
  wiki: WikiService,
  hub: MemoryHubService,
  principal: string,
  value: unknown
) {
  await requireScope(hub, principal, 'wiki:write');

  const input = object(value);

  const create: WikiCreatePageInput = {
    ...(input.slug !== undefined
      ? {
          slug: text(input.slug, 'Wiki slug', 120),
        }
      : {}),
    title: text(input.title, 'Wiki title', 200),
    ...(input.summary !== undefined
      ? {
          summary: optionalText(input.summary, 'Wiki summary', 1000),
        }
      : {}),
    content: typeof input.content === 'string' ? input.content : '',
    ...(input.tags !== undefined ? { tags: tags(input.tags) } : {}),
  };

  return {
    schema: 'toolnet.api-wiki-page.v1',
    page: await wiki.createPage(create),
  };
}

export async function apiWikiPage(
  wiki: WikiService,
  hub: MemoryHubService,
  principal: string,
  reference: string
) {
  await requireScope(hub, principal, 'wiki:read');

  return {
    schema: 'toolnet.api-wiki-page.v1',
    page: await wiki.getPage(reference),
  };
}

export async function apiWikiUpdatePage(
  wiki: WikiService,
  hub: MemoryHubService,
  principal: string,
  reference: string,
  value: unknown
) {
  await requireScope(hub, principal, 'wiki:write');

  const input = object(value);

  const update: WikiUpdatePageInput = {
    ...(input.title !== undefined
      ? {
          title: text(input.title, 'Wiki title', 200),
        }
      : {}),
    ...(input.summary !== undefined
      ? {
          summary: optionalText(input.summary, 'Wiki summary', 1000),
        }
      : {}),
    ...(input.content !== undefined
      ? {
          content:
            typeof input.content === 'string'
              ? input.content
              : (() => {
                  throw new WikiError('Invalid Wiki content', 400);
                })(),
        }
      : {}),
    ...(input.tags !== undefined ? { tags: tags(input.tags) } : {}),
  };

  return {
    schema: 'toolnet.api-wiki-page.v1',
    page: await wiki.updatePage(reference, update),
  };
}

export async function apiWikiSearch(
  wiki: WikiService,
  hub: MemoryHubService,
  principal: string,
  query: string,
  limit: number
) {
  await requireScope(hub, principal, 'wiki:read');

  return {
    schema: 'toolnet.api-wiki-search.v1',
    query,
    results: await wiki.search(query, limit),
  };
}

export async function apiWikiHistory(
  wiki: WikiService,
  hub: MemoryHubService,
  principal: string,
  reference: string
) {
  await requireScope(hub, principal, 'wiki:read');

  return {
    schema: 'toolnet.api-wiki-history.v1',
    revisions: await wiki.history(reference),
  };
}

export async function apiWikiBacklinks(
  wiki: WikiService,
  hub: MemoryHubService,
  principal: string,
  reference: string
) {
  await requireScope(hub, principal, 'wiki:read');

  return {
    schema: 'toolnet.api-wiki-backlinks.v1',
    pages: await wiki.backlinks(reference),
  };
}
