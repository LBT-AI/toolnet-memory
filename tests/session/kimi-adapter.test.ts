import { mkdtempSync, rmSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { syncKimiSession } from '../../src/session/kimi/adapter.js';

describe('Kimi Adapter', () => {
  let root: string;

  afterEach(() => {
    if (root) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('hook module loads', async () => {
    const { main } = await import('../../src/session/kimi/hook.js');

    expect(typeof main).toBe('function');
  });

  it('adapter creates SessionCore and flushes', async () => {
    root = mkdtempSync(join(tmpdir(), 'toolnet-kimi-'));

    const project = {
      id: 'kimi-test',

      name: 'KimiTest',

      remote: 'KimiTest',

      rootPath: root,

      createdAt: new Date().toISOString(),

      updatedAt: new Date().toISOString(),

      graphVersion: 0,

      memoryVersion: 0,
    };

    const storage = {
      name: 'memory',

      async put() {},

      async get() {
        return null;
      },

      async getText() {
        return null;
      },

      async exists() {
        return false;
      },

      async delete() {},

      async list() {
        return [];
      },
    };

    const result = await syncKimiSession({
      project,

      storage: storage as never,

      sessionId: 'kimi-test-session',

      cwd: root,
    });

    expect(result.sessionId).toBe('kimi-test-session');

    expect(result.imported).toBeGreaterThanOrEqual(1);

    expect(result.materialization).toBeDefined();
  });
});
