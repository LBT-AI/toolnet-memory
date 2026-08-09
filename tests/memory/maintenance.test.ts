import { describe, expect, it } from 'vitest';

import { MemoryEngine } from '../../src/core/memory-engine.js';

import { effectiveImportanceScore } from '../../src/memory/decay.js';

describe('Memory Maintenance', () => {
  it('expires temporary memory', () => {
    const memory = new MemoryEngine();

    memory.remember({
      projectId: 'test',

      type: 'activity',

      content: 'old temporary event',

      expiresAt: '2020-01-01T00:00:00.000Z',
    });

    expect(memory.list('test').length).toBe(0);

    expect(memory.pruneExpired('test')).toBe(1);
  });

  it('decays old memory score', () => {
    const memory = new MemoryEngine();

    const item = memory.remember({
      projectId: 'test',

      type: 'activity',

      content: 'old activity',
    });

    const old = {
      ...item,
      updatedAt: '2020-01-01T00:00:00.000Z',
    };

    expect(effectiveImportanceScore(old)).toBeLessThan(effectiveImportanceScore(item));
  });

  it('supersedes older decision on same topic', () => {
    const memory = new MemoryEngine();

    const first = memory.remember({
      projectId: 'test',

      type: 'decision',

      content: 'Use GitHub for remote storage',

      tags: ['storage'],
    });

    const second = memory.remember({
      projectId: 'test',

      type: 'decision',

      content: 'Use Hugging Face for remote storage',

      tags: ['storage'],
    });

    expect(memory.listAll('test').length).toBe(2);

    expect(memory.list('test').length).toBe(1);

    expect(memory.list('test')[0].id).toBe(second.id);

    expect(memory.get(first.id)?.metadata?.supersededBy).toBe(second.id);
  });
});
