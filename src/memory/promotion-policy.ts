import type { ImportanceLevel } from '../core/types.js';

import type { LearnedMemoryCandidate, LearnedMemoryKind } from '../session/learner/types.js';

import { SecretScanner } from '../security/secret-scanner.js';

export type PromotionMode = 'off' | 'conservative' | 'balanced' | 'aggressive';

/**
 * Lifetime class of a durable memory record.
 *
 * This is the canonical `knowledgeClass` persisted on MemoryStore records and
 * consumed by the freshness/lifecycle modules. It is deliberately small: it
 * answers "how long does this kind of knowledge stay current", not "what is
 * this about".
 */
export type MemoryKnowledgeClass = 'permanent' | 'task' | 'session' | 'transient';

/**
 * Phase 86D: the durable knowledge taxonomy.
 *
 * The lifetime class above is a coarse storage concern. This taxonomy is the
 * product-facing classification used for policy reason codes, the certification
 * matrix, and future retrieval/status surfaces. It is finite on purpose; new
 * entries require an eligibility rule, not just a label.
 */
export type MemoryKnowledgeType =
  | 'project_rule'
  | 'requirement'
  | 'constraint'
  | 'architecture_decision'
  | 'decision'
  | 'verified_fact'
  | 'root_cause'
  | 'verified_fix'
  | 'deployment'
  | 'blocker'
  | 'handoff'
  | 'preference'
  | 'operational_reference';

export type MemoryScopePolicy = 'project' | 'global';

export type MemoryPolicyDecision = 'accepted' | 'rejected';

/**
 * Deterministic policy reason codes.
 *
 * These are policy facts, not chain-of-thought. They exist so tests, doctor and
 * future operators can explain *why* a candidate was accepted or rejected
 * without persisting any private reasoning.
 */
export type MemoryPolicyReasonCode =
  | 'accepted_project_rule'
  | 'accepted_requirement'
  | 'accepted_constraint'
  | 'accepted_architecture_decision'
  | 'accepted_decision'
  | 'accepted_verified_fact'
  | 'accepted_root_cause'
  | 'accepted_verified_fix'
  | 'accepted_deployment'
  | 'accepted_blocker'
  | 'accepted_handoff'
  | 'accepted_preference'
  | 'accepted_operational_reference'
  | 'rejected_empty'
  | 'rejected_too_large'
  | 'rejected_secret'
  | 'rejected_speculative'
  | 'rejected_transient'
  | 'rejected_low_confidence'
  | 'rejected_scope';

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

export interface MemoryPolicyOptions {
  /**
   * Explicit memory_save. Explicit entry keeps its own authority path: it is
   * not rejected by the auto-importance threshold or by a low auto confidence,
   * but it still must pass secret safety, scope and size limits.
   */
  explicit?: boolean;

  /** Requested durable scope. Auto-capture always requests `project`. */
  requestedScope?: MemoryScopePolicy;

  /** Hard content length override (used by tests). */
  maxChars?: number;

  /** Candidate content, when the caller only passes a partial object. */
  content?: string;
}

export interface MemoryPolicyEvaluation {
  decision: MemoryPolicyDecision;

  reasonCode: MemoryPolicyReasonCode;

  knowledgeType: MemoryKnowledgeType;

  knowledgeClass: MemoryKnowledgeClass;

  scope: MemoryScopePolicy;

  score: number;

  threshold: number;

  persist: boolean;

  policyVersion: number;
}

/**
 * Bumped whenever the acceptance/rejection semantics change. Recorded on new
 * memories so historical rows can be interpreted under the policy that produced
 * them.
 */
export const MEMORY_POLICY_VERSION = 1;

/** Concise by default: a durable memory is a claim, not a transcript. */
export const MAX_AUTO_MEMORY_CHARS = 1000;

/** Explicit saves may be larger, but still bounded — never a whole log/file. */
export const MAX_EXPLICIT_MEMORY_CHARS = 8000;

export const MEMORY_KNOWLEDGE_TYPES: readonly MemoryKnowledgeType[] = [
  'project_rule',
  'requirement',
  'constraint',
  'architecture_decision',
  'decision',
  'verified_fact',
  'root_cause',
  'verified_fix',
  'deployment',
  'blocker',
  'handoff',
  'preference',
  'operational_reference',
];

const ACCEPT_REASON: Record<MemoryKnowledgeType, MemoryPolicyReasonCode> = {
  project_rule: 'accepted_project_rule',
  requirement: 'accepted_requirement',
  constraint: 'accepted_constraint',
  architecture_decision: 'accepted_architecture_decision',
  decision: 'accepted_decision',
  verified_fact: 'accepted_verified_fact',
  root_cause: 'accepted_root_cause',
  verified_fix: 'accepted_verified_fix',
  deployment: 'accepted_deployment',
  blocker: 'accepted_blocker',
  handoff: 'accepted_handoff',
  preference: 'accepted_preference',
  operational_reference: 'accepted_operational_reference',
};

const CRITICAL_KINDS = new Set(['rule', 'blocker', 'architecture', 'deploy']);

const CONTINUITY_KINDS = new Set(['fix', 'todo', 'context', 'next_action']);

const SECRET_SCANNER = new SecretScanner();

/**
 * Speculation markers. A conclusion that is hedged ("probably", "maybe",
 * "I think") must not become a verified fact/root cause. This is intentionally
 * lexical and deterministic — no model confidence is involved.
 */
const SPECULATIVE_PATTERNS: readonly RegExp[] = [
  /\bprobably\b/iu,
  /\bperhaps\b/iu,
  /\bmaybe\b/iu,
  /\bpossibly\b/iu,
  /\bsuspected\b/iu,
  /\bmight\s+(?:be|cause|have)\b/iu,
  /\bcould\s+(?:be|cause|have)\b/iu,
  /\blikely\s+(?:caused|due)\b/iu,
  /\bnot\s+sure\b/iu,
  /\bunclear\b/iu,
  /\bsuspect\b/iu,
  /\bi\s+think\b/iu,
  /\bseems?\s+(?:to|like)\b/iu,
];

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

function isVerifiedEvidence(
  evidence: LearnedMemoryCandidate['evidence'],
  explicit: boolean
): boolean {
  if (explicit) {
    return true;
  }

  const value = evidence;

  if (!value) {
    return false;
  }

  return (
    value.userExplicit === true ||
    value.sourceVerified === true ||
    value.testVerified === true ||
    (value.crossSessionConfirmations ?? 0) >= 2
  );
}

export function hasSecretContent(content: string): boolean {
  return SECRET_SCANNER.hasSecrets(content);
}

export function isSpeculativeContent(content: string): boolean {
  return SPECULATIVE_PATTERNS.some((pattern) => pattern.test(content));
}

/**
 * Map an extractor kind to the durable knowledge taxonomy.
 */
export function knowledgeTypeFor(
  candidate: Pick<LearnedMemoryCandidate, 'kind'>
): MemoryKnowledgeType {
  switch (candidate.kind) {
    case 'rule':
      return 'project_rule';
    case 'requirement':
      return 'requirement';
    case 'architecture':
      return 'architecture_decision';
    case 'decision':
      return 'decision';
    case 'root_cause':
      return 'root_cause';
    case 'fix':
      return 'verified_fix';
    case 'blocker':
      return 'blocker';
    case 'deploy':
      return 'deployment';
    case 'handoff':
      return 'handoff';
    case 'context':
    case 'todo':
    case 'next_action':
      return 'operational_reference';
  }
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

  /*
   * A lasting requirement is timeless knowledge: it stays valid even when the
   * current implementation violates it, so it is not superseded by a bug
   * observation. Only an adopted (explicit) requirement becomes permanent.
   */
  if (candidate.kind === 'requirement') {
    return evidence.userExplicit ? 'permanent' : 'session';
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
    candidate.kind === 'decision' ||
    candidate.kind === 'todo' ||
    candidate.kind === 'next_action' ||
    candidate.kind === 'fix' ||
    candidate.kind === 'blocker' ||
    candidate.kind === 'deploy' ||
    candidate.kind === 'handoff' ||
    candidate.kind === 'root_cause';

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

type PolicyCandidate = Pick<
  LearnedMemoryCandidate,
  'kind' | 'importance' | 'confidence' | 'evidence'
> & {
  content?: string;
};

/**
 * The single canonical durable-memory policy decision.
 *
 * candidate
 *   -> deterministic eligibility decision
 *   -> promoted durable Memory (or rejected with a reason code)
 *
 * Every automatic capture path and the explicit memory_save path must pass
 * through this function so there is exactly one authority deciding what ToolNet
 * remembers. It is pure and deterministic: no clock, no randomness, no model.
 */
export function evaluateMemoryPolicy(
  candidate: PolicyCandidate,
  policy: CanonicalPromotionPolicy = loadCanonicalPromotionPolicy(),
  options: MemoryPolicyOptions = {}
): MemoryPolicyEvaluation {
  const knowledgeType = knowledgeTypeFor(candidate);

  const knowledgeClass = classifyMemoryKnowledge(candidate, policy);

  const score = scoreMemoryCandidate(candidate);

  const threshold = promotionThreshold(candidate.kind, policy);

  const base = {
    knowledgeType,
    knowledgeClass,
    score,
    threshold,
    policyVersion: MEMORY_POLICY_VERSION,
  } as const;

  const reject = (reasonCode: MemoryPolicyReasonCode): MemoryPolicyEvaluation => ({
    ...base,
    decision: 'rejected',
    reasonCode,
    scope: 'project',
    persist: false,
  });

  /*
   * Scope safety. Auto-capture is always project scope; a single session can
   * never promote global memory. There is no global store today, so a global
   * request is refused rather than silently downgraded.
   */
  if (options.requestedScope === 'global') {
    return reject('rejected_scope');
  }

  const content = (candidate.content ?? options.content ?? '').normalize('NFKC').trim();

  const maxChars =
    options.maxChars ?? (options.explicit ? MAX_EXPLICIT_MEMORY_CHARS : MAX_AUTO_MEMORY_CHARS);

  if (content.length < 12) {
    return reject('rejected_empty');
  }

  if (content.length > maxChars) {
    return reject('rejected_too_large');
  }

  /*
   * Secrets never become Memory. A redaction marker alone carries no durable
   * knowledge, so a secret-bearing candidate is rejected outright.
   */
  if (hasSecretContent(content)) {
    return reject('rejected_secret');
  } /*
   * Hedged conclusions are never durable, on the automatic or the explicit
   * path. A durable memory is a claim; "probably" is not a claim.
   */
  if (isSpeculativeContent(content)) {
    return reject('rejected_speculative');
  }

  const assertionKinds = new Set(['root_cause']);

  if (
    assertionKinds.has(candidate.kind) &&
    !isVerifiedEvidence(candidate.evidence, !!options.explicit)
  ) {
    return reject('rejected_speculative');
  }

  if (!options.explicit && knowledgeClass === 'transient') {
    return reject('rejected_transient');
  }

  if (!options.explicit && policy.mode === 'off') {
    return reject('rejected_transient');
  }

  if (!options.explicit && score < threshold) {
    return reject('rejected_low_confidence');
  }

  return {
    ...base,
    decision: 'accepted',
    reasonCode: ACCEPT_REASON[knowledgeType],
    scope: 'project',
    persist: true,
  };
}

/*
 * Knowledge-class certification matrix.
 *
 * This is the product-facing summary of the taxonomy: which lifetime class a
 * knowledge type lands in, whether age alone can make it stale, whether the
 * session learner captures it automatically, and whether it needs explicit
 * verification evidence before it may be accepted. It is derived from the same
 * rules the policy executes — it is never hand-maintained.
 */
export interface MemoryKnowledgeClassMatrixEntry {
  knowledgeType: MemoryKnowledgeType;

  knowledgeClass: MemoryKnowledgeClass;

  /** True when age alone never makes this knowledge stale. */
  timeless: boolean;

  /** True when the session learner can auto-capture this knowledge type. */
  autoCapture: boolean;

  /** True when acceptance requires explicit verification evidence. */
  verificationRequired: boolean;
}

const KIND_FOR_KNOWLEDGE_TYPE: Record<MemoryKnowledgeType, LearnedMemoryKind> = {
  project_rule: 'rule',
  requirement: 'requirement',
  constraint: 'rule',
  architecture_decision: 'architecture',
  decision: 'decision',
  verified_fact: 'context',
  root_cause: 'root_cause',
  verified_fix: 'fix',
  deployment: 'deploy',
  blocker: 'blocker',
  handoff: 'handoff',
  preference: 'context',
  operational_reference: 'context',
};

/**
 * Knowledge types that are only aliases of another extractor kind. They are
 * never produced directly by auto-capture, so they are not auto-captured
 * knowledge types — they exist for classification and reporting.
 */
const ALIAS_ONLY_TYPES = new Set<MemoryKnowledgeType>([
  'constraint',
  'preference',
  'verified_fact',
  'operational_reference',
]);

const VERIFICATION_REQUIRED_TYPES = new Set<MemoryKnowledgeType>(['root_cause']);

export function memoryKnowledgeClassMatrix(
  policy: CanonicalPromotionPolicy = loadCanonicalPromotionPolicy()
): MemoryKnowledgeClassMatrixEntry[] {
  return MEMORY_KNOWLEDGE_TYPES.map((knowledgeType) => {
    const kind = KIND_FOR_KNOWLEDGE_TYPE[knowledgeType];

    const knowledgeClass = classifyMemoryKnowledge(
      {
        kind,

        importance: 'high',

        confidence: 0.95,

        evidence: {
          userExplicit: true,

          sourceVerified: false,

          testVerified: false,

          crossSessionConfirmations: 1,

          assistantDerived: false,
        },
      },
      policy
    );

    return {
      knowledgeType,

      knowledgeClass,

      timeless: knowledgeClass === 'permanent',

      autoCapture: !ALIAS_ONLY_TYPES.has(knowledgeType),

      verificationRequired: VERIFICATION_REQUIRED_TYPES.has(knowledgeType),
    };
  });
}

/**
 * Compatible projection of `evaluateMemoryPolicy` used by the existing
 * pipeline/session policy callers.
 */
export function evaluateMemoryPromotion(
  candidate: Pick<LearnedMemoryCandidate, 'kind' | 'importance' | 'confidence'> & {
    content?: string;
    evidence?: LearnedMemoryCandidate['evidence'];
  },
  policy: CanonicalPromotionPolicy = loadCanonicalPromotionPolicy()
): MemoryPromotionEvaluation {
  const evaluation = evaluateMemoryPolicy(candidate, policy);

  return {
    knowledgeClass: evaluation.knowledgeClass,

    score: evaluation.score,

    threshold: evaluation.threshold,

    persist: evaluation.persist,
  };
}
