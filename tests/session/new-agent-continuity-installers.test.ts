import { mkdtempSync, readFileSync, rmSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { installCursorHooks } from '../../src/session/cursor/hook-installer.js';

import { installCopilotHooks } from '../../src/session/copilot/hook-installer.js';

import { installGrokHooks } from '../../src/session/grok/hook-installer.js';

describe('Phase 04 hook installer upgrades', () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  function root(): string {
    const value = mkdtempSync(join(tmpdir(), 'toolnet-phase04-hooks-'));

    roots.push(value);

    return value;
  }

  it('upgrades Cursor to six managed hooks including preToolUse', () => {
    const base = root();
    const hooksFile = join(base, '.cursor', 'hooks.json');

    const result = installCursorHooks({
      hooksFile,
    });

    expect(result.hookCount).toBe(6);

    const json = JSON.parse(readFileSync(hooksFile, 'utf8'));

    expect(json.hooks.preToolUse[0].matcher).toBe('.*');

    expect(json.hooks.preToolUse[0].command).toContain('session:cursor-hook');
  });

  it('upgrades Copilot to six hooks including transformed-prompt resume injection and preToolUse', () => {
    const base = root();
    const hooksFile = join(base, '.copilot', 'hooks', 'toolnet-memory.json');

    const result = installCopilotHooks({
      hooksFile,
    });

    expect(result.hookCount).toBe(6);

    const json = JSON.parse(readFileSync(hooksFile, 'utf8'));

    expect(json.hooks.userPromptTransformed[0].env.TOOLNET_HOOK_EVENT).toBe(
      'userPromptTransformed'
    );

    expect(json.hooks.preToolUse[0].matcher).toBe('.*');
  });

  it('upgrades Grok to five hooks including native PreToolUse', () => {
    const base = root();
    const hooksFile = join(base, '.grok', 'hooks', 'toolnet-memory.json');

    const result = installGrokHooks({
      hooksFile,
    });

    expect(result.hookCount).toBe(5);

    const json = JSON.parse(readFileSync(hooksFile, 'utf8'));

    expect(json.hooks.PreToolUse[0].matcher).toBe('.*');

    expect(json.hooks.PreToolUse[0].hooks[0].env.TOOLNET_HOOK_EVENT).toBe('PreToolUse');
  });
});
