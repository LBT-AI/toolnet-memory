import { mkdtempSync, rmSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { syncQoderSession } from '../../src/session/qoder/adapter.js';

describe('Qoder Adapter', () => {
  let root: string;

  afterEach(() => {
    if (root) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('hook module loads', async () => {
    const { main } = await import('../../src/session/qoder/hook.js');

    expect(typeof main).toBe('function');
  });

  it('adapter creates SessionCore and flushes', async () => {
    root = mkdtempSync(join(tmpdir(), 'toolnet-qoder-'));

    const project = {
      id: 'qoder-test',

      name: 'QoderTest',

      remote: 'QoderTest',

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

    const result = await syncQoderSession({
      project,

      storage: storage as never,

      sessionId: 'qoder-test-session',

      cwd: root,

      transcriptPath: join(root, 'transcript.jsonl'),
    });

    expect(result.sessionId).toBe('qoder-test-session');

    expect(result.imported).toBeGreaterThanOrEqual(1);

    expect(result.materialization).toBeDefined();
  });
});
