import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

import {
  ensureProjectManual,
  loadProjectManual,
  projectManualPath,
  syncProjectManual,
} from '../../src/project-manual/index.js';

class MemoryStorage implements StorageProvider {
  readonly name = 'memory';

  readonly objects = new Map<string, Uint8Array>();

  async put(key: string, data: string | Uint8Array) {
    this.objects.set(key, typeof data === 'string' ? Buffer.from(data) : data);
  }

  async get(key: string) {
    return this.objects.get(key) ?? null;
  }

  async getText(key: string) {
    const value = await this.get(key);

    return value ? Buffer.from(value).toString('utf8') : null;
  }

  async exists(key: string) {
    return this.objects.has(key);
  }

  async delete(key: string) {
    this.objects.delete(key);
  }

  async list(prefix = ''): Promise<StorageObject[]> {
    return Array.from(this.objects.entries())
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => ({
        key,
        size: value.byteLength,
      }));
  }
}

const roots: string[] = [];

function project(): ProjectManifest {
  const root = mkdtempSync(join(tmpdir(), 'toolnet-manual-'));

  roots.push(root);

  const now = new Date().toISOString();

  return {
    id: 'project-manual-test',

    name: 'Mercedes',

    remote: 'Mercedes',

    rootPath: root,

    createdAt: now,

    updatedAt: now,

    graphVersion: 0,

    memoryVersion: 0,
  };
}

afterEach(() => {
  while (roots.length) {
    rmSync(roots.pop()!, {
      recursive: true,

      force: true,
    });
  }
});

describe('Project Manual', () => {
  it('creates PROJECT.md and parses enforce/advisory rules', () => {
    const p = project();

    ensureProjectManual(p);

    const file = projectManualPath(p);

    writeFileSync(
      file,
      `# Project

## Critical Rules

- [enforce] Only edit /project/src
- [enforce] Never edit production directly.
- [advisory] Prefer small focused files.
`
    );

    const manual = loadProjectManual(p)!;

    expect(manual.rules).toHaveLength(3);

    expect(manual.rules.filter((rule) => rule.mode === 'enforce')).toHaveLength(2);

    expect(readFileSync(file, 'utf8')).toContain('Never edit production');
  });

  it('syncs manual into project namespace', async () => {
    const p = project();

    const storage = new MemoryStorage();

    const file = ensureProjectManual(p);

    writeFileSync(file, '- [enforce] Deploy only with ./deploy-theme.sh --apply\n');

    await syncProjectManual(p, storage);

    expect(await storage.exists(`projects/${p.id}/project/manual.md`)).toBe(true);

    expect(await storage.exists(`projects/${p.id}/project/manual.json`)).toBe(true);
  });
});
