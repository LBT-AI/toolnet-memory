import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import { ProjectManager } from '../../src/core/project-manager.js';
import {
  inspectGitProjectIdentity,
  normalizeGitRemote,
  stableProjectIdFromGitRemote,
} from '../../src/core/project-identity.js';
import {
  bootstrapProjectIdentity,
  ProjectIdentityAdoptionRequiredError,
} from '../../src/production/project-identity-registry.js';
import type { StorageObject, StorageProvider } from '../../src/storage/types.js';
const roots: string[] = [];
function tempRoot(name: string): string {
  const parent = mkdtempSync(join(tmpdir(), 'toolnet-cross-machine-'));
  roots.push(parent);
  const root = join(parent, name);
  mkdirSync(root, {
    recursive: true,
  });
  return root;
}
function git(root: string, args: string[]): void {
  const result = spawnSync('git', ['-C', root, ...args], {
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || `git ${args.join(' ')} failed`);
  }
}
function initGit(root: string, remote: string): void {
  git(root, ['init', '-q']);
  git(root, ['remote', 'add', 'origin', remote]);
  writeFileSync(join(root, 'package.json'), '{}');
}
class MemoryStorage implements StorageProvider {
  readonly name = 'test-remote';
  private readonly values = new Map<string, Uint8Array>();
  async put(key: string, data: string | Uint8Array): Promise<void> {
    this.values.set(key, typeof data === 'string' ? new TextEncoder().encode(data) : data);
  }
  async get(key: string): Promise<Uint8Array | null> {
    return this.values.get(key) ?? null;
  }
  async getText(key: string): Promise<string | null> {
    const value = await this.get(key);
    return value ? new TextDecoder().decode(value) : null;
  }
  async exists(key: string): Promise<boolean> {
    return this.values.has(key);
  }
  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }
  async list(prefix = ''): Promise<StorageObject[]> {
    return [...this.values.keys()]
      .filter((key) => key.startsWith(prefix))
      .map((key) => ({
        key,
      }));
  }
}
afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, {
      recursive: true,
      force: true,
    });
  }
});
describe('Phase 18 cross-machine project identity', () => {
  it('normalizes GitHub HTTPS and SSH to one canonical repository', () => {
    expect(normalizeGitRemote('https://github.com/LBT-AI/toolnet-memory.git')).toBe(
      'github.com/lbt-ai/toolnet-memory'
    );
    expect(normalizeGitRemote('git@github.com:LBT-AI/toolnet-memory.git')).toBe(
      'github.com/lbt-ai/toolnet-memory'
    );
    expect(normalizeGitRemote('ssh://git@github.com/LBT-AI/toolnet-memory.git')).toBe(
      'github.com/lbt-ai/toolnet-memory'
    );
  });
  it('does not leak HTTPS credentials into canonical identity', () => {
    expect(
      normalizeGitRemote('https://user:secret-token@github.com/LBT-AI/toolnet-memory.git')
    ).toBe('github.com/lbt-ai/toolnet-memory');
  });
  it('creates the same new project id in different checkout paths', () => {
    const firstRoot = tempRoot('first-checkout');
    const secondRoot = tempRoot('different-folder');
    initGit(firstRoot, 'https://github.com/LBT-AI/toolnet-memory.git');
    initGit(secondRoot, 'git@github.com:LBT-AI/toolnet-memory.git');
    const first = new ProjectManager().detect(firstRoot);
    const second = new ProjectManager().detect(secondRoot);
    expect(first.id).toBe(second.id);
    expect(first.remote).toBe('toolnet-memory');
    expect(second.remote).toBe('toolnet-memory');
    const identity = inspectGitProjectIdentity(firstRoot);
    expect(first.id).toBe(stableProjectIdFromGitRemote(identity!.canonicalRemote));
  });
  it('registers a legacy id then automatically adopts it in a fresh clone', async () => {
    const storage = new MemoryStorage();
    const oldRoot = tempRoot('toolnet-memory');
    initGit(oldRoot, 'https://github.com/LBT-AI/toolnet-memory.git');
    const gitIdentity = inspectGitProjectIdentity(oldRoot)!;
    const oldProject = new ProjectManager().adopt(oldRoot, {
      id: 'legacy-path-id-01',
      name: 'toolnet-memory',
      remote: 'toolnet-memory',
      gitIdentity,
    });
    const registered = await bootstrapProjectIdentity(oldRoot, {
      storage,
      storageIsCrossMachine: true,
    });
    expect(registered.project.id).toBe(oldProject.id);
    expect(registered.registry).toBe('registered');
    const freshRoot = tempRoot('another-machine-folder');
    initGit(freshRoot, 'git@github.com:LBT-AI/toolnet-memory.git');
    const adopted = await bootstrapProjectIdentity(freshRoot, {
      storage,
      storageIsCrossMachine: true,
    });
    expect(adopted.source).toBe('remote-registry');
    expect(adopted.project.id).toBe('legacy-path-id-01');
    expect(adopted.project.remote).toBe('toolnet-memory');
    const manifest = JSON.parse(readFileSync(join(freshRoot, '.toolnet', 'project.json'), 'utf8'));
    expect(manifest.id).toBe('legacy-path-id-01');
  });
  it('refuses silent adoption of legacy remote without Git proof', async () => {
    const storage = new MemoryStorage();
    await storage.put(
      'projects/toolnet-memory/project.json',
      JSON.stringify({
        version: 1,
        id: 'legacy-without-fingerprint',
        name: 'toolnet-memory',
        remote: 'toolnet-memory',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      })
    );
    const freshRoot = tempRoot('toolnet-memory');
    initGit(freshRoot, 'https://github.com/LBT-AI/toolnet-memory.git');
    await expect(
      bootstrapProjectIdentity(freshRoot, {
        storage,
        storageIsCrossMachine: true,
      })
    ).rejects.toBeInstanceOf(ProjectIdentityAdoptionRequiredError);
    expect(new ProjectManager().findExisting(freshRoot)).toBeNull();
  });
  it('supports explicit adoption of a pre-registry legacy project', async () => {
    const storage = new MemoryStorage();
    await storage.put(
      'projects/toolnet-memory/project.json',
      JSON.stringify({
        version: 1,
        id: 'legacy-explicit-id',
        name: 'toolnet-memory',
        remote: 'toolnet-memory',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      })
    );
    const freshRoot = tempRoot('fresh-custom-folder');
    initGit(freshRoot, 'git@github.com:LBT-AI/toolnet-memory.git');
    const adopted = await bootstrapProjectIdentity(freshRoot, {
      storage,
      storageIsCrossMachine: true,
      adoptRemote: 'toolnet-memory',
    });
    expect(adopted.source).toBe('explicit-remote-adoption');
    expect(adopted.project.id).toBe('legacy-explicit-id');
    /*
     * A third clone now gets automatic registry adoption.
     */
    const thirdRoot = tempRoot('third-machine');
    initGit(thirdRoot, 'https://github.com/LBT-AI/toolnet-memory.git');
    const third = await bootstrapProjectIdentity(thirdRoot, {
      storage,
      storageIsCrossMachine: true,
    });
    expect(third.source).toBe('remote-registry');
    expect(third.project.id).toBe('legacy-explicit-id');
  });
  it('refuses to overwrite an existing different local project identity', () => {
    const root = tempRoot('collision');
    writeFileSync(join(root, 'package.json'), '{}');
    const manager = new ProjectManager();
    const first = manager.detect(root);
    expect(() =>
      manager.adopt(root, {
        id: 'another-project-id',
        name: 'different',
        remote: 'different',
      })
    ).toThrow('PROJECT_IDENTITY_ALREADY_EXISTS');
    expect(manager.requireExisting(root).id).toBe(first.id);
  });
});
