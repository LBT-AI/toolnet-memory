import { readFileSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

describe('Copilot dual-scope production wiring', () => {
  test('Copilot hook claims additive native events through shared dedupe', () => {
    const source = readFileSync('src/session/copilot/hook.ts', 'utf8');

    expect(source).toContain('claimHookEvent');
    expect(source).toContain("agent: 'copilot'");
    expect(source).toContain('claim.duplicate');
    expect(source).toContain('TOOLNET_HOOK_DEDUPE_DIR');
  });

  test('Copilot CLI exposes scoped installation', () => {
    const source = readFileSync('src/session/copilot/cli.ts', 'utf8');

    expect(source).toContain('parseIntegrationScope');
    expect(source).toContain('resolveIntegrationProjectRoot');
    expect(source).toContain('inspectCopilotScopedIntegrationStatus');
  });

  test('help exposes Copilot global/project/both contract', () => {
    const source = readFileSync('packages/cli/help.ts', 'utf8');

    expect(source).toContain('toolnet-memory integrate:copilot [--scope global|project|both]');
  });

  test('project instruction uses a dedicated file rather than overwriting repo-wide instruction', () => {
    const source = readFileSync('src/session/copilot/config-paths.ts', 'utf8');

    expect(source).toContain('toolnet-memory.instructions.md');
    expect(source).not.toContain(
      "join(copilotProjectGithubDirectory(projectRoot), 'copilot-instructions.md')"
    );
  });
});
