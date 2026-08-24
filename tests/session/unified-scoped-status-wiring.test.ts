import { readFileSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

describe('unified scoped status production wiring', () => {
  test('production bundle contains integration-status entry', () => {
    const source = readFileSync('scripts/build-bundle.mjs', 'utf8');

    expect(source).toContain("'integration-status': 'src/session/new-agents/scoped-status-cli.ts'");
  });

  test('bin exposes integrate:status', () => {
    const source = readFileSync('bin/toolnet-memory', 'utf8');

    expect(source).toContain('integrate:status)');
    expect(source).toContain('bundle/integration-status.js');
  });

  test('help exposes scoped status command and agent filter', () => {
    const source = readFileSync('packages/cli/help.ts', 'utf8');

    expect(source).toContain("name: 'integrate:status'");
    expect(source).toContain('--agent cursor|copilot|grok');
  });

  test('unified status consumes the three agent-specific scoped inspectors', () => {
    const source = readFileSync('src/session/new-agents/scoped-status.ts', 'utf8');

    expect(source).toContain('inspectCursorScopedIntegrationStatus');
    expect(source).toContain('inspectCopilotScopedIntegrationStatus');
    expect(source).toContain('inspectGrokScopedIntegrationStatus');
  });
});
