import type { ImportanceLevel } from '../core/types.js';

import type { LearnedMemoryCandidate } from '../session/learner/types.js';

export type PromotionMode = 'off' | 'conservative' | 'balanced' | 'aggressive';

export type MemoryKnowledgeClass = 'permanent' | 'task' | 'session' | 'transient';

export interface CanonicalPromotionPolicy {
  mode: PromotionMode;

  minScore: number;

  minConfidence: number;
}

export interface MemoryPromotionEvaluation {
  knowledgeClass: MemoryKnowledgeClass;

  score: number;

  threshold: number;

  persist: boolean;
}

const CRITICAL_KINDS = new Set(['rule', 'blocker', 'architecture', 'deploy']);

const CONTINUITY_KINDS = new Set(['fix', 'todo', 'context', 'next_action']);

function clamp01(value: number): number {
  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

function finiteNumber(value: string | undefined, fallback: number): number {
  const parsed = Number.parseFloat(value ?? '');

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

function normalizeMode(value: string | undefined): PromotionMode {
  if (value === 'off') {
    return 'off';
  }

  if (value === 'balanced') {
    return 'balanced';
  }

  if (value === 'aggressive') {
    return 'aggressive';
  }

  return 'conservative';
}

export function loadCanonicalPromotionPolicy(): CanonicalPromotionPolicy {
  return {
    mode: normalizeMode(process.env.TOOLNET_MEMORY_PROMOTION),

    minScore: clamp01(finiteNumber(process.env.TOOLNET_PROMOTE_MIN_SCORE, 0.65)),

    minConfidence: clamp01(finiteNumber(process.env.TOOLNET_PROMOTE_MIN_CONFIDENCE, 0.78)),
  };
}

function importanceBase(importance: ImportanceLevel): number {
  switch (importance) {
    case 'critical':
      return 1;

    case 'high':
      return 0.85;

    case 'normal':
      return 0.6;

    case 'temporary':
      return 0.25;
  }
}

export function scoreMemoryCandidate(
  candidate: Pick<LearnedMemoryCandidate, 'importance' | 'confidence'>
): number {
  const raw = clamp01(importanceBase(candidate.importance) * 0.75 + candidate.confidence * 0.25);

  return Math.round(raw * 1_000_000) / 1_000_000;
}

function candidateEvidence(
  candidate: Pick<LearnedMemoryCandidate, 'evidence'>
): LearnedMemoryCandidate['evidence'] & {} {
  if (candidate.evidence) {
    return candidate.evidence;
  }

  return {
    userExplicit: false,

    sourceVerified: false,

    testVerified: false,

    crossSessionConfirmations: 0,

    assistantDerived: false,
  };
}

export function classifyMemoryKnowledge(
  candidate: Pick<LearnedMemoryCandidate, 'kind' | 'importance' | 'confidence' | 'evidence'>,
  policy: CanonicalPromotionPolicy = loadCanonicalPromotionPolicy()
): MemoryKnowledgeClass {
  if (candidate.importance === 'temporary') {
    return 'transient';
  }

  if (candidate.confidence < policy.minConfidence) {
    return 'transient';
  }

  const evidence = candidateEvidence(candidate);

  const explicitRule = candidate.kind === 'rule' && evidence.userExplicit;

  if (explicitRule) {
    return 'permanent';
  }

  if (candidate.kind === 'rule') {
    return 'session';
  }

  const architectureConfirmed =
    candidate.kind === 'architecture' &&
    (evidence.userExplicit ||
      evidence.sourceVerified ||
      evidence.testVerified ||
      evidence.crossSessionConfirmations >= 2);

  if (architectureConfirmed) {
    return 'permanent';
  }

  if (candidate.kind === 'architecture') {
    return 'session';
  }

  const taskScoped =
    candidate.kind === 'decision' || candidate.kind === 'todo' || candidate.kind === 'fix';

  if (taskScoped) {
    return 'task';
  }

  return 'session';
}

export function promotionThreshold(
  category: string,
  policy: CanonicalPromotionPolicy = loadCanonicalPromotionPolicy()
): number {
  if (policy.mode === 'off') {
    return Number.POSITIVE_INFINITY;
  }

  let reduction = 0;

  if (policy.mode === 'balanced') {
    reduction = 0.1;
  }

  if (policy.mode === 'aggressive') {
    reduction = 0.15;
  }

  let threshold = Math.max(policy.mode === 'aggressive' ? 0.5 : 0.55, policy.minScore - reduction);

  if (CRITICAL_KINDS.has(category)) {
    threshold = Math.max(0.5, threshold - 0.1);
  }

  if (CONTINUITY_KINDS.has(category)) {
    threshold = Math.max(0.5, threshold - 0.05);
  }

  return threshold;
}

export function shouldPromoteScore(
  score: number,
  category: string,
  policy: CanonicalPromotionPolicy = loadCanonicalPromotionPolicy()
): boolean {
  if (policy.mode === 'off') {
    return false;
  }

  if (!Number.isFinite(score)) {
    return false;
  }

  return score >= promotionThreshold(category, policy);
}

export function evaluateMemoryPromotion(
  candidate: Pick<LearnedMemoryCandidate, 'kind' | 'importance' | 'confidence'>,
  policy: CanonicalPromotionPolicy = loadCanonicalPromotionPolicy()
): MemoryPromotionEvaluation {
  const knowledgeClass = classifyMemoryKnowledge(candidate, policy);

  const score = scoreMemoryCandidate(candidate);

  const threshold = promotionThreshold(candidate.kind, policy);

  if (knowledgeClass === 'transient') {
    return {
      knowledgeClass,
      score,
      threshold,
      persist: false,
    };
  }

  if (policy.mode === 'off') {
    return {
      knowledgeClass,
      score,
      threshold,
      persist: false,
    };
  }

  return {
    knowledgeClass,
    score,
    threshold,
    persist: score >= threshold,
  };
}
