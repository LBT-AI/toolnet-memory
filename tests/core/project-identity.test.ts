import { mkdtempSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

import { join } from 'node:path';

import { tmpdir } from 'node:os';

import { describe, expect, it } from 'vitest';

import { ProjectManager } from '../../src/core/project-manager.js';

describe('Project identity', () => {
  it('persists identity in .toolnet/project.json', () => {
    const parent = mkdtempSync(join(tmpdir(), 'toolnet-project-'));

    const projectRoot = join(parent, 'Mercedes');

    mkdirSync(projectRoot, {
      recursive: true,
    });

    writeFileSync(join(projectRoot, 'package.json'), '{}');

    try {
      const first = new ProjectManager().detect(projectRoot);

      const localManifest = JSON.parse(
        readFileSync(join(projectRoot, '.toolnet', 'project.json'), 'utf8')
      );

      expect(localManifest.id).toBe(first.id);

      expect(localManifest.remote).toBe('Mercedes');
    } finally {
      rmSync(parent, {
        recursive: true,
        force: true,
      });
    }
  });

  it('keeps the same project id and remote namespace after folder rename', () => {
    const parent = mkdtempSync(join(tmpdir(), 'toolnet-project-rename-'));

    const originalRoot = join(parent, 'mercedes');

    const renamedRoot = join(parent, 'mercedes-website');

    mkdirSync(originalRoot, {
      recursive: true,
    });

    writeFileSync(join(originalRoot, 'package.json'), '{}');

    try {
      const manager = new ProjectManager();

      const before = manager.detect(originalRoot);

      renameSync(originalRoot, renamedRoot);

      const after = manager.detect(renamedRoot);

      expect(after.id).toBe(before.id);

      expect(after.remote).toBe(before.remote);

      expect(after.name).toBe(before.name);

      expect(after.rootPath).toBe(renamedRoot);
    } finally {
      rmSync(parent, {
        recursive: true,
        force: true,
      });
    }
  });
});
