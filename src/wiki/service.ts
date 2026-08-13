import { randomUUID } from 'node:crypto';

import { WikiStore } from './store.js';

import type {
  WikiCreatePageInput,
  WikiPageV1,
  WikiRevisionV1,
  WikiSearchResult,
  WikiStateV1,
  WikiSummary,
  WikiUpdatePageInput,
} from './types.js';

export class WikiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number
  ) {
    super(message);
  }
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of values) {
    const value = raw.replace(/\s+/gu, ' ').trim();

    if (!value) {
      continue;
    }

    const key = value.normalize('NFKC').toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(value);
  }

  return result;
}

export function wikiSlug(value: string): string {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 120);

  if (!slug) {
    throw new WikiError('Invalid Wiki slug', 400);
  }

  return slug;
}

export function extractWikiLinks(content: string): string[] {
  const links: string[] = [];

  for (const match of content.matchAll(/\[\[([^\[\]]+)\]\]/gu)) {
    const target = match[1]?.trim();

    if (!target) {
      continue;
    }

    links.push(wikiSlug(target));
  }

  return unique(links);
}

function tokens(value: string): string[] {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .split(/[^\p{L}\p{N}_-]+/u)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);
}

function revisionOf(page: WikiPageV1): WikiRevisionV1 {
  return {
    id: `revision-${randomUUID()}`,
    pageId: page.id,
    slug: page.slug,
    revision: page.revision,
    title: page.title,
    ...(page.summary ? { summary: page.summary } : {}),
    content: page.content,
    tags: [...page.tags],
    links: [...page.links],
    createdAt: page.updatedAt,
  };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class WikiService {
  private state?: WikiStateV1;
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly store: WikiStore) {}

  async initialize(): Promise<void> {
    await this.ensureState();
  }

  private async ensureState(): Promise<WikiStateV1> {
    if (!this.state) {
      this.state = await this.store.load();
    }

    return this.state;
  }

  private async mutate<T>(callback: (state: WikiStateV1) => T): Promise<T> {
    let result!: T;

    const current = this.queue.then(async () => {
      const state = await this.ensureState();

      result = callback(state);
      state.updatedAt = new Date().toISOString();

      await this.store.save(state);
    });

    this.queue = current.then(
      () => undefined,
      () => undefined
    );

    await current;

    return result;
  }

  async summary(): Promise<WikiSummary> {
    const state = await this.ensureState();

    const backlinks = new Set(state.pages.flatMap((page) => page.links));

    return {
      schema: 'toolnet.wiki-summary.v1',
      projectId: state.projectId,
      pages: state.pages.length,
      revisions: state.revisions.length,
      tags: unique(state.pages.flatMap((page) => page.tags)).sort((a, b) => a.localeCompare(b)),
      links: state.pages.reduce((total, page) => total + page.links.length, 0),
      orphanPages: state.pages.filter(
        (page) => page.links.length === 0 && !backlinks.has(page.slug)
      ).length,
      automatedPages: state.pages.filter((page) =>
        page.tags.some((tag) => tag.startsWith('toolnet-auto-'))
      ).length,
      updatedAt: state.updatedAt,
    };
  }

  async listPages(): Promise<WikiPageV1[]> {
    const state = await this.ensureState();

    return clone([...state.pages].sort((a, b) => a.title.localeCompare(b.title)));
  }

  async getPage(reference: string): Promise<WikiPageV1> {
    const state = await this.ensureState();
    const normalized = wikiSlug(reference);

    const page = state.pages.find((item) => item.slug === normalized || item.id === reference);

    if (!page) {
      throw new WikiError(`Wiki page not found: ${reference}`, 404);
    }

    return clone(page);
  }

  async createPage(input: WikiCreatePageInput): Promise<WikiPageV1> {
    return this.mutate((state) => {
      const title = input.title.trim();
      const content = input.content.trim();

      if (!title) {
        throw new WikiError('Wiki title is required', 400);
      }

      const slug = wikiSlug(input.slug ?? title);

      if (state.pages.some((page) => page.slug === slug)) {
        throw new WikiError(`Wiki page already exists: ${slug}`, 409);
      }

      const now = new Date().toISOString();

      const page: WikiPageV1 = {
        id: `wiki-${randomUUID()}`,
        slug,
        title,
        ...(input.summary?.trim() ? { summary: input.summary.trim() } : {}),
        content,
        tags: unique(input.tags ?? []),
        links: extractWikiLinks(content),
        revision: 1,
        createdAt: now,
        updatedAt: now,
      };

      state.pages.push(page);
      state.revisions.push(revisionOf(page));

      return clone(page);
    });
  }

  async updatePage(reference: string, input: WikiUpdatePageInput): Promise<WikiPageV1> {
    return this.mutate((state) => {
      const normalized = wikiSlug(reference);

      const page = state.pages.find((item) => item.slug === normalized || item.id === reference);

      if (!page) {
        throw new WikiError(`Wiki page not found: ${reference}`, 404);
      }

      if (input.title !== undefined) {
        const title = input.title.trim();

        if (!title) {
          throw new WikiError('Wiki title is required', 400);
        }

        page.title = title;
      }

      if (input.summary !== undefined) {
        const summary = input.summary.trim();

        if (summary) {
          page.summary = summary;
        } else {
          delete page.summary;
        }
      }

      if (input.content !== undefined) {
        page.content = input.content.trim();
        page.links = extractWikiLinks(page.content);
      }

      if (input.tags !== undefined) {
        page.tags = unique(input.tags);
      }

      page.revision += 1;
      page.updatedAt = new Date().toISOString();

      state.revisions.push(revisionOf(page));

      return clone(page);
    });
  }

  async history(reference: string): Promise<WikiRevisionV1[]> {
    const page = await this.getPage(reference);
    const state = await this.ensureState();

    return clone(
      state.revisions
        .filter((revision) => revision.pageId === page.id)
        .sort((a, b) => b.revision - a.revision)
    );
  }

  async backlinks(reference: string): Promise<WikiPageV1[]> {
    const page = await this.getPage(reference);
    const state = await this.ensureState();

    return clone(
      state.pages
        .filter((candidate) => candidate.links.includes(page.slug))
        .sort((a, b) => a.title.localeCompare(b.title))
    );
  }

  async search(query: string, limit = 10): Promise<WikiSearchResult[]> {
    const state = await this.ensureState();
    const queryTokens = unique(tokens(query));

    if (queryTokens.length === 0) {
      return [];
    }

    const max = Math.max(1, Math.min(20, Math.floor(limit)));

    const results: WikiSearchResult[] = [];

    for (const page of state.pages) {
      const title = page.title.toLowerCase();
      const slug = page.slug.toLowerCase();
      const summary = page.summary?.toLowerCase() ?? '';
      const content = page.content.toLowerCase();
      const tags = page.tags.map((tag) => tag.toLowerCase());

      let score = 0;

      for (const token of queryTokens) {
        if (slug === token) {
          score += 12;
        }

        if (title === token) {
          score += 10;
        }

        if (title.includes(token)) {
          score += 6;
        }

        if (slug.includes(token)) {
          score += 5;
        }

        if (tags.some((tag) => tag === token)) {
          score += 5;
        } else if (tags.some((tag) => tag.includes(token))) {
          score += 3;
        }

        if (summary.includes(token)) {
          score += 2;
        }

        if (content.includes(token)) {
          score += 1;
        }
      }

      if (score > 0) {
        results.push({
          page: clone(page),
          score,
        });
      }
    }

    return results
      .sort((a, b) => b.score - a.score || b.page.updatedAt.localeCompare(a.page.updatedAt))
      .slice(0, max);
  }
}
