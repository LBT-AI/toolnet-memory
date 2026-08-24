import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import {
  cursorProjectHooksFile,
  cursorProjectMcpConfigFile,
  cursorToolnetProjectRuleFile,
} from '../../src/session/cursor/config-paths.js';

import { installCursorIntegration } from '../../src/session/cursor/installer.js';

import {
  CURSOR_TOOLNET_PROJECT_RULE,
  installCursorProjectRule,
} from '../../src/session/cursor/project-rule-installer.js';

import { inspectCursorScopedIntegrationStatus } from '../../src/session/cursor/scoped-status.js';

const roots: string[] = [];

function tempRoot(prefix: string): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

function json(file: string): Record<string, unknown> {
  return JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, {
      recursive: true,
      force: true,
    });
  }
});

describe('Cursor dual-scope integration', () => {
  test('project scope installs project MCP, hooks and dedicated ToolNet rule only', () => {
    const project = tempRoot('toolnet-cursor-project-');
    const globalRoot = tempRoot('toolnet-cursor-global-unused-');

    mkdirSync(join(project, '.toolnet'), {
      recursive: true,
    });
    writeFileSync(join(project, '.toolnet', 'project.json'), '{}\n');

    const globalMcp = join(globalRoot, 'mcp.json');
    const globalHooks = join(globalRoot, 'hooks.json');

    const result = installCursorIntegration({
      scope: 'project',
      projectRoot: project,
      configFile: globalMcp,
      hooksFile: globalHooks,
    });

    expect(result.installed).toBe(true);
    expect(result.scope).toBe('project');
    expect(existsSync(globalMcp)).toBe(false);
    expect(existsSync(globalHooks)).toBe(false);

    expect(existsSync(cursorProjectMcpConfigFile(project))).toBe(true);
    expect(existsSync(cursorProjectHooksFile(project))).toBe(true);
    expect(existsSync(cursorToolnetProjectRuleFile(project))).toBe(true);

    expect(readFileSync(cursorToolnetProjectRuleFile(project), 'utf8')).toBe(
      CURSOR_TOOLNET_PROJECT_RULE
    );
  });

  test('both preserves unrelated global/project MCP and hook entries', () => {
    const project = tempRoot('toolnet-cursor-both-project-');
    const home = tempRoot('toolnet-cursor-both-home-');

    mkdirSync(join(project, '.toolnet'), {
      recursive: true,
    });
    writeFileSync(join(project, '.toolnet', 'project.json'), '{}\n');

    const globalMcp = join(home, '.cursor', 'mcp.json');
    const globalHooks = join(home, '.cursor', 'hooks.json');
    const projectMcp = cursorProjectMcpConfigFile(project);
    const projectHooks = cursorProjectHooksFile(project);

    mkdirSync(join(home, '.cursor'), {
      recursive: true,
    });
    mkdirSync(join(project, '.cursor'), {
      recursive: true,
    });

    writeFileSync(
      globalMcp,
      JSON.stringify({
        mcpServers: {
          existingGlobal: {
            command: 'existing-global',
            args: [],
          },
        },
      })
    );

    writeFileSync(
      projectMcp,
      JSON.stringify({
        mcpServers: {
          existingProject: {
            command: 'existing-project',
            args: [],
          },
        },
      })
    );

    writeFileSync(
      globalHooks,
      JSON.stringify({
        version: 1,
        hooks: {
          sessionStart: [
            {
              type: 'command',
              command: 'existing-global-hook',
            },
          ],
        },
      })
    );

    writeFileSync(
      projectHooks,
      JSON.stringify({
        version: 1,
        hooks: {
          sessionStart: [
            {
              type: 'command',
              command: 'existing-project-hook',
            },
          ],
        },
      })
    );

    const first = installCursorIntegration({
      scope: 'both',
      projectRoot: project,
      configFile: globalMcp,
      hooksFile: globalHooks,
    });

    expect(first.installed).toBe(true);
    expect(first.changed).toBe(true);
    expect(first.plan.surfaces.hooks.dedupeRequired).toBe(true);

    const globalMcpRoot = json(globalMcp);
    const projectMcpRoot = json(projectMcp);
    const globalHookRoot = json(globalHooks);
    const projectHookRoot = json(projectHooks);

    expect(globalMcpRoot.mcpServers).toMatchObject({
      existingGlobal: {
        command: 'existing-global',
      },
      'toolnet-memory': {
        command: 'toolnet-memory',
        args: ['mcp'],
      },
    });

    expect(projectMcpRoot.mcpServers).toMatchObject({
      existingProject: {
        command: 'existing-project',
      },
      'toolnet-memory': {
        command: 'toolnet-memory',
        args: ['mcp'],
      },
    });

    expect(JSON.stringify(globalHookRoot)).toContain('existing-global-hook');
    expect(JSON.stringify(projectHookRoot)).toContain('existing-project-hook');
    expect(JSON.stringify(globalHookRoot)).toContain('session:cursor-hook');
    expect(JSON.stringify(projectHookRoot)).toContain('session:cursor-hook');

    const second = installCursorIntegration({
      scope: 'both',
      projectRoot: project,
      configFile: globalMcp,
      hooksFile: globalHooks,
    });

    expect(second.changed).toBe(false);
  });

  test('dedicated project rule does not modify neighboring Cursor rules', () => {
    const project = tempRoot('toolnet-cursor-rule-');
    const rules = join(project, '.cursor', 'rules');
    const existing = join(rules, 'existing.mdc');

    mkdirSync(rules, {
      recursive: true,
    });

    writeFileSync(existing, 'existing cursor rule\n');

    const first = installCursorProjectRule({
      projectRoot: project,
    });

    const second = installCursorProjectRule({
      projectRoot: project,
    });

    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);
    expect(readFileSync(existing, 'utf8')).toBe('existing cursor rule\n');
  });

  test('scoped status reports global/project/effective risk and dedupe readiness', () => {
    const project = tempRoot('toolnet-cursor-status-project-');
    const home = tempRoot('toolnet-cursor-status-home-');

    mkdirSync(join(project, '.toolnet'), {
      recursive: true,
    });
    writeFileSync(join(project, '.toolnet', 'project.json'), '{}\n');

    const globalMcp = join(home, '.cursor', 'mcp.json');
    const globalHooks = join(home, '.cursor', 'hooks.json');

    installCursorIntegration({
      scope: 'both',
      projectRoot: project,
      configFile: globalMcp,
      hooksFile: globalHooks,
    });

    const status = inspectCursorScopedIntegrationStatus({
      scope: 'both',
      projectRoot: project,
      globalConfigFile: globalMcp,
      globalHooksFile: globalHooks,
    });

    expect(status.installed).toBe(true);
    expect(status.state).toBe('ready');
    expect(status.global?.installed).toBe(true);
    expect(status.projectScope?.installed).toBe(true);
    expect(status.projectScope?.rule.configured).toBe(true);
    expect(status.plan.surfaces.mcp.effective).toBe('project');
    expect(status.plan.surfaces.mcp.risk).toBe('precedence-unverified');
    expect(status.plan.surfaces.hooks.risk).toBe('additive-duplicate');
    expect(status.dedupeReady).toBe(true);
    expect(status.trustRequired).toBe(true);
  });
});
