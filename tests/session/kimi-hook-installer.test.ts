import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { installKimiHooks } from '../../src/session/kimi/hook-installer.js';

describe('Kimi Hook Installer', () => {
  it('installs Stop and SessionEnd hooks and preserves unrelated hooks', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-kimi-hook-'));

    const configFile = join(root, 'config.toml');

    try {
      writeFileSync(
        configFile,
        `existing = true

[[other_hooks]]
name = "other"
event = "Stop"
command = "other-command"
`
      );

      const result = installKimiHooks({
        configFile,

        binary: '/usr/local/bin/toolnet-memory',
      });

      expect(result.changed).toBe(true);

      expect(result.stopInstalled).toBe(true);

      expect(result.sessionEndInstalled).toBe(true);

      const content = readFileSync(configFile, 'utf8');

      expect(content).toContain('toolnet-memory-stop');

      expect(content).toContain('toolnet-memory-session-end');

      expect(content).toContain('existing = true');
    } finally {
      rmSync(root, {
        recursive: true,

        force: true,
      });
    }
  });

  it('is idempotent on second run', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-kimi-hook-idem-'));

    const configFile = join(root, 'config.toml');

    try {
      writeFileSync(configFile, '');

      const first = installKimiHooks({
        configFile,

        binary: '/usr/local/bin/toolnet-memory',
      });

      expect(first.changed).toBe(true);

      const second = installKimiHooks({
        configFile,

        binary: '/usr/local/bin/toolnet-memory',
      });

      expect(second.changed).toBe(false);
    } finally {
      rmSync(root, {
        recursive: true,

        force: true,
      });
    }
  });
});
