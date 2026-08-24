import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { installCursorHooks } from '../../src/session/cursor/hook-installer.js';

import { installCopilotHooks } from '../../src/session/copilot/hook-installer.js';

import { installGrokHooks } from '../../src/session/grok/hook-installer.js';

describe('new agent hook installers', () => {
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
    const value = mkdtempSync(join(tmpdir(), 'toolnet-new-agent-hooks-'));

    roots.push(value);

    return value;
  }

  it('installs Cursor lifecycle capture hooks and preserves unrelated hooks', () => {
    const base = root();
    const hooksFile = join(base, '.cursor', 'hooks.json');

    mkdirSync(dirname(hooksFile), { recursive: true });

    writeFileSync(
      hooksFile,
      JSON.stringify({
        version: 1,
        hooks: {
          sessionStart: [
            {
              command: 'echo user-hook',
            },
          ],
          beforeShellExecution: [
            {
              command: 'echo shell-hook',
            },
          ],
        },
      })
    );

    const first = installCursorHooks({
      hooksFile,
      binary: '/usr/local/bin/toolnet-memory',
    });

    const second = installCursorHooks({
      hooksFile,
      binary: '/usr/local/bin/toolnet-memory',
    });

    expect(first.hookCount).toBe(6);
    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);

    const json = JSON.parse(readFileSync(hooksFile, 'utf8'));

    expect(json.hooks.sessionStart).toHaveLength(2);
    expect(json.hooks.beforeShellExecution[0].command).toBe('echo shell-hook');
    expect(json.hooks.beforeSubmitPrompt[0].command).toContain(
      'TOOLNET_HOOK_EVENT=beforeSubmitPrompt'
    );
    expect(json.hooks.stop[0].command).toContain('session:cursor-hook');
  });

  it('fails safely on invalid Cursor hook structure', () => {
    const base = root();
    const hooksFile = join(base, '.cursor', 'hooks.json');

    mkdirSync(dirname(hooksFile), { recursive: true });

    writeFileSync(
      hooksFile,
      JSON.stringify({
        version: 1,
        hooks: {
          sessionStart: {},
        },
      })
    );

    expect(() => installCursorHooks({ hooksFile })).toThrow(/sessionStart must be an array/);
  });

  it('installs Copilot command hooks using env event routing', () => {
    const base = root();
    const hooksFile = join(base, '.copilot', 'hooks', 'toolnet-memory.json');

    const first = installCopilotHooks({
      hooksFile,
      binary: 'toolnet-memory',
    });

    const second = installCopilotHooks({
      hooksFile,
      binary: 'toolnet-memory',
    });

    expect(first.hookCount).toBe(6);
    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);

    const json = JSON.parse(readFileSync(hooksFile, 'utf8'));

    expect(json.version).toBe(1);
    expect(json.hooks.userPromptSubmitted[0].env.TOOLNET_HOOK_EVENT).toBe('userPromptSubmitted');
    expect(json.hooks.agentStop[0].command).toBe('toolnet-memory session:copilot-hook');
  });

  it('preserves unrelated Copilot hook entries', () => {
    const base = root();
    const hooksFile = join(base, '.copilot', 'hooks', 'toolnet-memory.json');

    mkdirSync(dirname(hooksFile), { recursive: true });

    writeFileSync(
      hooksFile,
      JSON.stringify({
        version: 1,
        hooks: {
          postToolUse: [
            {
              type: 'command',
              command: 'echo existing',
            },
          ],
        },
      })
    );

    installCopilotHooks({ hooksFile });

    const json = JSON.parse(readFileSync(hooksFile, 'utf8'));

    expect(json.hooks.postToolUse).toHaveLength(2);
    expect(json.hooks.postToolUse[0].command).toBe('echo existing');
  });

  it('installs Grok native JSON hook groups', () => {
    const base = root();
    const hooksFile = join(base, '.grok', 'hooks', 'toolnet-memory.json');

    const first = installGrokHooks({
      hooksFile,
      binary: 'toolnet-memory',
    });

    const second = installGrokHooks({
      hooksFile,
      binary: 'toolnet-memory',
    });

    expect(first.hookCount).toBe(5);
    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);

    const json = JSON.parse(readFileSync(hooksFile, 'utf8'));

    expect(json.hooks.SessionStart[0].hooks[0].env.TOOLNET_HOOK_EVENT).toBe('SessionStart');

    expect(json.hooks.Stop[0].hooks[0].command).toBe('toolnet-memory session:grok-hook');
  });

  it('preserves unrelated Grok groups and events', () => {
    const base = root();
    const hooksFile = join(base, '.grok', 'hooks', 'toolnet-memory.json');

    mkdirSync(dirname(hooksFile), { recursive: true });

    writeFileSync(
      hooksFile,
      JSON.stringify({
        hooks: {
          PreToolUse: [
            {
              matcher: 'Bash',
              hooks: [
                {
                  type: 'command',
                  command: 'echo safety',
                },
              ],
            },
          ],
        },
      })
    );

    installGrokHooks({ hooksFile });

    const json = JSON.parse(readFileSync(hooksFile, 'utf8'));

    expect(json.hooks.PreToolUse[0].matcher).toBe('Bash');
  });
});
