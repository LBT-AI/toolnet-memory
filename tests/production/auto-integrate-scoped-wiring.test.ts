import { readFileSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

describe('integrate:auto scoped production wiring', () => {
  test('auto-integrate uses shared conservative scope policy', () => {
    const source = readFileSync('src/production/auto-integrate.ts', 'utf8');

    expect(source).toContain('resolveAutoIntegrationScope');
    expect(source).toContain('scope: cursorOptions.scope ?? scopedPolicy.scope');
    expect(source).toContain('scope: copilotOptions.scope ?? scopedPolicy.scope');
    expect(source).toContain('scope: grokOptions.scope ?? scopedPolicy.scope');
  });

  test('toolnet init passes the initialized project root to auto integration', () => {
    const source = readFileSync('src/production/init.ts', 'utf8');

    expect(source).toContain('projectRoot: result.project.rootPath');
  });

  test('auto CLI accepts explicit scope and project target', () => {
    const source = readFileSync('src/production/auto-integrate.ts', 'utf8');

    expect(source).toContain('explicitIntegrationScope');
    expect(source).toContain("valueAfter(args, '--project')");
  });

  test('help documents scoped auto integration', () => {
    const source = readFileSync('packages/cli/help.ts', 'utf8');

    expect(source).toContain('toolnet-memory integrate:auto [--all] [--scope global|project|both]');
  });
});
