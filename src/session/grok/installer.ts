import {
  grokConfigFile,
  grokContinuitySkillFile,
  grokProjectConfigFile,
  grokProjectContinuitySkillFile,
  grokProjectToolnetHookFile,
  grokToolnetHookFile,
} from './config-paths.js';

import {
  installGrokContinuitySkill,
  type InstallGrokContinuitySkillResult,
} from './continuity-skill-installer.js';

import { installGrokHooks, type InstallGrokHooksResult } from './hook-installer.js';

import { installGrokMcp, type InstallGrokMcpResult } from './mcp-installer.js';

import {
  buildAgentScopePlan,
  resolveIntegrationProjectRoot,
  type AgentScopePlan,
  type IntegrationScope,
  type ProjectRootResolution,
} from '../integration-scope/index.js';

export interface InstallGrokIntegrationOptions {
  binary?: string;

  /**
   * Legacy/global overrides retained for existing callers/tests.
   */
  configFile?: string;
  hooksFile?: string;
  skillFile?: string;

  scope?: IntegrationScope;

  projectRoot?: string;

  projectConfigFile?: string;
  projectHooksFile?: string;
  projectSkillFile?: string;
}

export interface GrokScopeInstallation {
  mcp?: InstallGrokMcpResult;
  hooks?: InstallGrokHooksResult;
  skill?: InstallGrokContinuitySkillResult;
}

export interface InstallGrokIntegrationResult {
  installed: boolean;
  changed: boolean;
  scope: IntegrationScope;
  plan: AgentScopePlan;
  project?: ProjectRootResolution;
  global?: GrokScopeInstallation;
  projectScope?: GrokScopeInstallation;

  /**
   * Backward-compatible effective results.
   */
  mcp: InstallGrokMcpResult;
  hooks: InstallGrokHooksResult;
  skill: InstallGrokContinuitySkillResult;

  files: string[];
}

function changed(scope: GrokScopeInstallation | undefined): boolean {
  return Boolean(scope?.mcp?.changed || scope?.hooks?.changed || scope?.skill?.changed);
}

export function installGrokIntegration(
  options: InstallGrokIntegrationOptions = {}
): InstallGrokIntegrationResult {
  const binary = options.binary ?? process.env.TOOLNET_MEMORY_BIN ?? 'toolnet-memory';
  const scope = options.scope ?? 'global';

  const project =
    scope === 'global'
      ? undefined
      : resolveIntegrationProjectRoot({
          project: options.projectRoot,
        });

  const plan = buildAgentScopePlan({
    agent: 'grok',
    scope,
    project,
  });

  if (!plan.canInstall) {
    throw new Error(plan.reason ?? 'Grok project integration scope cannot be resolved.');
  }

  let global: GrokScopeInstallation | undefined;
  let projectScope: GrokScopeInstallation | undefined;

  if (
    plan.surfaces.mcp.global.install ||
    plan.surfaces.hooks.global.install ||
    plan.surfaces.work.global.install
  ) {
    global = {};

    if (plan.surfaces.mcp.global.install) {
      global.mcp = installGrokMcp({
        binary,
        configFile: options.configFile ?? grokConfigFile(),
      });
    }

    if (plan.surfaces.hooks.global.install) {
      global.hooks = installGrokHooks({
        binary,
        hooksFile: options.hooksFile ?? grokToolnetHookFile(),
      });
    }

    if (plan.surfaces.work.global.install) {
      global.skill = installGrokContinuitySkill({
        skillFile: options.skillFile ?? grokContinuitySkillFile(),
      });
    }
  }

  if (
    plan.surfaces.mcp.project.install ||
    plan.surfaces.hooks.project.install ||
    plan.surfaces.work.project.install
  ) {
    if (!project?.eligible) {
      throw new Error('Grok project integration requires an eligible project root.');
    }

    projectScope = {};

    if (plan.surfaces.mcp.project.install) {
      projectScope.mcp = installGrokMcp({
        binary,
        configFile: options.projectConfigFile ?? grokProjectConfigFile(project.root),
      });
    }

    if (plan.surfaces.hooks.project.install) {
      projectScope.hooks = installGrokHooks({
        binary,
        hooksFile: options.projectHooksFile ?? grokProjectToolnetHookFile(project.root),
      });
    }

    if (plan.surfaces.work.project.install) {
      projectScope.skill = installGrokContinuitySkill({
        skillFile: options.projectSkillFile ?? grokProjectContinuitySkillFile(project.root),
      });
    }
  }

  const effectiveMcp = projectScope?.mcp ?? global?.mcp;
  const effectiveHooks = projectScope?.hooks ?? global?.hooks;
  const effectiveSkill = projectScope?.skill ?? global?.skill;

  if (!effectiveMcp || !effectiveHooks || !effectiveSkill) {
    throw new Error('Grok integration did not produce effective MCP/hooks/skill.');
  }

  const files = Array.from(
    new Set(
      [
        global?.mcp?.configFile,
        global?.hooks?.hooksFile,
        global?.skill?.skillFile,
        projectScope?.mcp?.configFile,
        projectScope?.hooks?.hooksFile,
        projectScope?.skill?.skillFile,
      ].filter((value): value is string => typeof value === 'string')
    )
  );

  return {
    installed: true,
    changed: changed(global) || changed(projectScope),
    scope,
    plan,
    project,
    global,
    projectScope,
    mcp: effectiveMcp,
    hooks: effectiveHooks,
    skill: effectiveSkill,
    files,
  };
}
