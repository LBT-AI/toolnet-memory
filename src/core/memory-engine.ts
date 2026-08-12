import { randomUUID } from 'node:crypto';

import { getImportanceScore, inferImportance } from './importance.js';

import { Sanitizer } from '../security/sanitizer.js';

import { ConflictDetector } from '../memory/conflict-detector.js';

import {
  planMemoryConsolidation,
  type MemoryConsolidationResult,
} from '../memory/consolidation.js';

import {
  defaultExpiry,
  effectiveImportanceScore,
  isExpired,
  isMemoryActive,
} from '../memory/decay.js';

import type {
  ImportanceLevel,
  MemoryRecord,
  MemoryType,
  SearchQuery,
  SearchResult,
} from './types.js';

interface RememberInput {
  projectId: string;
  type: MemoryType;
  content: string;
  importance?: ImportanceLevel;
  tags?: string[];
  source?: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

export class MemoryEngine {
  private readonly memories = new Map<string, MemoryRecord>();

  private readonly sanitizer = new Sanitizer();

  private readonly conflicts = new ConflictDetector();

  remember(input: RememberInput): MemoryRecord {
    const now = new Date().toISOString();

    const content = this.sanitizer.sanitize(input.content.trim()).text;

    const importance = input.importance ?? inferImportance(input.type, content);

    const memory: MemoryRecord = {
      id: randomUUID(),

      projectId: input.projectId,

      type: input.type,

      content,

      importance,

      importanceScore: getImportanceScore(importance),

      tags: input.tags ?? [],

      source: input.source ?? 'agent',

      createdAt: now,
      updatedAt: now,

      expiresAt: input.expiresAt ?? defaultExpiry(input.type, importance, new Date(now)),

      metadata: this.sanitizer.sanitizeValue(input.metadata) as Record<string, unknown> | undefined,
    };

    const superseded = this.conflicts.findSuperseded(memory, this.list(input.projectId));

    if (superseded.length) {
      memory.metadata = {
        ...(memory.metadata ?? {}),
        supersedes: superseded.map((item) => item.id),
      };

      for (const old of superseded) {
        old.updatedAt = now;

        old.metadata = {
          ...(old.metadata ?? {}),
          supersededBy: memory.id,
          supersededAt: now,
        };

        this.memories.set(old.id, old);
      }
    }

    this.memories.set(memory.id, memory);

    return memory;
  }

  importRecords(records: MemoryRecord[]): number {
    let imported = 0;

    for (const memory of records) {
      if (!memory?.id) {
        continue;
      }

      this.memories.set(memory.id, memory);

      imported++;
    }

    return imported;
  }

  exportProject(projectId: string): MemoryRecord[] {
    return this.listAll(projectId);
  }

  get(id: string): MemoryRecord | undefined {
    return this.memories.get(id);
  }

  delete(id: string): boolean {
    return this.memories.delete(id);
  }

  listAll(projectId: string): MemoryRecord[] {
    return [...this.memories.values()]
      .filter((memory) => memory.projectId === projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  list(projectId: string): MemoryRecord[] {
    return this.listAll(projectId).filter((memory) => isMemoryActive(memory));
  }

  recent(projectId: string, limit = 10): MemoryRecord[] {
    return this.list(projectId).slice(0, limit);
  }

  byType(projectId: string, type: MemoryType): MemoryRecord[] {
    return this.list(projectId).filter((memory) => memory.type === type);
  }

  search(query: SearchQuery): SearchResult[] {
    const q = query.query.trim().toLowerCase();

    const limit = query.limit ?? 10;

    const tokens = q.split(/\s+/).filter(Boolean);

    return this.list(query.projectId)
      .filter((memory) => {
        if (query.types && !query.types.includes(memory.type)) {
          return false;
        }

        const effective = effectiveImportanceScore(memory);

        if (query.minImportanceScore && effective < query.minImportanceScore) {
          return false;
        }

        if (query.tags?.length) {
          const hasTag = query.tags.some((tag) => memory.tags.includes(tag));

          if (!hasTag) {
            return false;
          }
        }

        return true;
      })
      .map((memory) => {
        const content = memory.content.toLowerCase();

        const matches = tokens.filter((token) => content.includes(token)).length;

        const textScore = tokens.length === 0 ? 0 : matches / tokens.length;

        const importanceBoost = effectiveImportanceScore(memory) / 500;

        return {
          memory,
          score: textScore + importanceBoost,

          source: 'memory' as const,
        };
      })
      .filter((result) => q.length === 0 || result.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  consolidate(projectId: string, now = Date.now()): MemoryConsolidationResult {
    const plan = planMemoryConsolidation(this.list(projectId));

    const canonicalIds: string[] = [];

    let duplicatesRemoved = 0;

    for (const group of plan.groups) {
      const canonical = this.memories.get(group.canonicalId);

      if (!canonical) {
        continue;
      }

      canonical.tags = group.mergedTags;

      canonical.metadata = {
        ...(canonical.metadata ?? {}),

        consolidation: {
          version: 1,

          consolidatedAt: new Date(now).toISOString(),

          mergedIds: group.duplicateIds,

          sources: group.mergedSources,
        },
      };

      this.memories.set(canonical.id, canonical);

      canonicalIds.push(canonical.id);

      for (const duplicateId of group.duplicateIds) {
        if (this.memories.delete(duplicateId)) {
          duplicatesRemoved += 1;
        }
      }
    }

    return {
      groupsConsolidated: canonicalIds.length,

      duplicatesRemoved,

      canonicalIds,
    };
  }

  pruneExpired(projectId: string, now = Date.now()): number {
    let removed = 0;

    for (const [id, memory] of this.memories) {
      if (memory.projectId === projectId && isExpired(memory, now)) {
        this.memories.delete(id);

        removed++;
      }
    }

    return removed;
  }

  pruneSuperseded(projectId: string, retentionDays = 30, now = Date.now()): number {
    let removed = 0;

    const retentionMs = retentionDays * 86_400_000;

    for (const [id, memory] of this.memories) {
      if (memory.projectId !== projectId) {
        continue;
      }

      const supersededAt = memory.metadata?.supersededAt;

      if (typeof supersededAt !== 'string') {
        continue;
      }

      const age = now - new Date(supersededAt).getTime();

      if (age >= retentionMs) {
        this.memories.delete(id);

        removed++;
      }
    }

    return removed;
  }

  clearProject(projectId: string): number {
    let deleted = 0;

    for (const [id, memory] of this.memories) {
      if (memory.projectId === projectId) {
        this.memories.delete(id);
        deleted++;
      }
    }

    return deleted;
  }
}
