import { mkdtempSync, rmSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import {
  bindToolNetCliSession,
  listToolNetCliProjectBindings,
  requireToolNetCliSessionBinding,
} from '../../src/session/toolnet-cli/project-binding.js';

function project(rootPath: string, id: string): ProjectManifest {
  return {
    id,

    name: id,

    rootPath,

    createdAt: '2026-09-01T00:00:00.000Z',

    updatedAt: '2026-09-01T00:00:00.000Z',

    graphVersion: 1,

    memoryVersion: 1,
  };
}

describe('ToolNet CLI project binding', () => {
  it('binds one native session to exactly one ToolNet project', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-cli-binding-'));

    const projectA = project(join(root, 'project-a'), 'project-a');

    const projectB = project(join(root, 'project-b'), 'project-b');

    const bindingFile = join(root, 'bindings.json');

    try {
      const binding = bindToolNetCliSession(projectA, 'sess_x1', {
        bindingFile,
      });

      expect(binding.projectId).toBe('project-a');

      expect(
        requireToolNetCliSessionBinding(projectA, 'sess_x1', {
          bindingFile,
        }).nativeSessionId
      ).toBe('sess_x1');

      expect(
        listToolNetCliProjectBindings(projectA, {
          bindingFile,
        })
      ).toHaveLength(1);

      expect(() =>
        requireToolNetCliSessionBinding(projectB, 'sess_x1', {
          bindingFile,
        })
      ).toThrow(/another project/i);

      expect(() =>
        bindToolNetCliSession(projectB, 'sess_x1', {
          bindingFile,
        })
      ).toThrow(/already bound/i);
    } finally {
      rmSync(root, {
        recursive: true,

        force: true,
      });
    }
  });

  it('rejects an unbound session by default', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-cli-unbound-'));

    const bindingFile = join(root, 'bindings.json');

    try {
      expect(() =>
        requireToolNetCliSessionBinding(project(root, 'project-x'), 'sess_unbound', {
          bindingFile,
        })
      ).toThrow(/not bound/i);
    } finally {
      rmSync(root, {
        recursive: true,

        force: true,
      });
    }
  });
});
