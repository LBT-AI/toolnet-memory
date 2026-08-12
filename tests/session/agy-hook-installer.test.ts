import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { installAgyHooks } from '../../src/session/agy/hook-installer.js';

interface InstalledToolNetHook {
  enabled?: boolean;

  PreToolUse?: Array<{
    matcher?: string;

    hooks?: Array<{
      command?: string;
    }>;
  }>;

  PreInvocation?: Array<{
    command?: string;
  }>;

  Stop?: Array<{
    command?: string;
  }>;
}

describe('Agy Hook Installer', () => {
  it('installs continuity guard and preserves unrelated hooks', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-agy-hooks-'));

    const hooksFile = join(root, 'hooks.json');

    try {
      writeFileSync(
        hooksFile,
        JSON.stringify({
          existing: {
            enabled: true,
          },
        })
      );

      installAgyHooks({
        hooksFile,

        binary: '/usr/local/bin/toolnet-memory',
      });

      const parsed = JSON.parse(readFileSync(hooksFile, 'utf8')) as Record<string, unknown>;

      expect(parsed.existing).toBeDefined();

      const toolnet = parsed['toolnet-memory'] as InstalledToolNetHook | undefined;

      expect(toolnet).toBeDefined();

      expect(toolnet?.enabled).toBe(true);

      expect(toolnet?.PreToolUse?.[0]?.matcher).toContain('view_file');

      expect(toolnet?.PreToolUse?.[0]?.hooks?.[0]?.command).toContain('session:agy-hook pre-tool');

      expect(toolnet?.PreInvocation?.[0]?.command).toContain('session:agy-hook pre');

      expect(toolnet?.Stop?.[0]?.command).toContain('session:agy-hook stop');
    } finally {
      rmSync(root, {
        recursive: true,

        force: true,
      });
    }
  });
});
