import { readFileSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

describe('Grok Build dual-scope production wiring', () => {
  test('Grok hook claims layered native events through shared dedupe', () => {
    const source = readFileSync('src/session/grok/hook.ts', 'utf8');

    expect(source).toContain('claimHookEvent');
    expect(source).toContain("agent: 'grok'");
    expect(source).toContain('claim.duplicate');
    expect(source).toContain('TOOLNET_HOOK_DEDUPE_DIR');
  });

  test('Grok CLI exposes scoped installation', () => {
    const source = readFileSync('src/session/grok/cli.ts', 'utf8');

    expect(source).toContain('parseIntegrationScope');
    expect(source).toContain('resolveIntegrationProjectRoot');
    expect(source).toContain('inspectGrokScopedIntegrationStatus');
  });

  test('Grok project paths use native .grok config/hooks/skills layout', () => {
    const source = readFileSync('src/session/grok/config-paths.ts', 'utf8');

    expect(source).toContain("join(resolve(projectRoot), '.grok')");
    expect(source).toContain("'config.toml'");
    expect(source).toContain("'hooks'");
    expect(source).toContain("'skills'");
    expect(source).toContain("'toolnet-continuity'");
  });

  test('help exposes Grok global/project/both contract', () => {
    const source = readFileSync('packages/cli/help.ts', 'utf8');

    expect(source).toContain('toolnet-memory integrate:grok [--scope global|project|both]');
  });

  test('passive lifecycle hooks do not attempt context injection', () => {
    const source = readFileSync('src/session/grok/hook.ts', 'utf8');

    expect(source).not.toContain('additionalContext');
    expect(source).not.toContain('additional_context');
    expect(source).not.toContain('modifiedTransformedPrompt');
  });
});
