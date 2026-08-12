import type { MemoryRecord } from '../core/types.js';

export type MemoryQualityTier = 'trusted' | 'useful' | 'weak' | 'noise';

export interface MemoryQualityAssessment {
  score: number;

  tier: MemoryQualityTier;

  stale: boolean;

  protected: boolean;

  pruneEligible: boolean;

  reasons: string[];
}

export interface MemoryLifecycleResult {
  reviewed: number;

  trusted: number;

  useful: number;

  weak: number;

  noise: number;

  stale: number;

  protected: number;

  pruned: number;
}

const DAY_MS = 86_400_000;

function classTag(
  memory: MemoryRecord
): 'permanent' | 'task' | 'session' | 'transient' | undefined {
  if (memory.tags.includes('class:permanent')) {
    return 'permanent';
  }

  if (memory.tags.includes('class:task')) {
    return 'task';
  }

  if (memory.tags.includes('class:session')) {
    return 'session';
  }

  if (memory.tags.includes('class:transient')) {
    return 'transient';
  }

  return undefined;
}

function ageDays(memory: MemoryRecord, now: number): number {
  const updated = new Date(memory.updatedAt).getTime();

  if (!Number.isFinite(updated)) {
    return 0;
  }

  return Math.max(0, (now - updated) / DAY_MS);
}

function staleAfterDays(memory: MemoryRecord): number {
  const cls = classTag(memory);

  if (cls === 'permanent') {
    return 730;
  }

  if (cls === 'task') {
    return 180;
  }

  if (cls === 'session') {
    return 45;
  }

  if (cls === 'transient') {
    return 7;
  }

  switch (memory.type) {
    case 'rule':
      return 730;

    case 'decision':
      return 365;

    case 'code':
      return 180;

    case 'todo':
      return 120;

    case 'summary':
      return 45;

    case 'activity':
      return 14;
  }
}

function isProtected(memory: MemoryRecord): boolean {
  return (
    classTag(memory) === 'permanent' ||
    memory.type === 'rule' ||
    memory.type === 'decision' ||
    memory.importance === 'critical'
  );
}

function looksLikeNoise(content: string): boolean {
  const text = content.normalize('NFKC').toLowerCase().trim();

  if (text.length < 8) {
    return true;
  }

  return [
    /^ok(?:ay)?[.!]?$/u,
    /^done[.!]?$/u,
    /^thanks?[.!]?$/u,
    /^test(?:ing)?[.!]?$/u,
    /^npm notice\b/u,
    /^changed \d+ packages?/u,
    /^packages? are looking for funding/u,
  ].some((pattern) => pattern.test(text));
}

export function assessMemoryQuality(
  memory: MemoryRecord,
  now = Date.now()
): MemoryQualityAssessment {
  let score = 50;

  const reasons: string[] = [];

  const cls = classTag(memory);

  if (cls === 'permanent') {
    score += 25;
    reasons.push('permanent project knowledge');
  } else if (cls === 'task') {
    score += 15;
    reasons.push('active task knowledge');
  } else if (cls === 'session') {
    score += 2;
    reasons.push('session-scoped knowledge');
  } else if (cls === 'transient') {
    score -= 25;
    reasons.push('transient knowledge');
  }

  switch (memory.importance) {
    case 'critical':
      score += 25;
      reasons.push('critical importance');
      break;

    case 'high':
      score += 15;
      reasons.push('high importance');
      break;

    case 'normal':
      break;

    case 'temporary':
      score -= 15;
      reasons.push('temporary importance');
      break;
  }

  if (memory.type === 'rule' || memory.type === 'decision') {
    score += 10;
    reasons.push('durable knowledge type');
  }

  const length = memory.content.trim().length;

  if (length < 12) {
    score -= 30;
    reasons.push('very short content');
  } else if (length < 30) {
    score -= 10;
    reasons.push('limited context');
  } else if (length <= 1200) {
    score += 8;
    reasons.push('useful context density');
  } else if (length > 5000) {
    score -= 15;
    reasons.push('excessively large memory');
  }

  if (looksLikeNoise(memory.content)) {
    score -= 35;
    reasons.push('matches transient/noise pattern');
  }

  const consolidation = memory.metadata?.consolidation;

  if (
    consolidation &&
    typeof consolidation === 'object' &&
    Array.isArray(
      (
        consolidation as {
          sources?: unknown;
        }
      ).sources
    ) &&
    (
      consolidation as {
        sources: unknown[];
      }
    ).sources.length > 1
  ) {
    score += 10;
    reasons.push('confirmed across multiple sources');
  }

  const stale = ageDays(memory, now) >= staleAfterDays(memory);

  if (stale) {
    score -= 15;
    reasons.push('stale for lifecycle class');
  }

  const protectedMemory = isProtected(memory);

  score = Math.max(0, Math.min(100, Math.round(score)));

  let tier: MemoryQualityTier;

  if (score >= 80) {
    tier = 'trusted';
  } else if (score >= 55) {
    tier = 'useful';
  } else if (score >= 30) {
    tier = 'weak';
  } else {
    tier = 'noise';
  }

  /*
   * Conservative pruning:
   *
   * - Never automatically remove rules, decisions,
   *   critical or permanent memory.
   * - Noise may be removed immediately only when it
   *   is explicitly transient/temporary/activity.
   * - Weak memory must also be stale.
   */
  const disposable =
    memory.importance === 'temporary' || memory.type === 'activity' || cls === 'transient';

  const pruneEligible =
    !protectedMemory &&
    ((tier === 'noise' && disposable) || (stale && (tier === 'noise' || tier === 'weak')));

  return {
    score,

    tier,

    stale,

    protected: protectedMemory,

    pruneEligible,

    reasons,
  };
}
