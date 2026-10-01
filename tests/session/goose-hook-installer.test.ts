import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { installGooseHooks } from '../../src/session/goose/hook-installer.js';

describe('Goose Hook Installer', () => {
  it('installs Stop and SessionEnd hooks and preserves unrelated hooks', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-goose-hook-'));

    const hooksFile = join(root, 'hooks.json');

    try {
      writeFileSync(
        hooksFile,
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

      const result = installGooseHooks({
        hooksFile,

        binary: '/usr/local/bin/toolnet-memory',
      });

      expect(result.changed).toBe(true);

      expect(result.stopInstalled).toBe(true);

      expect(result.sessionEndInstalled).toBe(true);

      const parsed = JSON.parse(readFileSync(hooksFile, 'utf8')) as Record<string, unknown>;

      expect(parsed.existing).toBeDefined();

      const hooks = parsed.hooks as Record<string, unknown> & {
        Stop?: Array<Record<string, unknown>>;

        SessionEnd?: Array<Record<string, unknown>>;
      };

      expect(hooks).toBeDefined();

      const stop = hooks.Stop as Array<Record<string, unknown>> | undefined;

      expect(stop).toBeDefined();

      expect(stop!.length).toBeGreaterThanOrEqual(1);

      const stopEntry = stop![0] as Record<string, unknown>;

      expect(
        (stopEntry.hooks as Array<Record<string, unknown>> | undefined)?.[0]?.command
      ).toContain('session:goose-hook');

      const sessionEnd = hooks.SessionEnd as Array<Record<string, unknown>> | undefined;

      expect(sessionEnd).toBeDefined();

      expect(sessionEnd!.length).toBeGreaterThanOrEqual(1);

      const sessionEndEntry = sessionEnd![0] as Record<string, unknown>;

      expect(
        (sessionEndEntry.hooks as Array<Record<string, unknown>> | undefined)?.[0]?.command
      ).toContain('session:goose-hook');
    } finally {
      rmSync(root, {
        recursive: true,

        force: true,
      });
    }
  });

  it('is idempotent on second run', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-goose-hook-idem-'));

    const hooksFile = join(root, 'hooks.json');

    try {
      writeFileSync(hooksFile, JSON.stringify({}));

      const first = installGooseHooks({
        hooksFile,

        binary: '/usr/local/bin/toolnet-memory',
      });

      expect(first.changed).toBe(true);

      const second = installGooseHooks({
        hooksFile,

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
