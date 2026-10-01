import { mkdtempSync, rmSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { syncHermesSession } from '../../src/session/hermes/adapter.js';

describe('Hermes Adapter', () => {
  let root: string;

  afterEach(() => {
    if (root) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('hook module loads', async () => {
    const { main } = await import('../../src/session/hermes/hook.js');

    expect(typeof main).toBe('function');
  });

  it('adapter creates SessionCore and flushes', async () => {
    root = mkdtempSync(join(tmpdir(), 'toolnet-hermes-'));

    const project = {
      id: 'hermes-test',

      name: 'HermesTest',

      remote: 'HermesTest',

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

    const result = await syncHermesSession({
      project,

      storage: storage as never,

      sessionId: 'hermes-test-session',

      cwd: root,
    });

    expect(result.sessionId).toBe('hermes-test-session');

    expect(result.imported).toBeGreaterThanOrEqual(1);

    expect(result.materialization).toBeDefined();
  });
});
