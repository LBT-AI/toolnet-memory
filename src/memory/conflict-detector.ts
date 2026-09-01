import type { MemoryRecord } from '../core/types.js';

const GENERIC_TAGS = new Set([
  'decision',
  'rule',
  'todo',
  'summary',
  'activity',
  'user',
  'error',
  'file',
  'write',
  'command',
  'learned',
  'session',
  'architecture',
  'fix',
  'context',
  'opencode',
  'agy',
  'codex',
]);

const STOPWORDS = new Set([
  'dùng',
  'sử',
  'dụng',
  'use',
  'using',
  'the',
  'a',
  'an',
  'cho',
  'và',
  'là',
  'của',
  'to',
  'for',
  'with',
  'quyết',
  'định',
]);

interface MemoryEvidence {
  userExplicit: boolean;

  sourceVerified: boolean;

  testVerified: boolean;

  crossSessionConfirmations: number;

  assistantDerived: boolean;
}

export interface ConflictResolution {
  superseded: MemoryRecord[];

  conflicts: MemoryRecord[];
}

function words(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .normalize('NFKC')
      .replace(/[^\p{L}\p{N}_-]+/gu, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOPWORDS.has(word))
  );
}

function similarity(left: string, right: string): number {
  const leftWords = words(left);

  const rightWords = words(right);

  if (leftWords.size === 0 || rightWords.size === 0) {
    return 0;
  }

  let intersection = 0;

  for (const word of leftWords) {
    if (!rightWords.has(word)) {
      continue;
    }

    intersection += 1;
  }

  const union = new Set([...leftWords, ...rightWords]).size;

  if (union === 0) {
    return 0;
  }

  return intersection / union;
}

function meaningfulTags(memory: MemoryRecord): Set<string> {
  return new Set(memory.tags.filter((tag) => !GENERIC_TAGS.has(tag.toLowerCase())));
}

function evidenceOf(memory: MemoryRecord): MemoryEvidence {
  const raw = memory.metadata?.evidence;

  if (!raw || typeof raw !== 'object') {
    return {
      userExplicit: false,

      sourceVerified: false,

      testVerified: false,

      crossSessionConfirmations: 0,

      assistantDerived: false,
    };
  }

  const evidence = raw as Record<string, unknown>;

  const confirmations = Number(evidence.crossSessionConfirmations);

  return {
    userExplicit: evidence.userExplicit === true,

    sourceVerified: evidence.sourceVerified === true,

    testVerified: evidence.testVerified === true,

    crossSessionConfirmations: Number.isFinite(confirmations) ? Math.max(0, confirmations) : 0,

    assistantDerived: evidence.assistantDerived === true,
  };
}

function confidenceOf(memory: MemoryRecord): number {
  const value = Number(memory.metadata?.confidence);

  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

function importanceAuthority(memory: MemoryRecord): number {
  if (memory.importance === 'critical') {
    return 20;
  }

  if (memory.importance === 'high') {
    return 12;
  }

  if (memory.importance === 'normal') {
    return 5;
  }

  return 0;
}

export function memoryAuthorityScore(memory: MemoryRecord): number {
  const evidence = evidenceOf(memory);

  let score = importanceAuthority(memory);

  if (evidence.userExplicit) {
    score += 100;
  }

  if (evidence.sourceVerified) {
    score += 60;
  }

  if (evidence.testVerified) {
    score += 60;
  }

  score += Math.min(5, evidence.crossSessionConfirmations) * 12;

  score += confidenceOf(memory) * 10;

  if (memory.metadata?.knowledgeClass === 'permanent') {
    score += 10;
  }

  if (evidence.assistantDerived) {
    score -= 15;
  }

  return Math.round(score * 1000) / 1000;
}

function topicOf(memory: MemoryRecord): string | undefined {
  const topic = memory.metadata?.topic;

  if (typeof topic !== 'string') {
    return undefined;
  }

  const normalized = topic.normalize('NFKC').trim().toLowerCase();

  if (!normalized) {
    return undefined;
  }

  return normalized;
}

function sharesMeaningfulTag(left: MemoryRecord, right: MemoryRecord): boolean {
  const leftTags = meaningfulTags(left);

  const rightTags = meaningfulTags(right);

  for (const tag of leftTags) {
    if (!rightTags.has(tag)) {
      continue;
    }

    return true;
  }

  return false;
}

function related(next: MemoryRecord, old: MemoryRecord): boolean {
  if (old.id === next.id) {
    return false;
  }

  if (old.projectId !== next.projectId) {
    return false;
  }

  if (old.type !== next.type) {
    return false;
  }

  if (old.metadata?.supersededBy) {
    return false;
  }

  const nextTopic = topicOf(next);

  const oldTopic = topicOf(old);

  if (nextTopic && oldTopic && nextTopic === oldTopic) {
    return true;
  }

  if (sharesMeaningfulTag(next, old)) {
    return true;
  }

  return similarity(next.content, old.content) >= 0.6;
}

function explicitUserRule(memory: MemoryRecord): boolean {
  if (memory.type !== 'rule') {
    return false;
  }

  return evidenceOf(memory).userExplicit;
}

function newerExplicitRuleWins(next: MemoryRecord, old: MemoryRecord): boolean {
  if (!explicitUserRule(next)) {
    return false;
  }

  if (!explicitUserRule(old)) {
    return false;
  }

  /*
   * `next` is the new remember() operation.
   * >= intentionally handles identical millisecond timestamps.
   */
  return next.createdAt >= old.createdAt;
}

export class ConflictDetector {
  resolve(next: MemoryRecord, existing: MemoryRecord[]): ConflictResolution {
    if (next.type !== 'rule' && next.type !== 'decision') {
      return {
        superseded: [],

        conflicts: [],
      };
    }

    const superseded: MemoryRecord[] = [];

    const conflicts: MemoryRecord[] = [];

    const nextAuthority = memoryAuthorityScore(next);

    for (const old of existing) {
      if (!related(next, old)) {
        continue;
      }

      const oldAuthority = memoryAuthorityScore(old);

      if (nextAuthority > oldAuthority) {
        superseded.push(old);

        continue;
      }

      if (nextAuthority < oldAuthority) {
        conflicts.push(old);

        continue;
      }

      if (newerExplicitRuleWins(next, old)) {
        superseded.push(old);

        continue;
      }

      conflicts.push(old);
    }

    return {
      superseded,

      conflicts,
    };
  }

  findSuperseded(next: MemoryRecord, existing: MemoryRecord[]): MemoryRecord[] {
    return this.resolve(next, existing).superseded;
  }
}
