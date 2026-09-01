import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { certifyCrossAgentContinuity } from '../../src/production/continuity-certify.js';

import { PRODUCTION_PACK_REQUIRED_FILES } from '../../src/production/production-certify.js';

describe('10-agent release contract', () => {
  it('certifies the complete 10-agent continuity ring', async () => {
    const result = await certifyCrossAgentContinuity();

    expect(result.passed).toBe(true);
    expect(result.total).toBe(10);
    expect(result.passedCount).toBe(10);

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
      ['kilo', 'agy'],
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

  it('keeps production routes for all 10 integration entrypoints', () => {
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
    ]) {
      expect(source).toContain(route);
    }
  });

  it('documents all 10 integrations in CLI help metadata', () => {
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
    ]) {
      expect(source).toContain(command);
    }
  });
});
