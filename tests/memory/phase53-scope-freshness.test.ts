import { describe, expect, it } from 'vitest';

import type { MemoryRecord } from '../../src/core/types.js';
import {
  defaultMemoryStaleAfter,
  deriveMemoryFreshness,
  inferMemoryScope,
  normalizeMemoryScopeMetadata,
} from '../../src/memory/scope-freshness.js';

function legacyMemory(overrides: Partial<MemoryRecord> = {}): MemoryRecord {
  return {
    id: 'memory-1',
    projectId: 'project-1',
    type: 'todo',
    content: 'Deploy production after verification.',
    importance: 'normal',
    importanceScore: 50,
    tags: ['todo'],
    source: 'session-memory-learner',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    metadata: {
      learningKind: 'todo',
      confidence: 0.87,
      sourceCreatedAt: '2026-09-01T00:00:00.000Z',
      evidence: {
        userExplicit: true,
        sourceVerified: false,
        testVerified: false,
      },
    },
    ...overrides,
  };
}

describe('Phase 53 memory scope and freshness', () => {
  it('separates semantic scope from lifetime and derives stale time', () => {
    expect(inferMemoryScope('rule', 'rule')).toBe('rule');
    expect(inferMemoryScope('decision', 'decision')).toBe('decision');
    expect(inferMemoryScope('fix', 'code')).toBe('fact');
    expect(inferMemoryScope('todo', 'todo')).toBe('observation');

    expect(defaultMemoryStaleAfter('permanent', '2026-09-01T00:00:00.000Z')).toBeUndefined();
    expect(defaultMemoryStaleAfter('task', '2026-09-01T00:00:00.000Z')).toBe(
      '2026-10-01T00:00:00.000Z'
    );
  });

  it('backfills legacy memories without changing lifecycle state', () => {
    const memory = legacyMemory();
    const changed = normalizeMemoryScopeMetadata(memory);

    expect(changed).toBe(true);
    expect(memory.scope).toBe('observation');
    expect(memory.observedAt).toBe('2026-09-01T00:00:00.000Z');
    expect(memory.verifiedAt).toBe('2026-09-01T00:00:00.000Z');
    expect(memory.confidence).toBe(0.87);
    expect(memory.staleAfter).toBe('2026-10-01T00:00:00.000Z');
    expect(memory.metadata?.freshnessSchema).toBe(1);
    expect(memory.metadata?.lifecycleState).toBeUndefined();
  });

  it('marks freshness as derived state and never mutates the memory', () => {
    const memory = legacyMemory({
      scope: 'observation',
      observedAt: '2026-09-01T00:00:00.000Z',
      verifiedAt: '2026-09-01T00:00:00.000Z',
      confidence: 0.87,
      staleAfter: '2026-09-02T00:00:00.000Z',
    });
    const before = JSON.stringify(memory);

    expect(deriveMemoryFreshness(memory, Date.parse('2026-09-03T00:00:00.000Z'))).toBe('stale');
    expect(JSON.stringify(memory)).toBe(before);
  });

  it('requires verification for weak or unverified observations', () => {
    expect(
      deriveMemoryFreshness(
        legacyMemory({
          confidence: 0.55,
          staleAfter: '2026-12-01T00:00:00.000Z',
        }),
        Date.parse('2026-09-03T00:00:00.000Z')
      )
    ).toBe('needs_verification');
  });
});
