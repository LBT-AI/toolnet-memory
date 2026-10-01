import { mkdtempSync, rmSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { syncQwenSession } from '../../src/session/qwen/adapter.js';

describe('Qwen Adapter', () => {
  let root: string;

  afterEach(() => {
    if (root) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('hook module loads', async () => {
    const { main } = await import('../../src/session/qwen/hook.js');

    expect(typeof main).toBe('function');
  });

  it('adapter creates SessionCore and flushes', async () => {
    root = mkdtempSync(join(tmpdir(), 'toolnet-qwen-'));

    const project = {
      id: 'qwen-test',

      name: 'QwenTest',

      remote: 'QwenTest',

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

    const result = await syncQwenSession({
      project,

      storage: storage as never,

      sessionId: 'qwen-test-session',

      cwd: root,

      transcriptPath: join(root, 'transcript.jsonl'),
    });

    expect(result.sessionId).toBe('qwen-test-session');

    expect(result.imported).toBeGreaterThanOrEqual(1);

    expect(result.materialization).toBeDefined();
  });
});
