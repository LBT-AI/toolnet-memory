export interface WikiPageV1 {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  content: string;
  tags: string[];
  links: string[];
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface WikiRevisionV1 {
  id: string;
  pageId: string;
  slug: string;
  revision: number;
  title: string;
  summary?: string;
  content: string;
  tags: string[];
  links: string[];
  createdAt: string;
}

export interface WikiStateV1 {
  schema: 'toolnet.wiki.v1';
  version: 1;
  projectId: string;
  pages: WikiPageV1[];
  revisions: WikiRevisionV1[];
  createdAt: string;
  updatedAt: string;
}

export interface WikiCreatePageInput {
  slug?: string;
  title: string;
  summary?: string;
  content: string;
  tags?: string[];
}

export interface WikiUpdatePageInput {
  title?: string;
  summary?: string;
  content?: string;
  tags?: string[];
}

export interface WikiSearchResult {
  page: WikiPageV1;
  score: number;
}

export interface WikiSummary {
  schema: 'toolnet.wiki-summary.v1';
  projectId: string;
  pages: number;
  revisions: number;
  tags: string[];
  links: number;
  orphanPages: number;
  automatedPages: number;
  updatedAt: string;
}
