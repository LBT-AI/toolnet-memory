import { mkdtemp, rm } from 'node:fs/promises';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { LocalStorageProvider } from '../../src/storage/local/client.js';

let temp: string | undefined;

afterEach(async () => {
  if (temp) {
    await rm(temp, {
      recursive: true,
      force: true,
    });
  }
});

describe('Storage Provider', () => {
  it('writes reads lists and deletes', async () => {
    temp = await mkdtemp(join(tmpdir(), 'toolnet-memory-'));

    const storage = new LocalStorageProvider(temp);

    await storage.put('projects/test/a.txt', 'hello');

    expect(await storage.getText('projects/test/a.txt')).toBe('hello');

    expect(await storage.exists('projects/test/a.txt')).toBe(true);

    const files = await storage.list('projects');

    expect(files.length).toBe(1);

    await storage.delete('projects/test/a.txt');

    expect(await storage.exists('projects/test/a.txt')).toBe(false);
  });
});
