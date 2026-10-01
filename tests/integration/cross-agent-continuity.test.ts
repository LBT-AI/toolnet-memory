import { describe, expect, test } from 'vitest';

import { certifyCrossAgentContinuity } from '../../src/production/continuity-certify.js';

describe('X1 cross-agent continuity E2E', () => {
  test('recovers canonical work across the 15-agent continuity ring', async () => {
    const result = await certifyCrossAgentContinuity();

    expect(result.total).toBe(15);

    expect(result.passedCount).toBe(15);

    expect(result.passed).toBe(true);

    expect(result.cases.map((item) => [item.from, item.to])).toEqual([
      ['agy', 'codex'],

      ['codex', 'opencode'],

      ['opencode', 'claude'],

      ['claude', 'kiro'],

      ['kiro', 'cursor'],

      ['cursor', 'copilot'],

      ['copilot', 'grok'],

      ['grok', 'toolnet-cli'],

      ['toolnet-cli', 'kilo'],

      ['kilo', 'goose'],

      ['goose', 'qwen'],

      ['qwen', 'kimi'],

      ['kimi', 'hermes'],

      ['hermes', 'qoder'],

      ['qoder', 'agy'],
    ]);

    for (const item of result.cases) {
      expect(item.passed).toBe(true);

      expect(Object.values(item.checks).every(Boolean)).toBe(true);
    }
  });
});
