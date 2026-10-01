import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { installQoderHooks } from '../../src/session/qoder/hook-installer.js';

describe('Qoder Hook Installer', () => {
  it('installs Stop and SessionEnd hooks and preserves unrelated hooks', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-qoder-hook-'));

    const settingsFile = join(root, 'settings.json');

    try {
      writeFileSync(
        settingsFile,
        JSON.stringify({
          existing: {
            SessionStart: [
              {
                type: 'command',
                command: 'other-hook',
              },
            ],
          },
        })
      );

      const result = installQoderHooks({
        settingsFile,

        binary: '/usr/local/bin/toolnet-memory',
      });

      expect(result.changed).toBe(true);

      expect(result.stopInstalled).toBe(true);

      expect(result.sessionEndInstalled).toBe(true);

      const parsed = JSON.parse(readFileSync(settingsFile, 'utf8')) as Record<string, unknown>;

      expect(parsed.existing).toBeDefined();

      const hooks = parsed.hooks as Array<Record<string, unknown>> | undefined;

      expect(hooks).toBeDefined();

      expect(hooks!.length).toBeGreaterThanOrEqual(2);

      const stopEntry = hooks![0] as Record<string, unknown>;

      expect(stopEntry.command).toContain('session:qoder-hook');

      const sessionEndEntry = hooks![1] as Record<string, unknown>;

      expect(sessionEndEntry.command).toContain('session:qoder-hook');
    } finally {
      rmSync(root, {
        recursive: true,

        force: true,
      });
    }
  });

  it('is idempotent on second run', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-qoder-hook-idem-'));

    const settingsFile = join(root, 'settings.json');

    try {
      writeFileSync(settingsFile, JSON.stringify({}));

      const first = installQoderHooks({
        settingsFile,

        binary: '/usr/local/bin/toolnet-memory',
      });

      expect(first.changed).toBe(true);

      const second = installQoderHooks({
        settingsFile,

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
