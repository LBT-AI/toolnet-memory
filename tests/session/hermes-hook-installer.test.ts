import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { installHermesHooks } from '../../src/session/hermes/hook-installer.js';

describe('Hermes Hook Installer', () => {
  it('installs on_session_end hook and preserves unrelated hooks', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-hermes-hook-'));

    const configFile = join(root, 'config.yaml');

    try {
      writeFileSync(
        configFile,
        `existing: true

hooks:
  - name: other-hook
    event: Stop
    command: other-command
`
      );

      const result = installHermesHooks({
        configFile,

        binary: '/usr/local/bin/toolnet-memory',
      });

      expect(result.changed).toBe(true);

      expect(result.sessionEndInstalled).toBe(true);

      const content = readFileSync(configFile, 'utf8');

      expect(content).toContain('toolnet-memory-session-end');

      expect(content).toContain('existing: true');

      expect(content).toContain('other-hook');
    } finally {
      rmSync(root, {
        recursive: true,

        force: true,
      });
    }
  });

  it('is idempotent on second run', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-hermes-hook-idem-'));

    const configFile = join(root, 'config.yaml');

    try {
      writeFileSync(configFile, '');

      const first = installHermesHooks({
        configFile,

        binary: '/usr/local/bin/toolnet-memory',
      });

      expect(first.changed).toBe(true);

      const second = installHermesHooks({
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
