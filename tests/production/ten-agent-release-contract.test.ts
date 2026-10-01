import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { certifyCrossAgentContinuity } from '../../src/production/continuity-certify.js';

import { PRODUCTION_PACK_REQUIRED_FILES } from '../../src/production/production-certify.js';

describe('15-agent release contract', () => {
  it('certifies the complete 15-agent continuity ring', async () => {
    const result = await certifyCrossAgentContinuity();

    expect(result.passed).toBe(true);
    expect(result.total).toBe(15);
    expect(result.passedCount).toBe(15);

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
  });

  it('requires production integration bundles in npm package', () => {
    expect(PRODUCTION_PACK_REQUIRED_FILES).toEqual(
      expect.arrayContaining([
        'bundle/kiro.js',
        'bundle/kiro-hook.js',
        'bundle/cursor.js',
        'bundle/cursor-hook.js',
        'bundle/copilot.js',
        'bundle/copilot-hook.js',
        'bundle/grok.js',
        'bundle/grok-hook.js',
        'bundle/toolnet-cli.js',
      ])
    );
  });

  it('keeps production routes for all 15 integration entrypoints', () => {
    const source = readFileSync('bin/toolnet-memory', 'utf8');

    for (const route of [
      'integrate:agy)',
      'integrate:opencode)',
      'integrate:codex)',
      'integrate:claude)',
      'integrate:kiro)',
      'integrate:cursor)',
      'integrate:copilot)',
      'integrate:grok)',
      'integrate:toolnet-cli)',
      'integrate:kilo)',
      'integrate:goose)',
      'integrate:qwen)',
      'integrate:kimi)',
      'integrate:hermes)',
      'integrate:qoder)',
    ]) {
      expect(source).toContain(route);
    }
  });

  it('keeps hook routes for lifecycle-enabled integrations', () => {
    const source = readFileSync('bin/toolnet-memory', 'utf8');

    for (const route of [
      'session:kiro-hook)',
      'session:cursor-hook)',
      'session:copilot-hook)',
      'session:grok-hook)',
      'session:goose-hook)',
      'session:qwen-hook)',
      'session:kimi-hook)',
      'session:hermes-hook)',
      'session:qoder-hook)',
    ]) {
      expect(source).toContain(route);
    }
  });

  it('documents all 15 integrations in CLI help metadata', () => {
    const source = readFileSync('packages/cli/help.ts', 'utf8');

    for (const command of [
      "name: 'integrate:agy'",
      "name: 'integrate:opencode'",
      "name: 'integrate:codex'",
      "name: 'integrate:claude'",
      "name: 'integrate:kiro'",
      "name: 'integrate:cursor'",
      "name: 'integrate:copilot'",
      "name: 'integrate:grok'",
      "name: 'integrate:toolnet-cli'",
      "name: 'integrate:kilo'",
      "name: 'integrate:goose'",
      "name: 'integrate:qwen'",
      "name: 'integrate:kimi'",
      "name: 'integrate:hermes'",
      "name: 'integrate:qoder'",
    ]) {
      expect(source).toContain(command);
    }
  });
});
