import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import {
  copilotProjectMcpConfigFile,
  copilotProjectToolnetHookFile,
  copilotToolnetProjectInstructionFile,
} from '../../src/session/copilot/config-paths.js';

import { installCopilotIntegration } from '../../src/session/copilot/installer.js';

import {
  COPILOT_TOOLNET_PROJECT_INSTRUCTION,
  installCopilotProjectInstruction,
} from '../../src/session/copilot/project-instruction-installer.js';

import { inspectCopilotScopedIntegrationStatus } from '../../src/session/copilot/scoped-status.js';

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

describe('GitHub Copilot CLI dual-scope integration', () => {
  test('project scope installs .github MCP, hooks and dedicated instruction only', () => {
    const project = tempRoot('toolnet-copilot-project-');
    const globalRoot = tempRoot('toolnet-copilot-global-unused-');

    mkdirSync(join(project, '.toolnet'), {
      recursive: true,
    });
    writeFileSync(join(project, '.toolnet', 'project.json'), '{}\n');

    const globalMcp = join(globalRoot, 'mcp-config.json');
    const globalHooks = join(globalRoot, 'hooks', 'toolnet-memory.json');

    const result = installCopilotIntegration({
      scope: 'project',
      projectRoot: project,
      configFile: globalMcp,
      hooksFile: globalHooks,
    });

    expect(result.installed).toBe(true);
    expect(result.scope).toBe('project');
    expect(existsSync(globalMcp)).toBe(false);
    expect(existsSync(globalHooks)).toBe(false);

    expect(existsSync(copilotProjectMcpConfigFile(project))).toBe(true);
    expect(existsSync(copilotProjectToolnetHookFile(project))).toBe(true);
    expect(existsSync(copilotToolnetProjectInstructionFile(project))).toBe(true);

    expect(readFileSync(copilotToolnetProjectInstructionFile(project), 'utf8')).toBe(
      COPILOT_TOOLNET_PROJECT_INSTRUCTION
    );
  });

  test('both preserves unrelated global/project MCP and hooks', () => {
    const project = tempRoot('toolnet-copilot-both-project-');
    const home = tempRoot('toolnet-copilot-both-home-');

    mkdirSync(join(project, '.toolnet'), {
      recursive: true,
    });
    writeFileSync(join(project, '.toolnet', 'project.json'), '{}\n');

    const globalMcp = join(home, '.copilot', 'mcp-config.json');
    const globalHooks = join(home, '.copilot', 'hooks', 'toolnet-memory.json');
    const projectMcp = copilotProjectMcpConfigFile(project);
    const projectHooks = copilotProjectToolnetHookFile(project);

    mkdirSync(join(home, '.copilot', 'hooks'), {
      recursive: true,
    });
    mkdirSync(join(project, '.github', 'hooks'), {
      recursive: true,
    });

    writeFileSync(
      globalMcp,
      JSON.stringify({
        mcpServers: {
          existingGlobal: {
            command: 'existing-global',
            args: [],
            tools: ['*'],
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
            tools: ['*'],
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

    const first = installCopilotIntegration({
      scope: 'both',
      projectRoot: project,
      configFile: globalMcp,
      hooksFile: globalHooks,
    });

    expect(first.installed).toBe(true);
    expect(first.changed).toBe(true);
    expect(first.plan.surfaces.mcp.risk).toBe('shadowed-global');
    expect(first.plan.surfaces.hooks.dedupeRequired).toBe(true);

    expect(json(globalMcp).mcpServers).toMatchObject({
      existingGlobal: {
        command: 'existing-global',
      },
      'toolnet-memory': {
        command: 'toolnet-memory',
        args: ['mcp'],
        tools: ['*'],
      },
    });

    expect(json(projectMcp).mcpServers).toMatchObject({
      existingProject: {
        command: 'existing-project',
      },
      'toolnet-memory': {
        command: 'toolnet-memory',
        args: ['mcp'],
        tools: ['*'],
      },
    });

    expect(JSON.stringify(json(globalHooks))).toContain('existing-global-hook');
    expect(JSON.stringify(json(projectHooks))).toContain('existing-project-hook');
    expect(JSON.stringify(json(globalHooks))).toContain('session:copilot-hook');
    expect(JSON.stringify(json(projectHooks))).toContain('session:copilot-hook');

    const second = installCopilotIntegration({
      scope: 'both',
      projectRoot: project,
      configFile: globalMcp,
      hooksFile: globalHooks,
    });

    expect(second.changed).toBe(false);
  });

  test('dedicated project instruction does not modify neighboring instructions', () => {
    const project = tempRoot('toolnet-copilot-instruction-');
    const instructions = join(project, '.github', 'instructions');
    const existing = join(instructions, 'existing.instructions.md');

    mkdirSync(instructions, {
      recursive: true,
    });

    writeFileSync(existing, 'existing copilot instruction\n');

    const first = installCopilotProjectInstruction({
      projectRoot: project,
    });

    const second = installCopilotProjectInstruction({
      projectRoot: project,
    });

    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);
    expect(readFileSync(existing, 'utf8')).toBe('existing copilot instruction\n');
  });

  test('scoped status reports project precedence and dedupe readiness', () => {
    const project = tempRoot('toolnet-copilot-status-project-');
    const home = tempRoot('toolnet-copilot-status-home-');

    mkdirSync(join(project, '.toolnet'), {
      recursive: true,
    });
    writeFileSync(join(project, '.toolnet', 'project.json'), '{}\n');

    const globalMcp = join(home, '.copilot', 'mcp-config.json');
    const globalHooks = join(home, '.copilot', 'hooks', 'toolnet-memory.json');

    installCopilotIntegration({
      scope: 'both',
      projectRoot: project,
      configFile: globalMcp,
      hooksFile: globalHooks,
    });

    const status = inspectCopilotScopedIntegrationStatus({
      scope: 'both',
      projectRoot: project,
      globalConfigFile: globalMcp,
      globalHooksFile: globalHooks,
    });

    expect(status.installed).toBe(true);
    expect(status.state).toBe('ready');
    expect(status.global?.installed).toBe(true);
    expect(status.projectScope?.installed).toBe(true);
    expect(status.projectScope?.instruction.configured).toBe(true);
    expect(status.plan.surfaces.mcp.effective).toBe('project');
    expect(status.plan.surfaces.mcp.risk).toBe('shadowed-global');
    expect(status.plan.surfaces.hooks.risk).toBe('additive-duplicate');
    expect(status.dedupeReady).toBe(true);
    expect(status.trustRequired).toBe(true);
  });

  test('warns without overwriting alternate repository .mcp.json ToolNet entry', () => {
    const project = tempRoot('toolnet-copilot-alternate-mcp-');
    const home = tempRoot('toolnet-copilot-alternate-home-');
    const alternate = join(project, '.mcp.json');

    mkdirSync(join(project, '.toolnet'), {
      recursive: true,
    });
    writeFileSync(join(project, '.toolnet', 'project.json'), '{}\n');

    writeFileSync(
      alternate,
      JSON.stringify({
        mcpServers: {
          'toolnet-memory': {
            command: 'custom-toolnet',
            args: ['mcp'],
          },
        },
      })
    );

    const before = readFileSync(alternate, 'utf8');

    const globalMcp = join(home, '.copilot', 'mcp-config.json');
    const globalHooks = join(home, '.copilot', 'hooks', 'toolnet-memory.json');

    installCopilotIntegration({
      scope: 'both',
      projectRoot: project,
      configFile: globalMcp,
      hooksFile: globalHooks,
    });

    const status = inspectCopilotScopedIntegrationStatus({
      scope: 'both',
      projectRoot: project,
      globalConfigFile: globalMcp,
      globalHooksFile: globalHooks,
    });

    expect(readFileSync(alternate, 'utf8')).toBe(before);
    expect(status.alternateProjectMcp?.toolnetDefined).toBe(true);
    expect(status.warnings.join('\n')).toContain('Alternate repository MCP file');
  });
});
