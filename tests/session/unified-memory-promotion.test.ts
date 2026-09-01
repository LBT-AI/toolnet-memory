import { describe, expect, it } from 'vitest';

import {
  classifyMemoryKnowledge,
  evaluateMemoryPromotion,
  promotionThreshold,
  shouldPromoteScore,
  type CanonicalPromotionPolicy,
} from '../../src/memory/promotion-policy.js';

import {
  shouldPromoteDurableFact,
  type SessionMemoryPolicy,
} from '../../src/session/session-memory-policy.js';

import type { LearnedMemoryCandidate, LearnedMemoryKind } from '../../src/session/learner/types.js';

const conservative: CanonicalPromotionPolicy = {
  mode: 'conservative',

  minScore: 0.65,

  minConfidence: 0.78,
};

function candidate(
  kind: LearnedMemoryKind,
  confidence: number,
  importance: LearnedMemoryCandidate['importance'],
  evidence?: LearnedMemoryCandidate['evidence']
): LearnedMemoryCandidate {
  return {
    version: 1,

    fingerprint: `fp-${kind}-${confidence}`,

    projectId: 'phase1-project',

    agent: 'codex',

    nativeSessionId: 'thread-phase1',

    sessionKey: 'codex:thread-phase1',

    kind,

    type:
      kind === 'rule'
        ? 'rule'
        : kind === 'todo'
          ? 'todo'
          : kind === 'fix' || kind === 'context'
            ? 'code'
            : 'decision',

    content: `Phase 1 ${kind} candidate with useful project context`,

    confidence,

    importance,

    evidence,

    tags: [],

    provenance: {
      agent: 'codex',

      nativeSessionId: 'thread-phase1',

      sessionKey: 'codex:thread-phase1',

      eventIds: ['event-1'],

      sourceEventIds: [],

      sourcePaths: [],

      firstSequence: 1,

      lastSequence: 1,
    },

    createdAt: new Date(0).toISOString(),
  };
}

const explicitUserEvidence = {
  userExplicit: true,

  sourceVerified: false,

  testVerified: false,

  crossSessionConfirmations: 1,

  assistantDerived: false,
};

describe('Unified memory promotion policy', () => {
  it('classifies stable project knowledge deterministically', () => {
    expect(
      classifyMemoryKnowledge(candidate('rule', 0.95, 'high', explicitUserEvidence), conservative)
    ).toBe('permanent');

    expect(
      classifyMemoryKnowledge(
        candidate('architecture', 0.9, 'high', explicitUserEvidence),
        conservative
      )
    ).toBe('permanent');

    expect(classifyMemoryKnowledge(candidate('decision', 0.9, 'high'), conservative)).toBe('task');

    expect(classifyMemoryKnowledge(candidate('todo', 0.9, 'normal'), conservative)).toBe('task');

    expect(classifyMemoryKnowledge(candidate('context', 0.9, 'normal'), conservative)).toBe(
      'session'
    );
  });

  it('rejects temporary or low-confidence candidates', () => {
    expect(classifyMemoryKnowledge(candidate('decision', 0.95, 'temporary'), conservative)).toBe(
      'transient'
    );

    expect(classifyMemoryKnowledge(candidate('rule', 0.5, 'critical'), conservative)).toBe(
      'transient'
    );

    expect(evaluateMemoryPromotion(candidate('rule', 0.5, 'critical'), conservative).persist).toBe(
      false
    );
  });

  it('uses one threshold algorithm for legacy and V2 promotion', () => {
    const score = 0.65;

    const sessionPolicy: SessionMemoryPolicy = {
      sessionSave: 'summary',

      rawTranscript: false,

      memoryPromotion: 'conservative',

      promoteMinScore: 0.65,

      sessionSummaryMaxTokens: 700,

      durableMemoryMaxItemsPerSession: 10,

      archiveLocal: false,

      archiveRemote: false,
    };

    expect(shouldPromoteScore(score, 'decision', conservative)).toBe(
      shouldPromoteDurableFact(score, 'decision', sessionPolicy)
    );
  });

  it('keeps critical categories deterministic', () => {
    expect(promotionThreshold('rule', conservative)).toBeLessThan(
      promotionThreshold('decision', conservative)
    );
  });

  it('promotion off always refuses durable persistence', () => {
    const disabled: CanonicalPromotionPolicy = {
      ...conservative,

      mode: 'off',
    };

    expect(shouldPromoteScore(1, 'rule', disabled)).toBe(false);

    expect(evaluateMemoryPromotion(candidate('rule', 1, 'critical'), disabled).persist).toBe(false);
  });
});
