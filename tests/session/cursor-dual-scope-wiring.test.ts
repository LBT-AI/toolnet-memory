import { readFileSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

describe('Cursor dual-scope production wiring', () => {
  test('Cursor hook claims native events through shared cross-process dedupe', () => {
    const source = readFileSync('src/session/cursor/hook.ts', 'utf8');

    expect(source).toContain('claimHookEvent');
    expect(source).toContain("agent: 'cursor'");
    expect(source).toContain('claim.duplicate');
    expect(source).toContain('TOOLNET_HOOK_DEDUPE_DIR');
  });

  test('Cursor CLI exposes scoped installation', () => {
    const source = readFileSync('src/session/cursor/cli.ts', 'utf8');

    expect(source).toContain('parseIntegrationScope');
    expect(source).toContain('resolveIntegrationProjectRoot');
    expect(source).toContain('inspectCursorScopedIntegrationStatus');
  });

  test('help exposes global/project/both contract', () => {
    const source = readFileSync('packages/cli/help.ts', 'utf8');

    expect(source).toContain('toolnet-memory integrate:cursor [--scope global|project|both]');
  });
});
