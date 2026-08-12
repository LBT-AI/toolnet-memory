import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { initializeToolNetProject } from '../../src/production/init.js';

describe('toolnet-memory init', () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      rmSync(root, {
        recursive: true,

        force: true,
      });
    }
  });

  it('initializes a repository at its root', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-init-'));

    roots.push(root);

    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({
        name: 'demo-project',
      })
    );

    const result = initializeToolNetProject(root);

    expect(result.initialized).toBe(true);

    expect(result.project.rootPath).toBe(root);

    expect(result.project.id).toMatch(/^[a-f0-9]{16}$/);

    expect(result.manifestFile).toBe(join(root, '.toolnet', 'project.json'));

    expect(existsSync(result.manifestFile)).toBe(true);
  });

  it('is idempotent and preserves project identity', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-init-idempotent-'));

    roots.push(root);

    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({
        name: 'demo-project',
      })
    );

    const first = initializeToolNetProject(root);

    const firstManifest = JSON.parse(readFileSync(first.manifestFile, 'utf8'));

    const second = initializeToolNetProject(root);

    const secondManifest = JSON.parse(readFileSync(second.manifestFile, 'utf8'));

    expect(second.project.id).toBe(first.project.id);

    expect(secondManifest.id).toBe(firstManifest.id);

    expect(secondManifest.createdAt).toBe(firstManifest.createdAt);
  });

  it('initializes the repository root when called from a subdirectory', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-init-subdir-'));

    roots.push(root);

    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({
        name: 'demo-project',
      })
    );

    const nested = join(root, 'src', 'features');

    mkdirSync(nested, {
      recursive: true,
    });

    const result = initializeToolNetProject(nested);

    expect(result.project.rootPath).toBe(root);

    expect(result.manifestFile).toBe(join(root, '.toolnet', 'project.json'));
  });

  it('rejects a missing project path', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-init-missing-'));

    roots.push(root);

    expect(() => initializeToolNetProject(join(root, 'does-not-exist'))).toThrow(
      'Project path does not exist'
    );
  });
});
