import { readFileSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

describe('Phase 07 final release contract', () => {
  test('keeps native CLI E2E optional and non-blocking', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts?: Record<string, string>;
    };

    expect(pkg.scripts?.['release:certify:native']).toBeUndefined();
    expect(pkg.scripts?.['release:certify:native:optional']).toBe(
      'bash scripts/native-e2e-certify.sh'
    );
  });

  test('has one final Phase 07 certification command', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts?: Record<string, string>;
    };

    const command = pkg.scripts?.['release:certify:phase07'] ?? '';

    expect(command).toContain('production:auto-scope:test');
    expect(command).toContain('session:scoped-status:test');
    expect(command).toContain('session:grok-dual-scope:test');
    expect(command).toContain('session:copilot-dual-scope:test');
    expect(command).toContain('session:cursor-dual-scope:test');
    expect(command).toContain('session:integration-scope:test');
    expect(command).toContain('release:certify:10');
    expect(command).toContain('typecheck');
    expect(command).toContain('lint');
    expect(command).toContain('format:check');
  });

  test('keeps all three production CLI routes and unified status route', () => {
    const source = readFileSync('bin/toolnet-memory', 'utf8');

    for (const route of [
      'integrate:cursor)',
      'integrate:copilot)',
      'integrate:grok)',
      'integrate:status)',
    ]) {
      expect(source).toContain(route);
    }
  });

  test('keeps all three project/work surfaces', () => {
    expect(readFileSync('src/session/cursor/config-paths.ts', 'utf8')).toContain(
      'toolnet-memory.mdc'
    );

    expect(readFileSync('src/session/copilot/config-paths.ts', 'utf8')).toContain(
      'toolnet-memory.instructions.md'
    );

    expect(readFileSync('src/session/grok/config-paths.ts', 'utf8')).toContain(
      'toolnet-continuity'
    );
  });

  test('keeps cross-process hook dedupe in all three native hook runtimes', () => {
    for (const file of [
      'src/session/cursor/hook.ts',
      'src/session/copilot/hook.ts',
      'src/session/grok/hook.ts',
    ]) {
      const source = readFileSync(file, 'utf8');

      expect(source).toContain('claimHookEvent');
      expect(source).toContain('TOOLNET_HOOK_DEDUPE_DIR');
    }
  });
});
