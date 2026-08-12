import { describe, expect, it } from 'vitest';

import { MemoryEngine } from '../../src/core/memory-engine.js';

import { MemoryMaintenance } from '../../src/memory/maintenance.js';

describe('Memory Consolidation', () => {
  it('collapses normalized duplicate durable memories', () => {
    const memory = new MemoryEngine();

    memory.remember({
      projectId: 'm4',

      type: 'summary',

      content: 'Current task: Build intelligent retrieval.',

      importance: 'normal',

      tags: ['class:session', 'from:agy'],

      source: 'agy',
    });

    const strongest = memory.remember({
      projectId: 'm4',

      type: 'summary',

      content: '  current task:   build intelligent retrieval  ',

      importance: 'high',

      tags: ['class:task', 'from:codex'],

      source: 'codex',
    });

    expect(memory.list('m4')).toHaveLength(2);

    const result = memory.consolidate('m4', Date.parse('2026-08-13T00:00:00.000Z'));

    expect(result.groupsConsolidated).toBe(1);

    expect(result.duplicatesRemoved).toBe(1);

    expect(memory.list('m4')).toHaveLength(1);

    const canonical = memory.list('m4')[0];

    expect(canonical?.id).toBe(strongest.id);

    expect(canonical?.tags).toContain('class:task');

    expect(canonical?.tags).toContain('class:session');

    expect(canonical?.metadata?.consolidation).toMatchObject({
      version: 1,

      sources: ['codex', 'agy'],
    });
  });

  it('never collapses activity history', () => {
    const memory = new MemoryEngine();

    memory.remember({
      projectId: 'm4',

      type: 'activity',

      content: 'npm test passed',
    });

    memory.remember({
      projectId: 'm4',

      type: 'activity',

      content: 'npm test passed',
    });

    const result = memory.consolidate('m4');

    expect(result.duplicatesRemoved).toBe(0);

    expect(memory.list('m4')).toHaveLength(2);
  });

  it('does not merge equal text across different memory types', () => {
    const memory = new MemoryEngine();

    memory.remember({
      projectId: 'm4',

      type: 'summary',

      content: 'Run full tests',
    });

    memory.remember({
      projectId: 'm4',

      type: 'todo',

      content: 'Run full tests',
    });

    const result = memory.consolidate('m4');

    expect(result.duplicatesRemoved).toBe(0);

    expect(memory.list('m4')).toHaveLength(2);
  });

  it('runs consolidation inside maintenance', () => {
    const memory = new MemoryEngine();

    memory.remember({
      projectId: 'm4',

      type: 'summary',

      content: 'M3 complete',

      importance: 'normal',
    });

    memory.remember({
      projectId: 'm4',

      type: 'summary',

      content: 'm3 complete.',

      importance: 'high',
    });

    memory.remember({
      projectId: 'm4',

      type: 'activity',

      content: 'expired temporary event',

      expiresAt: '2020-01-01T00:00:00.000Z',
    });

    const maintenance = new MemoryMaintenance(memory);

    const result = maintenance.run('m4');

    expect(result.expiredRemoved).toBe(1);

    expect(result.groupsConsolidated).toBe(1);

    expect(result.duplicatesRemoved).toBe(1);

    expect(result.active).toBe(1);
  });
});
