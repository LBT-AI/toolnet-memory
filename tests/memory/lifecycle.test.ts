import { describe, expect, it } from 'vitest';

import { MemoryEngine } from '../../src/core/memory-engine.js';
import { assessMemoryQuality } from '../../src/memory/lifecycle.js';
import { MemoryMaintenance } from '../../src/memory/maintenance.js';

const NOW = Date.parse('2026-08-13T00:00:00.000Z');

describe('Memory Lifecycle & Quality', () => {
  it('protects permanent rules even when old', () => {
    const memory = new MemoryEngine();

    const rule = memory.remember({
      projectId: 'm5',
      type: 'rule',
      content: 'Never commit API keys to the repository.',
      importance: 'critical',
      tags: ['class:permanent'],
    });

    rule.updatedAt = '2020-01-01T00:00:00.000Z';

    const assessment = assessMemoryQuality(rule, NOW);

    expect(assessment.protected).toBe(true);
    expect(assessment.pruneEligible).toBe(false);

    memory.reviewLifecycle('m5', NOW);

    expect(memory.get(rule.id)).toBeDefined();
  });

  it('prunes obvious transient noise safely', () => {
    const memory = new MemoryEngine();

    const noisy = memory.remember({
      projectId: 'm5',
      type: 'summary',
      content: 'done',
      importance: 'temporary',
      tags: ['class:transient'],
      expiresAt: '2030-01-01T00:00:00.000Z',
    });

    const result = memory.reviewLifecycle('m5', NOW);

    expect(result.pruned).toBe(1);
    expect(memory.get(noisy.id)).toBeUndefined();
  });

  it('keeps useful current task memory', () => {
    const memory = new MemoryEngine();

    const task = memory.remember({
      projectId: 'm5',
      type: 'todo',
      content: 'Run the full test suite before publishing the next release.',
      importance: 'high',
      tags: ['class:task'],
    });

    const assessment = assessMemoryQuality(task, NOW);

    expect(assessment.score).toBeGreaterThanOrEqual(55);
    expect(assessment.pruneEligible).toBe(false);
  });

  it('removes stale weak session memory', () => {
    const memory = new MemoryEngine();

    const item = memory.remember({
      projectId: 'm5',
      type: 'summary',
      content: 'Old temporary implementation context.',
      importance: 'temporary',
      tags: ['class:session'],
      expiresAt: '2030-01-01T00:00:00.000Z',
    });

    item.updatedAt = '2025-01-01T00:00:00.000Z';

    const assessment = assessMemoryQuality(item, NOW);

    expect(assessment.stale).toBe(true);
    expect(assessment.pruneEligible).toBe(true);

    const result = memory.reviewLifecycle('m5', NOW);

    expect(result.pruned).toBe(1);
  });

  it('records lifecycle quality metadata', () => {
    const memory = new MemoryEngine();

    const item = memory.remember({
      projectId: 'm5',
      type: 'decision',
      content: 'Use Hugging Face S3 for persistent storage.',
      importance: 'high',
    });

    memory.reviewLifecycle('m5', NOW);

    const lifecycle = memory.get(item.id)?.metadata?.lifecycle as
      Record<string, unknown> | undefined;

    expect(lifecycle?.version).toBe(1);
    expect(typeof lifecycle?.qualityScore).toBe('number');
    expect(lifecycle?.protected).toBe(true);
  });

  it('reports lifecycle metrics through maintenance', () => {
    const memory = new MemoryEngine();

    memory.remember({
      projectId: 'm5',
      type: 'rule',
      content: 'All production changes must pass tests before release.',
      importance: 'critical',
      tags: ['class:permanent'],
    });

    memory.remember({
      projectId: 'm5',
      type: 'summary',
      content: 'ok',
      importance: 'temporary',
      tags: ['class:transient'],
      expiresAt: '2030-01-01T00:00:00.000Z',
    });

    const maintenance = new MemoryMaintenance(memory);
    const result = maintenance.run('m5');

    expect(result.lifecycleReviewed).toBeGreaterThan(0);
    expect(result.lifecyclePruned).toBe(1);
    expect(result.quality.protected).toBeGreaterThan(0);
    expect(result.active).toBe(1);
  });
});
