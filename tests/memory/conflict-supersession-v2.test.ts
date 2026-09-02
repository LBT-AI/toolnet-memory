import { describe, expect, it } from 'vitest';

import { MemoryEngine } from '../../src/core/memory-engine.js';

import { memoryAuthorityScore } from '../../src/memory/conflict-detector.js';

function explicitUserEvidence() {
  return {
    userExplicit: true,

    sourceVerified: false,

    testVerified: false,

    crossSessionConfirmations: 1,

    assistantDerived: false,
  };
}

function weakAssistantEvidence() {
  return {
    userExplicit: false,

    sourceVerified: false,

    testVerified: false,

    crossSessionConfirmations: 1,

    assistantDerived: true,
  };
}

function verifiedEvidence() {
  return {
    userExplicit: false,

    sourceVerified: true,

    testVerified: false,

    crossSessionConfirmations: 1,

    assistantDerived: false,
  };
}

describe('Conflict / Supersession V2', () => {
  it('does not allow weak assistant memory to supersede explicit user rule', () => {
    const engine = new MemoryEngine();

    const strong = engine.remember({
      projectId: 'phase3',

      type: 'rule',

      content: 'Use PostgreSQL as the database.',

      importance: 'critical',

      metadata: {
        topic: 'database',

        confidence: 0.98,

        evidence: explicitUserEvidence(),

        knowledgeClass: 'permanent',
      },
    });

    const weak = engine.remember({
      projectId: 'phase3',

      type: 'rule',

      content: 'Use MySQL as the database.',

      importance: 'high',

      metadata: {
        topic: 'database',

        confidence: 0.82,

        evidence: weakAssistantEvidence(),

        knowledgeClass: 'session',
      },
    });

    expect(strong.metadata?.supersededBy).toBeUndefined();

    expect(weak.metadata?.supersedes).toBeUndefined();

    expect(weak.metadata?.conflictsWith).toContain(strong.id);
  });

  it('allows newer explicit user rule to supersede older explicit user rule', () => {
    const engine = new MemoryEngine();

    const old = engine.remember({
      projectId: 'phase3',

      type: 'rule',

      content: 'Use MySQL as the project database.',

      importance: 'critical',

      metadata: {
        topic: 'database',

        confidence: 0.98,

        evidence: explicitUserEvidence(),

        knowledgeClass: 'permanent',
      },
    });

    const next = engine.remember({
      projectId: 'phase3',

      type: 'rule',

      content: 'Use PostgreSQL as the project database.',

      importance: 'critical',

      metadata: {
        topic: 'database',

        confidence: 0.98,

        evidence: explicitUserEvidence(),

        knowledgeClass: 'permanent',
      },
    });

    expect(old.metadata?.supersededBy).toBe(next.id);

    expect(next.metadata?.supersedes).toContain(old.id);
  });

  it('keeps equal-strength verified decisions as unresolved conflict', () => {
    const engine = new MemoryEngine();

    const first = engine.remember({
      projectId: 'phase3',

      type: 'decision',

      content: 'Use Redis for the cache layer.',

      importance: 'high',

      metadata: {
        topic: 'cache',

        confidence: 0.9,

        evidence: verifiedEvidence(),
      },
    });

    const second = engine.remember({
      projectId: 'phase3',

      type: 'decision',

      content: 'Use Memcached for the cache layer.',

      importance: 'high',

      metadata: {
        topic: 'cache',

        confidence: 0.9,

        evidence: verifiedEvidence(),
      },
    });

    expect(first.metadata?.lifecycleState).toBe('superseded');

    expect(second.metadata?.supersedes).toContain(first.id);
  });

  it('scores explicit user evidence above weak assistant inference', () => {
    const engine = new MemoryEngine();

    const explicit = engine.remember({
      projectId: 'phase3-score',

      type: 'rule',

      content: 'Never edit production directly.',

      importance: 'critical',

      metadata: {
        confidence: 0.98,

        evidence: explicitUserEvidence(),

        knowledgeClass: 'permanent',
      },
    });

    const weak = engine.remember({
      projectId: 'phase3-score-other',

      type: 'rule',

      content: 'Maybe editing production is acceptable.',

      importance: 'high',

      metadata: {
        confidence: 0.82,

        evidence: weakAssistantEvidence(),
      },
    });

    expect(memoryAuthorityScore(explicit)).toBeGreaterThan(memoryAuthorityScore(weak));
  });
});
