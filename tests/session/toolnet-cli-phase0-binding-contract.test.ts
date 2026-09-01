import { mkdtempSync, rmSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import {
  bindToolNetCliSession,
  defaultToolNetCliBindingFile,
  listToolNetCliProjectBindings,
  requireToolNetCliSessionBinding,
} from '../../src/session/toolnet-cli/project-binding.js';

const roots: string[] = [];

function makeProject(rootPath: string, id: string): ProjectManifest {
  const now = new Date().toISOString();

  return {
    id,

    name: id,

    rootPath,

    createdAt: now,

    updatedAt: now,

    graphVersion: 1,

    memoryVersion: 1,
  };
}

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop();

    if (!root) {
      continue;
    }

    rmSync(root, {
      recursive: true,

      force: true,
    });
  }
});

describe('Phase 0 ToolNet CLI safe project binding', () => {
  it('has a ToolNet-owned global binding registry path', () => {
    const file = defaultToolNetCliBindingFile();

    expect(file).toContain('toolnet-memory');

    expect(file).toContain('toolnet-cli-bindings.json');
  });

  it('binds once and is idempotent for the same project', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-phase0-a-'));

    roots.push(root);

    const bindingFile = join(root, 'bindings.json');

    const project = makeProject(join(root, 'project-a'), 'project-a');

    const first = bindToolNetCliSession(project, 'sess_safe_1', {
      bindingFile,
    });

    const second = bindToolNetCliSession(project, 'sess_safe_1', {
      bindingFile,
    });

    expect(second).toEqual(first);

    expect(
      listToolNetCliProjectBindings(project, {
        bindingFile,
      })
    ).toHaveLength(1);
  });

  it('rejects rebinding a native session to another project', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-phase0-b-'));

    roots.push(root);

    const bindingFile = join(root, 'bindings.json');

    const projectA = makeProject(join(root, 'project-a'), 'project-a');

    const projectB = makeProject(join(root, 'project-b'), 'project-b');

    bindToolNetCliSession(projectA, 'sess_cross_project', {
      bindingFile,
    });

    expect(() =>
      bindToolNetCliSession(projectB, 'sess_cross_project', {
        bindingFile,
      })
    ).toThrow(/already bound|another project/i);

    expect(() =>
      requireToolNetCliSessionBinding(projectB, 'sess_cross_project', {
        bindingFile,
      })
    ).toThrow(/another project/i);
  });

  it('rejects an unbound native session', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-phase0-c-'));

    roots.push(root);

    const bindingFile = join(root, 'bindings.json');

    const project = makeProject(root, 'project-current');

    expect(() =>
      requireToolNetCliSessionBinding(project, 'sess_not_bound', {
        bindingFile,
      })
    ).toThrow(/not bound/i);
  });

  it('lists only bindings belonging to the exact current project', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-phase0-d-'));

    roots.push(root);

    const bindingFile = join(root, 'bindings.json');

    const projectA = makeProject(join(root, 'a'), 'a');

    const projectB = makeProject(join(root, 'b'), 'b');

    bindToolNetCliSession(projectA, 'sess_a1', {
      bindingFile,
    });

    bindToolNetCliSession(projectA, 'sess_a2', {
      bindingFile,
    });

    bindToolNetCliSession(projectB, 'sess_b1', {
      bindingFile,
    });

    expect(
      listToolNetCliProjectBindings(projectA, {
        bindingFile,
      }).map((item) => item.nativeSessionId)
    ).toEqual(['sess_a1', 'sess_a2']);
  });
});
