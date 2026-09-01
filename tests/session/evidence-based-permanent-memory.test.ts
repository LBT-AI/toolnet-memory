import { describe, expect, it } from 'vitest';

import {
  classifyMemoryKnowledge,
  evaluateMemoryPromotion,
  type CanonicalPromotionPolicy,
} from '../../src/memory/promotion-policy.js';

import type { LearnedMemoryCandidate, LearnedMemoryKind } from '../../src/session/learner/types.js';

const policy: CanonicalPromotionPolicy = {
  mode: 'conservative',

  minScore: 0.65,

  minConfidence: 0.78,
};

function candidate(
  kind: LearnedMemoryKind,
  evidence: LearnedMemoryCandidate['evidence']
): LearnedMemoryCandidate {
  return {
    version: 1,

    fingerprint: `phase2-${kind}`,

    projectId: 'phase2-project',

    agent: 'codex',

    nativeSessionId: 'phase2-thread',

    sessionKey: 'codex:phase2-thread',

    kind,

    type:
      kind === 'rule'
        ? 'rule'
        : kind === 'todo'
          ? 'todo'
          : kind === 'fix' || kind === 'context'
            ? 'code'
            : 'decision',

    content: `Phase 2 ${kind} evidence contract`,

    confidence: 0.95,

    importance: kind === 'rule' ? 'critical' : 'high',

    evidence,

    tags: [],

    provenance: {
      agent: 'codex',

      nativeSessionId: 'phase2-thread',

      sessionKey: 'codex:phase2-thread',

      eventIds: ['event-1'],

      sourceEventIds: [],

      sourcePaths: [],

      firstSequence: 1,

      lastSequence: 1,
    },

    createdAt: new Date(0).toISOString(),
  };
}

const emptyEvidence = {
  userExplicit: false,

  sourceVerified: false,

  testVerified: false,

  crossSessionConfirmations: 1,

  assistantDerived: true,
};

describe('Evidence-based permanent memory', () => {
  it('keeps explicit user rules permanent', () => {
    const item = candidate('rule', {
      ...emptyEvidence,

      userExplicit: true,

      assistantDerived: false,
    });

    expect(classifyMemoryKnowledge(item, policy)).toBe('permanent');
  });

  it('does not make assistant-only rules permanent', () => {
    const item = candidate('rule', emptyEvidence);

    expect(classifyMemoryKnowledge(item, policy)).toBe('session');
  });

  it('does not make assistant-only architecture permanent', () => {
    const item = candidate('architecture', emptyEvidence);

    expect(classifyMemoryKnowledge(item, policy)).toBe('session');
  });

  it('allows source-verified architecture to become permanent', () => {
    const item = candidate('architecture', {
      ...emptyEvidence,

      sourceVerified: true,
    });

    expect(classifyMemoryKnowledge(item, policy)).toBe('permanent');
  });

  it('allows cross-session confirmation to become permanent', () => {
    const item = candidate('architecture', {
      ...emptyEvidence,

      crossSessionConfirmations: 2,
    });

    expect(classifyMemoryKnowledge(item, policy)).toBe('permanent');
  });

  it('keeps decisions task-scoped', () => {
    const item = candidate('decision', {
      ...emptyEvidence,

      userExplicit: true,

      assistantDerived: false,
    });

    expect(classifyMemoryKnowledge(item, policy)).toBe('task');

    expect(evaluateMemoryPromotion(item, policy).persist).toBe(true);
  });
});
