import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import {
  grokProjectConfigFile,
  grokProjectContinuitySkillFile,
  grokProjectToolnetHookFile,
} from '../../src/session/grok/config-paths.js';

import { installGrokContinuitySkill } from '../../src/session/grok/continuity-skill-installer.js';

import { installGrokIntegration } from '../../src/session/grok/installer.js';

import { inspectGrokScopedIntegrationStatus } from '../../src/session/grok/scoped-status.js';

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

describe('Grok Build dual-scope integration', () => {
  test('project scope installs project TOML MCP, hooks and continuity skill only', () => {
    const project = tempRoot('toolnet-grok-project-');
    const globalRoot = tempRoot('toolnet-grok-global-unused-');

    mkdirSync(join(project, '.toolnet'), {
      recursive: true,
    });
    writeFileSync(join(project, '.toolnet', 'project.json'), '{}\n');

    const globalConfig = join(globalRoot, 'config.toml');
    const globalHooks = join(globalRoot, 'hooks', 'toolnet-memory.json');
    const globalSkill = join(globalRoot, 'skills', 'toolnet-continuity', 'SKILL.md');

    const result = installGrokIntegration({
      scope: 'project',
      projectRoot: project,
      configFile: globalConfig,
      hooksFile: globalHooks,
      skillFile: globalSkill,
    });

    expect(result.installed).toBe(true);
    expect(result.scope).toBe('project');

    expect(existsSync(globalConfig)).toBe(false);
    expect(existsSync(globalHooks)).toBe(false);
    expect(existsSync(globalSkill)).toBe(false);

    expect(existsSync(grokProjectConfigFile(project))).toBe(true);
    expect(existsSync(grokProjectToolnetHookFile(project))).toBe(true);
    expect(existsSync(grokProjectContinuitySkillFile(project))).toBe(true);

    expect(readFileSync(grokProjectConfigFile(project), 'utf8')).toContain(
      '[mcp_servers."toolnet-memory"]'
    );
    expect(readFileSync(grokProjectContinuitySkillFile(project), 'utf8')).toContain(
      'memory_agent_ask'
    );
  });

  test('both preserves unrelated global/project TOML and hook content', () => {
    const project = tempRoot('toolnet-grok-both-project-');
    const home = tempRoot('toolnet-grok-both-home-');

    mkdirSync(join(project, '.toolnet'), {
      recursive: true,
    });
    writeFileSync(join(project, '.toolnet', 'project.json'), '{}\n');

    const globalConfig = join(home, '.grok', 'config.toml');
    const globalHooks = join(home, '.grok', 'hooks', 'toolnet-memory.json');
    const globalSkill = join(home, '.grok', 'skills', 'toolnet-continuity', 'SKILL.md');

    const projectConfig = grokProjectConfigFile(project);
    const projectHooks = grokProjectToolnetHookFile(project);

    mkdirSync(join(home, '.grok', 'hooks'), {
      recursive: true,
    });
    mkdirSync(join(project, '.grok', 'hooks'), {
      recursive: true,
    });

    writeFileSync(
      globalConfig,
      '[ui]\ntheme = "dark"\n\n[mcp_servers."existing-global"]\ncommand = "existing-global"\n'
    );

    writeFileSync(
      projectConfig,
      '[project]\nname = "demo"\n\n[mcp_servers."existing-project"]\ncommand = "existing-project"\n'
    );

    writeFileSync(
      globalHooks,
      JSON.stringify({
        hooks: {
          SessionStart: [
            {
              hooks: [
                {
                  type: 'command',
                  command: 'existing-global-hook',
                },
              ],
            },
          ],
        },
      })
    );

    writeFileSync(
      projectHooks,
      JSON.stringify({
        hooks: {
          SessionStart: [
            {
              hooks: [
                {
                  type: 'command',
                  command: 'existing-project-hook',
                },
              ],
            },
          ],
        },
      })
    );

    const first = installGrokIntegration({
      scope: 'both',
      projectRoot: project,
      configFile: globalConfig,
      hooksFile: globalHooks,
      skillFile: globalSkill,
    });

    expect(first.installed).toBe(true);
    expect(first.changed).toBe(true);
    expect(first.plan.surfaces.mcp.risk).toBe('shadowed-global');
    expect(first.plan.surfaces.hooks.dedupeRequired).toBe(true);
    expect(first.plan.surfaces.work.risk).toBe('shadowed-global');

    const globalToml = readFileSync(globalConfig, 'utf8');
    const projectToml = readFileSync(projectConfig, 'utf8');

    expect(globalToml).toContain('[ui]');
    expect(globalToml).toContain('[mcp_servers."existing-global"]');
    expect(globalToml).toContain('[mcp_servers."toolnet-memory"]');

    expect(projectToml).toContain('[project]');
    expect(projectToml).toContain('[mcp_servers."existing-project"]');
    expect(projectToml).toContain('[mcp_servers."toolnet-memory"]');

    expect(readFileSync(globalHooks, 'utf8')).toContain('existing-global-hook');
    expect(readFileSync(projectHooks, 'utf8')).toContain('existing-project-hook');
    expect(readFileSync(globalHooks, 'utf8')).toContain('session:grok-hook');
    expect(readFileSync(projectHooks, 'utf8')).toContain('session:grok-hook');

    const second = installGrokIntegration({
      scope: 'both',
      projectRoot: project,
      configFile: globalConfig,
      hooksFile: globalHooks,
      skillFile: globalSkill,
    });

    expect(second.changed).toBe(false);
  });

  test('project continuity skill is dedicated and preserves neighboring skills', () => {
    const project = tempRoot('toolnet-grok-skill-');
    const other = join(project, '.grok', 'skills', 'other-skill', 'SKILL.md');

    mkdirSync(join(project, '.grok', 'skills', 'other-skill'), {
      recursive: true,
    });

    writeFileSync(other, '# Existing Grok Skill\n');

    const skillFile = grokProjectContinuitySkillFile(project);

    const first = installGrokContinuitySkill({
      skillFile,
    });

    const second = installGrokContinuitySkill({
      skillFile,
    });

    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);
    expect(readFileSync(other, 'utf8')).toBe('# Existing Grok Skill\n');
    expect(readFileSync(skillFile, 'utf8')).toContain('toolnet-continuity');
  });

  test('scoped status reports project MCP and skill precedence plus dedupe readiness', () => {
    const project = tempRoot('toolnet-grok-status-project-');
    const home = tempRoot('toolnet-grok-status-home-');

    mkdirSync(join(project, '.toolnet'), {
      recursive: true,
    });
    writeFileSync(join(project, '.toolnet', 'project.json'), '{}\n');

    const globalConfig = join(home, '.grok', 'config.toml');
    const globalHooks = join(home, '.grok', 'hooks', 'toolnet-memory.json');
    const globalSkill = join(home, '.grok', 'skills', 'toolnet-continuity', 'SKILL.md');

    installGrokIntegration({
      scope: 'both',
      projectRoot: project,
      configFile: globalConfig,
      hooksFile: globalHooks,
      skillFile: globalSkill,
    });

    const status = inspectGrokScopedIntegrationStatus({
      scope: 'both',
      projectRoot: project,
      globalConfigFile: globalConfig,
      globalHooksFile: globalHooks,
      globalSkillFile: globalSkill,
    });

    expect(status.installed).toBe(true);
    expect(status.state).toBe('ready');
    expect(status.global?.installed).toBe(true);
    expect(status.projectScope?.installed).toBe(true);
    expect(status.plan.surfaces.mcp.effective).toBe('project');
    expect(status.plan.surfaces.mcp.risk).toBe('shadowed-global');
    expect(status.plan.surfaces.hooks.effective).toBe('both');
    expect(status.plan.surfaces.hooks.risk).toBe('additive-duplicate');
    expect(status.plan.surfaces.work.effective).toBe('project');
    expect(status.plan.surfaces.work.risk).toBe('shadowed-global');
    expect(status.effective.mcp).toBe('project');
    expect(status.effective.hooks).toBe('both');
    expect(status.effective.skill).toBe('project');
    expect(status.dedupeReady).toBe(true);
    expect(status.trustRequired).toBe(true);
  });
});
