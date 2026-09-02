import type { MemoryRecord } from '../core/types.js';
export type MemoryConflictKind =
  'rule' | 'decision' | 'todo' | 'next_action' | 'fix' | 'context' | 'architecture' | 'other';
export type MemoryLifecycleState =
  'active' | 'conflicting' | 'superseded' | 'resolved' | 'completed' | 'stale';
interface MemoryEvidence {
  userExplicit: boolean;
  sourceVerified: boolean;
  testVerified: boolean;
  crossSessionConfirmations: number;
  assistantDerived: boolean;
}
export interface ConflictResolution {
  kind: MemoryConflictKind;
  superseded: MemoryRecord[];
  conflicts: MemoryRecord[];
  completed: MemoryRecord[];
  resolved: MemoryRecord[];
}
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
  'next_action',
  'next-action',
  'opencode',
  'agy',
  'codex',
  'claude',
  'kiro',
  'cursor',
  'copilot',
  'grok',
  'toolnet',
  'kilo',
]);
const STOPWORDS = new Set([
  'dùng',
  'sử',
  'dụng',
  'cho',
  'và',
  'là',
  'của',
  'với',
  'một',
  'các',
  'use',
  'using',
  'the',
  'a',
  'an',
  'to',
  'for',
  'with',
  'and',
  'of',
  'quyết',
  'định',
]);
const LIFECYCLE_WORDS = new Set([
  'todo',
  'task',
  'next',
  'step',
  'action',
  'need',
  'needs',
  'needed',
  'remaining',
  'fix',
  'fixed',
  'fixing',
  'resolve',
  'resolved',
  'implemented',
  'complete',
  'completed',
  'done',
  'pass',
  'passed',
  'passing',
  'tests',
  'test',
  'cần',
  'làm',
  'sửa',
  'đã',
  'xử',
  'lý',
  'hoàn',
  'tất',
  'thành',
  'tiếp',
  'theo',
  'bước',
]);
const CONFLICT_KINDS = new Set<MemoryConflictKind>([
  'rule',
  'decision',
  'todo',
  'next_action',
  'fix',
  'context',
  'architecture',
]);
function normalizedText(value: string): string {
  return value.normalize('NFKC').trim().toLowerCase();
}
function metadataString(memory: MemoryRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = memory.metadata?.[key];
    if (typeof value !== 'string') {
      continue;
    }
    const normalized = normalizedText(value);
    if (normalized) {
      return normalized;
    }
  }
  return undefined;
}
function prefixedTag(memory: MemoryRecord, prefixes: string[]): string | undefined {
  for (const raw of memory.tags) {
    const tag = normalizedText(raw);
    for (const prefix of prefixes) {
      if (!tag.startsWith(prefix)) {
        continue;
      }
      const value = tag.slice(prefix.length).trim();
      if (value) {
        return value;
      }
    }
  }
  return undefined;
}
function normalizeConflictKind(value: unknown): MemoryConflictKind | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = normalizedText(value).replaceAll('-', '_');
  if (normalized === 'nextaction') {
    return 'next_action';
  }
  if (CONFLICT_KINDS.has(normalized as MemoryConflictKind)) {
    return normalized as MemoryConflictKind;
  }
  return undefined;
}
export function memoryConflictKind(memory: MemoryRecord): MemoryConflictKind {
  /*
   * New canonical metadata.
   */
  const explicit = normalizeConflictKind(memory.metadata?.conflictKind);
  if (explicit) {
    return explicit;
  }
  /*
   * Session learner provenance.
   */
  const learned = normalizeConflictKind(memory.metadata?.learningKind);
  if (learned) {
    return learned;
  }
  const lifecycleKind = normalizeConflictKind(memory.metadata?.lifecycleKind);
  if (lifecycleKind) {
    return lifecycleKind;
  }
  /*
   * Compatibility with existing kind:* tags.
   */
  for (const tag of memory.tags) {
    const normalized = normalizedText(tag);
    if (!normalized.startsWith('kind:')) {
      continue;
    }
    const tagged = normalizeConflictKind(normalized.slice(5));
    if (tagged) {
      return tagged;
    }
  }
  if (memory.tags.some((tag) => normalizedText(tag) === 'next_action')) {
    return 'next_action';
  }
  /*
   * Safe public MemoryType fallback.
   *
   * `code` cannot be guessed as fix/context because normal
   * code memories also use that type.
   */
  if (memory.type === 'rule') {
    return 'rule';
  }
  if (memory.type === 'decision') {
    return 'decision';
  }
  if (memory.type === 'todo') {
    return 'todo';
  }
  return 'other';
}
export function memoryLifecycleState(memory: MemoryRecord): MemoryLifecycleState {
  const raw = memory.metadata?.lifecycleState;
  if (
    typeof raw === 'string' &&
    ['active', 'conflicting', 'superseded', 'resolved', 'completed', 'stale'].includes(raw)
  ) {
    return raw as MemoryLifecycleState;
  }
  if (memory.metadata?.supersededBy) {
    return 'superseded';
  }
  return 'active';
}
function words(text: string): Set<string> {
  return new Set(
    normalizedText(text)
      .replace(/[^\p{L}\p{N}_-]+/gu, ' ')
      .split(/\s+/u)
      .filter((word) => word.length > 2 && !STOPWORDS.has(word))
  );
}
function subjectWords(text: string): Set<string> {
  return new Set([...words(text)].filter((word) => !LIFECYCLE_WORDS.has(word)));
}
function setSimilarity(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) {
    return 0;
  }
  let intersection = 0;
  for (const word of left) {
    if (right.has(word)) {
      intersection += 1;
    }
  }
  const union = new Set([...left, ...right]).size;
  if (union === 0) {
    return 0;
  }
  return intersection / union;
}
function similarity(left: string, right: string): number {
  return setSimilarity(words(left), words(right));
}
function subjectSimilarity(left: string, right: string): number {
  return setSimilarity(subjectWords(left), subjectWords(right));
}
function meaningfulTags(memory: MemoryRecord): Set<string> {
  return new Set(
    memory.tags.map(normalizedText).filter((tag) => {
      if (GENERIC_TAGS.has(tag)) {
        return false;
      }
      if (tag.startsWith('class:') || tag.startsWith('kind:') || tag.startsWith('level:')) {
        return false;
      }
      return true;
    })
  );
}
function sharesMeaningfulTag(left: MemoryRecord, right: MemoryRecord): boolean {
  const leftTags = meaningfulTags(left);
  const rightTags = meaningfulTags(right);
  for (const tag of leftTags) {
    if (rightTags.has(tag)) {
      return true;
    }
  }
  return false;
}
function topicOf(memory: MemoryRecord): string | undefined {
  return metadataString(memory, ['topic', 'topicKey']) ?? prefixedTag(memory, ['topic:']);
}
function entityOf(memory: MemoryRecord): string | undefined {
  return (
    metadataString(memory, ['entity', 'entityKey', 'subject', 'taskId', 'taskKey']) ??
    prefixedTag(memory, ['entity:', 'subject:', 'task:'])
  );
}
function provenancePaths(memory: MemoryRecord): Set<string> {
  const raw = memory.metadata?.provenance;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return new Set();
  }
  const paths = (raw as Record<string, unknown>).sourcePaths;
  if (!Array.isArray(paths)) {
    return new Set();
  }
  return new Set(
    paths
      .filter((value): value is string => typeof value === 'string')
      .map(normalizedText)
      .filter(Boolean)
  );
}
function sharesSourcePath(left: MemoryRecord, right: MemoryRecord): boolean {
  const leftPaths = provenancePaths(left);
  if (leftPaths.size === 0) {
    return false;
  }
  const rightPaths = provenancePaths(right);
  for (const path of leftPaths) {
    if (rightPaths.has(path)) {
      return true;
    }
  }
  return false;
}
function evidenceOf(memory: MemoryRecord): MemoryEvidence {
  const raw = memory.metadata?.evidence;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
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
function hasEvidence(memory: MemoryRecord): boolean {
  const evidence = evidenceOf(memory);
  return (
    evidence.userExplicit ||
    evidence.sourceVerified ||
    evidence.testVerified ||
    evidence.crossSessionConfirmations > 0
  );
}
function confidenceOf(memory: MemoryRecord): number {
  const value = Number(memory.metadata?.confidence);
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
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
function compatibleKinds(left: MemoryConflictKind, right: MemoryConflictKind): boolean {
  if (left === 'other' || right === 'other') {
    return false;
  }
  if (left === right) {
    return true;
  }
  const taskKinds = new Set<MemoryConflictKind>(['todo', 'next_action']);
  if (taskKinds.has(left) && taskKinds.has(right)) {
    return true;
  }
  if (left === 'fix' && taskKinds.has(right)) {
    return true;
  }
  if (right === 'fix' && taskKinds.has(left)) {
    return true;
  }
  /*
   * A verified fix may resolve stale context/state.
   */
  if ((left === 'fix' && right === 'context') || (right === 'fix' && left === 'context')) {
    return true;
  }
  return false;
}
function relationThreshold(left: MemoryConflictKind, right: MemoryConflictKind): number {
  if ((left === 'fix' && right === 'context') || (right === 'fix' && left === 'context')) {
    return 0.65;
  }
  const taskKinds = new Set<MemoryConflictKind>(['todo', 'next_action', 'fix']);
  if (taskKinds.has(left) && taskKinds.has(right)) {
    return 0.38;
  }
  if (left === 'rule' || left === 'decision') {
    return 0.6;
  }
  return 0.5;
}
function related(next: MemoryRecord, old: MemoryRecord): boolean {
  if (old.id === next.id) {
    return false;
  }
  if (old.projectId !== next.projectId) {
    return false;
  }
  const oldState = memoryLifecycleState(old);
  if (['superseded', 'resolved', 'completed', 'stale'].includes(oldState)) {
    return false;
  }
  const nextKind = memoryConflictKind(next);
  const oldKind = memoryConflictKind(old);
  if (!compatibleKinds(nextKind, oldKind)) {
    return false;
  }
  const nextTopic = topicOf(next);
  const oldTopic = topicOf(old);
  if (nextTopic && oldTopic && nextTopic === oldTopic) {
    return true;
  }
  const nextEntity = entityOf(next);
  const oldEntity = entityOf(old);
  if (nextEntity && oldEntity && nextEntity === oldEntity) {
    return true;
  }
  if (sharesMeaningfulTag(next, old)) {
    return true;
  }
  const threshold = relationThreshold(nextKind, oldKind);
  const subjectScore = subjectSimilarity(next.content, old.content);
  if (subjectScore >= threshold) {
    return true;
  }
  const textScore = similarity(next.content, old.content);
  if (textScore >= threshold) {
    return true;
  }
  /*
   * Same source file is only a supporting signal.
   * It still requires meaningful lexical overlap.
   */
  if (sharesSourcePath(next, old) && subjectScore >= Math.max(0.3, threshold - 0.2)) {
    return true;
  }
  return false;
}
function explicitUserRule(memory: MemoryRecord): boolean {
  return memoryConflictKind(memory) === 'rule' && evidenceOf(memory).userExplicit;
}
function newerExplicitRuleWins(next: MemoryRecord, old: MemoryRecord): boolean {
  if (!explicitUserRule(next) || !explicitUserRule(old)) {
    return false;
  }
  return next.createdAt >= old.createdAt;
}
function completionEvidence(memory: MemoryRecord): boolean {
  const evidence = evidenceOf(memory);
  return evidence.userExplicit || evidence.sourceVerified || evidence.testVerified;
}
function isTaskKind(kind: MemoryConflictKind): boolean {
  return kind === 'todo' || kind === 'next_action';
}
function newerOrEqual(next: MemoryRecord, old: MemoryRecord): boolean {
  return next.createdAt >= old.createdAt;
}
export class ConflictDetector {
  resolve(next: MemoryRecord, existing: MemoryRecord[]): ConflictResolution {
    const nextKind = memoryConflictKind(next);
    const result: ConflictResolution = {
      kind: nextKind,
      superseded: [],
      conflicts: [],
      completed: [],
      resolved: [],
    };
    if (nextKind === 'other') {
      return result;
    }
    const nextAuthority = memoryAuthorityScore(next);
    for (const old of existing) {
      if (!related(next, old)) {
        continue;
      }
      const oldKind = memoryConflictKind(old);
      const oldAuthority = memoryAuthorityScore(old);
      /*
       * FIX -> TODO/NEXT_ACTION
       *
       * A verified/user-confirmed fix closes the old task.
       * Assistant prose alone is not enough.
       */
      if (nextKind === 'fix' && isTaskKind(oldKind)) {
        if (completionEvidence(next)) {
          result.completed.push(old);
          continue;
        }
        result.conflicts.push(old);
        continue;
      }
      /*
       * FIX -> CONTEXT
       *
       * Verified fix can resolve a previously active state/context.
       */
      if (nextKind === 'fix' && oldKind === 'context') {
        if (completionEvidence(next) && nextAuthority >= oldAuthority) {
          result.resolved.push(old);
          continue;
        }
        result.conflicts.push(old);
        continue;
      }
      /*
       * TODO/NEXT_ACTION after FIX:
       * treat sufficiently authoritative task as a reopen.
       */
      if (isTaskKind(nextKind) && oldKind === 'fix') {
        if (evidenceOf(next).userExplicit || nextAuthority > oldAuthority) {
          result.superseded.push(old);
          continue;
        }
        result.conflicts.push(old);
        continue;
      }
      /*
       * Same task expressed as todo <-> next_action.
       */
      if (isTaskKind(nextKind) && isTaskKind(oldKind)) {
        if (
          nextAuthority > oldAuthority ||
          (nextAuthority === oldAuthority && newerOrEqual(next, old))
        ) {
          result.superseded.push(old);
          continue;
        }
        result.conflicts.push(old);
        continue;
      }
      /*
       * General deterministic authority resolution.
       */
      if (nextAuthority > oldAuthority) {
        result.superseded.push(old);
        continue;
      }
      if (nextAuthority < oldAuthority) {
        result.conflicts.push(old);
        continue;
      }
      if (newerExplicitRuleWins(next, old)) {
        result.superseded.push(old);
        continue;
      }
      /*
       * For context/fix/architecture, equal authority with a
       * newer observation is an update, not two active states.
       */
      if (
        ['context', 'fix', 'architecture', 'decision'].includes(nextKind) &&
        newerOrEqual(next, old)
      ) {
        result.superseded.push(old);
        continue;
      }
      const oldHasEvidence = hasEvidence(old);
      if (!oldHasEvidence && newerOrEqual(next, old)) {
        result.superseded.push(old);
        continue;
      }
      result.conflicts.push(old);
    }
    return result;
  }
  findSuperseded(next: MemoryRecord, existing: MemoryRecord[]): MemoryRecord[] {
    return this.resolve(next, existing).superseded;
  }
}
