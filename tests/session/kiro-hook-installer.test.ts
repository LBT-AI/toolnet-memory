import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { installKiroHooks } from '../../src/session/kiro/hook-installer.js';

describe('Kiro global hook installer', () => {
  const roots: string[] = [];

  function tempHooksFile(): string {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-kiro-hooks-'));

    roots.push(root);

    return join(root, '.kiro', 'hooks', 'toolnet-memory.json');
  }

  afterEach(() => {
    for (const root of roots.splice(0)) {
      rmSync(root, {
        recursive: true,

        force: true,
      });
    }
  });

  it('creates current Kiro v3 standalone global hooks', () => {
    const hooksFile = tempHooksFile();

    const result = installKiroHooks({
      hooksFile,

      binary: '/usr/local/bin/toolnet-memory',
    });

    const parsed = JSON.parse(readFileSync(hooksFile, 'utf8'));

    expect(result.changed).toBe(true);

    expect(result.hookCount).toBe(5);

    expect(parsed.version).toBe('v1');

    expect(parsed.hooks.map((hook: { trigger: string }) => hook.trigger)).toEqual([
      'SessionStart',

      'UserPromptSubmit',

      'PreToolUse',

      'PostToolUse',

      'Stop',
    ]);

    expect(parsed.hooks[2].matcher).toBe('*');

    expect(parsed.hooks[3].matcher).toBe('*');

    for (const hook of parsed.hooks) {
      expect(hook.action).toEqual({
        type: 'command',

        command: '/usr/local/bin/toolnet-memory session:kiro-hook',
      });
    }
  });

  it('preserves unmanaged hooks in the same file', () => {
    const hooksFile = tempHooksFile();

    mkdirSync(join(hooksFile, '..'), {
      recursive: true,
    });

    writeFileSync(
      hooksFile,
      JSON.stringify(
        {
          version: 'v1',

          hooks: [
            {
              name: 'My existing hook',

              trigger: 'Stop',

              action: {
                type: 'command',

                command: 'echo keep-me',
              },
            },
          ],
        },
        null,
        2
      )
    );

    installKiroHooks({
      hooksFile,

      binary: 'toolnet-memory',
    });

    const parsed = JSON.parse(readFileSync(hooksFile, 'utf8'));

    expect(parsed.hooks.some((hook: { name: string }) => hook.name === 'My existing hook')).toBe(
      true
    );

    expect(
      parsed.hooks.filter((hook: { name: string }) => hook.name.startsWith('ToolNet Memory - '))
    ).toHaveLength(5);
  });

  it('is idempotent', () => {
    const hooksFile = tempHooksFile();

    const first = installKiroHooks({
      hooksFile,

      binary: 'toolnet-memory',
    });

    const before = readFileSync(hooksFile, 'utf8');

    const second = installKiroHooks({
      hooksFile,

      binary: 'toolnet-memory',
    });

    const after = readFileSync(hooksFile, 'utf8');

    expect(first.changed).toBe(true);

    expect(second.changed).toBe(false);

    expect(after).toBe(before);
  });

  it('fails safely on invalid JSON', () => {
    const hooksFile = tempHooksFile();

    mkdirSync(join(hooksFile, '..'), {
      recursive: true,
    });

    const original = '{ invalid-json';

    writeFileSync(hooksFile, original);

    expect(() =>
      installKiroHooks({
        hooksFile,
      })
    ).toThrow(/Invalid existing Kiro hooks file/);

    expect(readFileSync(hooksFile, 'utf8')).toBe(original);
  });

  it('does not overwrite an unsupported hooks schema version', () => {
    const hooksFile = tempHooksFile();

    mkdirSync(join(hooksFile, '..'), {
      recursive: true,
    });

    const original = JSON.stringify(
      {
        version: 'v999',

        hooks: [],
      },
      null,
      2
    );

    writeFileSync(hooksFile, original);

    expect(() =>
      installKiroHooks({
        hooksFile,
      })
    ).toThrow(/Unsupported existing Kiro hooks version/);

    expect(readFileSync(hooksFile, 'utf8')).toBe(original);
  });
});
