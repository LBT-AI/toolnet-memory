import type { AdrRelevanceOptions, ArchitectureDecisionService } from './service.js';

import type { AdrListFilter, AdrSearchResult, ArchitectureDecisionRecord } from './types.js';

export const ADR_CONTEXT_LIMIT = 5;

/** Compact projection for agent context. Never includes raw history. */
export interface AdrContextEntry {
  id: string;
  title: string;
  status: string;
  summary: string;
  affectedPaths: string[];
  supersedes: string[];
  supersededBy?: string;
}

export function toContextEntry(record: ArchitectureDecisionRecord): AdrContextEntry {
  const summarySource = record.decision.trim() || record.context.trim();

  const summary = summarySource.length > 400 ? `${summarySource.slice(0, 397)}...` : summarySource;

  return {
    id: record.humanId,
    title: record.title,
    status: record.status,
    summary,
    affectedPaths: record.affectedPaths,
    supersedes: record.supersedes,
    ...(record.supersededBy ? { supersededBy: record.supersededBy } : {}),
  };
}

export interface AdrRelevanceInput {
  filePaths?: string[];
  symbols?: string[];
  limit?: number;
}

/**
 * Phase 75 — bounded relevance query.
 *
 * Only current, accepted ADRs are returned. Superseded/deprecated/rejected
 * records are never injected as active architecture guidance.
 */
export async function relevantDecisions(
  service: ArchitectureDecisionService,
  input: AdrRelevanceInput
): Promise<AdrContextEntry[]> {
  const limit = Math.min(Math.max(Math.floor(input.limit ?? ADR_CONTEXT_LIMIT), 1), 25);

  const collected = new Map<string, ArchitectureDecisionRecord>();

  for (const filePath of input.filePaths ?? []) {
    for (const record of await service.relevantByPath(filePath, {
      statuses: ['accepted'],
      limit,
    })) {
      collected.set(record.id, record);
    }
  }

  for (const symbol of input.symbols ?? []) {
    for (const record of await service.relevantBySymbol(symbol, {
      statuses: ['accepted'],
      limit,
    })) {
      collected.set(record.id, record);
    }
  }

  return [...collected.values()]
    .sort((left, right) => left.number - right.number)
    .slice(0, limit)
    .map(toContextEntry);
}

/** Human ids of relevant accepted ADRs, for impact output. */
export async function relevantDecisionIds(
  service: ArchitectureDecisionService,
  input: AdrRelevanceInput
): Promise<string[]> {
  return (await relevantDecisions(service, input)).map((entry) => entry.id);
}

/**
 * Phase 75 — read-only ADR query facade.
 *
 * A single entry point for the knowledge questions ToolNet must answer
 * ("which decisions constrain this file/symbol?"), without exposing the store or
 * the mutation surface to callers that only need to read.
 */
export class ArchitectureDecisionQuery {
  constructor(private readonly service: ArchitectureDecisionService) {}

  async get(reference: string): Promise<ArchitectureDecisionRecord> {
    return this.service.get(reference);
  }

  async list(filter: AdrListFilter = {}): Promise<ArchitectureDecisionRecord[]> {
    return (await this.service.list(filter)).records;
  }

  async search(query: string, limit?: number): Promise<AdrSearchResult[]> {
    return this.service.search(query, limit === undefined ? {} : { limit });
  }

  async affectedByPath(
    filePath: string,
    options?: AdrRelevanceOptions
  ): Promise<ArchitectureDecisionRecord[]> {
    return this.service.relevantByPath(filePath, options ?? {});
  }

  async affectedBySymbol(
    symbol: string,
    options?: AdrRelevanceOptions
  ): Promise<ArchitectureDecisionRecord[]> {
    return this.service.relevantBySymbol(symbol, options ?? {});
  }

  async supersessionChain(reference: string): Promise<{
    supersedes: string[];
    supersededBy: string[];
  }> {
    return this.service.supersessionChain(reference);
  }
}
