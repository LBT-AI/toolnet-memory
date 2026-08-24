import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { execFileSync } from 'node:child_process';

import { afterEach, describe, expect, test } from 'vitest';

import {
  buildAgentScopePlan,
  parseIntegrationScope,
  resolveIntegrationProjectRoot,
} from '../../src/session/integration-scope/index.js';

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

describe('integration scope parsing', () => {
  test('defaults to global', () => {
    expect(parseIntegrationScope([])).toBe('global');
  });

  test('supports explicit global/project/both', () => {
    expect(parseIntegrationScope(['--scope', 'global'])).toBe('global');
    expect(parseIntegrationScope(['--scope', 'project'])).toBe('project');
    expect(parseIntegrationScope(['--scope', 'both'])).toBe('both');
    expect(parseIntegrationScope(['--both'])).toBe('both');
  });

  test('--project <path> is a project path, not a scope alias', () => {
    expect(parseIntegrationScope(['--scope', 'both', '--project', '/tmp/example'])).toBe('both');
  });

  test('rejects conflicting scope flags', () => {
    expect(() => parseIntegrationScope(['--global', '--both'])).toThrow(
      'Conflicting integration scopes'
    );
  });
});

describe('project root resolution', () => {
  test('prefers nearest existing ToolNet manifest without creating state', () => {
    const root = tempRoot('toolnet-scope-toolnet-');
    const nested = join(root, 'src', 'deep');

    mkdirSync(join(root, '.toolnet'), {
      recursive: true,
    });

    mkdirSync(nested, {
      recursive: true,
    });

    writeFileSync(join(root, '.toolnet', 'project.json'), '{}\n');

    const result = resolveIntegrationProjectRoot({
      cwd: nested,
    });

    expect(result.root).toBe(root);
    expect(result.source).toBe('toolnet');
    expect(result.eligible).toBe(true);
    expect(result.toolnetProject).toBe(true);
  });

  test('falls back to Git root when ToolNet manifest is absent', () => {
    const root = tempRoot('toolnet-scope-git-');
    const nested = join(root, 'src');

    mkdirSync(nested, {
      recursive: true,
    });

    execFileSync('git', ['init'], {
      cwd: root,
      stdio: 'ignore',
    });

    const result = resolveIntegrationProjectRoot({
      cwd: nested,
    });

    expect(result.root).toBe(root);
    expect(result.source).toBe('git');
    expect(result.eligible).toBe(true);
    expect(result.toolnetProject).toBe(false);
  });

  test('plain cwd is diagnostic only and not eligible for project writes', () => {
    const root = tempRoot('toolnet-scope-cwd-');

    const result = resolveIntegrationProjectRoot({
      cwd: root,
    });

    expect(result.root).toBe(root);
    expect(result.source).toBe('cwd');
    expect(result.eligible).toBe(false);
  });

  test('explicit project is an eligible root even before ToolNet init', () => {
    const root = tempRoot('toolnet-scope-explicit-');

    const result = resolveIntegrationProjectRoot({
      cwd: root,
      project: root,
    });

    expect(result.root).toBe(root);
    expect(result.source).toBe('explicit');
    expect(result.eligible).toBe(true);
    expect(result.toolnetProject).toBe(false);
  });
});

describe('agent surface scope plans', () => {
  const project = {
    root: '/tmp/project',
    source: 'toolnet' as const,
    eligible: true,
    toolnetProject: true,
    manifestFile: '/tmp/project/.toolnet/project.json',
  };

  test('global keeps current v0.3.10 behavior', () => {
    for (const agent of ['cursor', 'copilot', 'grok'] as const) {
      const result = buildAgentScopePlan({
        agent,
        scope: 'global',
      });

      expect(result.canInstall).toBe(true);
      expect(result.surfaces.mcp.global.install).toBe(true);
      expect(result.surfaces.hooks.global.install).toBe(true);
      expect(result.surfaces.mcp.project.install).toBe(false);
      expect(result.surfaces.hooks.project.install).toBe(false);
    }
  });

  test('project requires a clear eligible project root', () => {
    const result = buildAgentScopePlan({
      agent: 'cursor',
      scope: 'project',
      project: {
        root: '/tmp/plain',
        source: 'cwd',
        eligible: false,
        toolnetProject: false,
      },
    });

    expect(result.canInstall).toBe(false);
  });

  test('project uses project MCP/hooks/work only', () => {
    for (const agent of ['cursor', 'copilot', 'grok'] as const) {
      const result = buildAgentScopePlan({
        agent,
        scope: 'project',
        project,
      });

      expect(result.canInstall).toBe(true);
      expect(result.surfaces.mcp.effective).toBe('project');
      expect(result.surfaces.hooks.effective).toBe('project');
      expect(result.surfaces.work.effective).toBe('project');
    }
  });

  test('both marks additive hooks as dedupe-required', () => {
    for (const agent of ['cursor', 'copilot', 'grok'] as const) {
      const result = buildAgentScopePlan({
        agent,
        scope: 'both',
        project,
      });

      expect(result.canInstall).toBe(true);
      expect(result.surfaces.hooks.global.install).toBe(true);
      expect(result.surfaces.hooks.project.install).toBe(true);
      expect(result.surfaces.hooks.effective).toBe('both');
      expect(result.surfaces.hooks.risk).toBe('additive-duplicate');
      expect(result.surfaces.hooks.dedupeRequired).toBe(true);
    }
  });

  test('both models native MCP precedence explicitly', () => {
    const cursor = buildAgentScopePlan({
      agent: 'cursor',
      scope: 'both',
      project,
    });

    const copilot = buildAgentScopePlan({
      agent: 'copilot',
      scope: 'both',
      project,
    });

    const grok = buildAgentScopePlan({
      agent: 'grok',
      scope: 'both',
      project,
    });

    expect(cursor.surfaces.mcp.risk).toBe('precedence-unverified');
    expect(copilot.surfaces.mcp.risk).toBe('shadowed-global');
    expect(grok.surfaces.mcp.risk).toBe('shadowed-global');

    expect(cursor.surfaces.mcp.effective).toBe('project');
    expect(copilot.surfaces.mcp.effective).toBe('project');
    expect(grok.surfaces.mcp.effective).toBe('project');
  });
});
