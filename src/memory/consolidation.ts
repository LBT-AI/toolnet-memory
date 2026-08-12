import type { MemoryRecord, MemoryType } from '../core/types.js';

const CONSOLIDATABLE_TYPES = new Set<MemoryType>(['code', 'decision', 'rule', 'todo', 'summary']);

export interface MemoryConsolidationGroup {
  canonicalId: string;

  duplicateIds: string[];

  mergedTags: string[];

  mergedSources: string[];
}

export interface MemoryConsolidationPlan {
  groups: MemoryConsolidationGroup[];

  duplicates: number;
}

export interface MemoryConsolidationResult {
  groupsConsolidated: number;

  duplicatesRemoved: number;

  canonicalIds: string[];
}

function normalizeContent(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[“”"'`]/gu, '')
    .replace(/[.!?]+$/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

function knowledgeRank(memory: MemoryRecord): number {
  if (memory.tags.includes('class:permanent')) {
    return 4;
  }

  if (memory.tags.includes('class:task')) {
    return 3;
  }

  if (memory.tags.includes('class:session')) {
    return 2;
  }

  if (memory.tags.includes('class:transient')) {
    return 1;
  }

  return 0;
}

function compareQuality(left: MemoryRecord, right: MemoryRecord): number {
  const classDelta = knowledgeRank(right) - knowledgeRank(left);

  if (classDelta !== 0) {
    return classDelta;
  }

  const importanceDelta = right.importanceScore - left.importanceScore;

  if (importanceDelta !== 0) {
    return importanceDelta;
  }

  const updatedDelta = right.updatedAt.localeCompare(left.updatedAt);

  if (updatedDelta !== 0) {
    return updatedDelta;
  }

  const createdDelta = right.createdAt.localeCompare(left.createdAt);

  if (createdDelta !== 0) {
    return createdDelta;
  }

  return left.id.localeCompare(right.id);
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();

  const result: string[] = [];

  for (const value of values) {
    const normalized = value.trim();

    if (!normalized) {
      continue;
    }

    const key = normalized.normalize('NFKC').toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    result.push(normalized);
  }

  return result;
}

export function planMemoryConsolidation(records: MemoryRecord[]): MemoryConsolidationPlan {
  const buckets = new Map<string, MemoryRecord[]>();

  for (const memory of records) {
    /*
     * Activity is event history.
     * Two identical commands/messages may still represent
     * different real events, so activity is never collapsed.
     */
    if (!CONSOLIDATABLE_TYPES.has(memory.type)) {
      continue;
    }

    if (memory.metadata?.supersededBy) {
      continue;
    }

    const normalized = normalizeContent(memory.content);

    if (!normalized) {
      continue;
    }

    const key = [memory.projectId, memory.type, normalized].join('\u0000');

    const bucket = buckets.get(key) ?? [];

    bucket.push(memory);

    buckets.set(key, bucket);
  }

  const groups: MemoryConsolidationGroup[] = [];

  let duplicates = 0;

  for (const bucket of buckets.values()) {
    if (bucket.length < 2) {
      continue;
    }

    const ordered = [...bucket].sort(compareQuality);

    const canonical = ordered[0];

    if (!canonical) {
      continue;
    }

    const duplicateRecords = ordered.slice(1);

    groups.push({
      canonicalId: canonical.id,

      duplicateIds: duplicateRecords.map((memory) => memory.id),

      mergedTags: unique(ordered.flatMap((memory) => memory.tags)),

      mergedSources: unique(ordered.map((memory) => memory.source)),
    });

    duplicates += duplicateRecords.length;
  }

  return {
    groups,

    duplicates,
  };
}
