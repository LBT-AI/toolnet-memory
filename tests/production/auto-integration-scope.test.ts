import { execFileSync } from 'node:child_process';

import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import { resolveAutoIntegrationScope } from '../../src/production/auto-integration-scope.js';

const roots: string[] = [];

function tempRoot(prefix: string): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, {
      recursive: true,
      force: true,
    });
  }
});

describe('integrate:auto scoped policy', () => {
  test('ordinary directory defaults to global only', () => {
    const root = tempRoot('toolnet-auto-plain-');

    const policy = resolveAutoIntegrationScope({
      cwd: root,
    });

    expect(policy.scope).toBe('global');
    expect(policy.automatic).toBe(true);
    expect(policy.reason).toBe('no-toolnet-project');
    expect(policy.project).toBeUndefined();
  });

  test('Git-only repository still defaults to global only', () => {
    const root = tempRoot('toolnet-auto-git-');

    execFileSync('git', ['init'], {
      cwd: root,
      stdio: 'ignore',
    });

    const policy = resolveAutoIntegrationScope({
      cwd: root,
    });

    expect(policy.scope).toBe('global');
    expect(policy.reason).toBe('no-toolnet-project');
    expect(policy.project).toBeUndefined();
  });

  test('initialized ToolNet project automatically selects both', () => {
    const root = tempRoot('toolnet-auto-project-');

    mkdirSync(join(root, '.toolnet'), {
      recursive: true,
    });

    writeFileSync(join(root, '.toolnet', 'project.json'), '{}\n');

    const policy = resolveAutoIntegrationScope({
      cwd: root,
    });

    expect(policy.scope).toBe('both');
    expect(policy.automatic).toBe(true);
    expect(policy.reason).toBe('toolnet-project');
    expect(policy.project?.root).toBe(root);
    expect(policy.project?.toolnetProject).toBe(true);
  });

  test('explicit global never creates project intent', () => {
    const root = tempRoot('toolnet-auto-explicit-global-');

    mkdirSync(join(root, '.toolnet'), {
      recursive: true,
    });
    writeFileSync(join(root, '.toolnet', 'project.json'), '{}\n');

    const policy = resolveAutoIntegrationScope({
      cwd: root,
      scope: 'global',
    });

    expect(policy.scope).toBe('global');
    expect(policy.automatic).toBe(false);
    expect(policy.reason).toBe('explicit-global');
    expect(policy.project).toBeUndefined();
  });

  test('explicit project/both accepts an explicit directory before ToolNet init', () => {
    const root = tempRoot('toolnet-auto-explicit-project-');

    const projectOnly = resolveAutoIntegrationScope({
      scope: 'project',
      projectRoot: root,
    });

    const both = resolveAutoIntegrationScope({
      scope: 'both',
      projectRoot: root,
    });

    expect(projectOnly.scope).toBe('project');
    expect(projectOnly.project?.root).toBe(root);
    expect(projectOnly.project?.eligible).toBe(true);

    expect(both.scope).toBe('both');
    expect(both.project?.root).toBe(root);
    expect(both.project?.eligible).toBe(true);
  });

  test('invalid explicit project path fails instead of falling back to global', () => {
    const root = tempRoot('toolnet-auto-invalid-');
    const missing = join(root, 'missing');

    expect(() =>
      resolveAutoIntegrationScope({
        scope: 'both',
        projectRoot: missing,
      })
    ).toThrow('Project path does not exist');
  });

  test('does not mutate project state while resolving policy', () => {
    const root = tempRoot('toolnet-auto-readonly-');

    resolveAutoIntegrationScope({
      cwd: root,
    });

    expect(existsSync(join(root, '.toolnet'))).toBe(false);
    expect(existsSync(join(root, '.cursor'))).toBe(false);
    expect(existsSync(join(root, '.github'))).toBe(false);
    expect(existsSync(join(root, '.grok'))).toBe(false);
  });
});
