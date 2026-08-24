import {
  cursorHooksFile,
  cursorMcpConfigFile,
  cursorProjectHooksFile,
  cursorProjectMcpConfigFile,
} from './config-paths.js';

import { installCursorHooks, type InstallCursorHooksResult } from './hook-installer.js';

import { installCursorMcp, type InstallCursorMcpResult } from './mcp-installer.js';

import {
  installCursorProjectRule,
  type InstallCursorProjectRuleResult,
} from './project-rule-installer.js';

import {
  buildAgentScopePlan,
  resolveIntegrationProjectRoot,
  type AgentScopePlan,
  type IntegrationScope,
  type ProjectRootResolution,
} from '../integration-scope/index.js';

export interface InstallCursorIntegrationOptions {
  binary?: string;

  /**
   * Legacy/global override retained for existing callers/tests.
   */
  configFile?: string;

  /**
   * Legacy/global override retained for existing callers/tests.
   */
  hooksFile?: string;

  scope?: IntegrationScope;

  projectRoot?: string;

  projectConfigFile?: string;

  projectHooksFile?: string;

  projectRuleFile?: string;
}

export interface CursorScopeInstallation {
  mcp?: InstallCursorMcpResult;
  hooks?: InstallCursorHooksResult;
  rule?: InstallCursorProjectRuleResult;
}

export interface InstallCursorIntegrationResult {
  installed: boolean;
  changed: boolean;
  scope: IntegrationScope;
  plan: AgentScopePlan;
  project?: ProjectRootResolution;
  global?: CursorScopeInstallation;
  projectScope?: CursorScopeInstallation;

  /**
   * Backward-compatible effective result.
   */
  mcp: InstallCursorMcpResult;
  hooks: InstallCursorHooksResult;

  rule?: InstallCursorProjectRuleResult;

  files: string[];
}

function changed(scope: CursorScopeInstallation | undefined): boolean {
  return Boolean(scope?.mcp?.changed || scope?.hooks?.changed || scope?.rule?.changed);
}

export function installCursorIntegration(
  options: InstallCursorIntegrationOptions = {}
): InstallCursorIntegrationResult {
  const binary = options.binary ?? process.env.TOOLNET_MEMORY_BIN ?? 'toolnet-memory';
  const scope = options.scope ?? 'global';

  const project =
    scope === 'global'
      ? undefined
      : resolveIntegrationProjectRoot({
          project: options.projectRoot,
        });

  const plan = buildAgentScopePlan({
    agent: 'cursor',
    scope,
    project,
  });

  if (!plan.canInstall) {
    throw new Error(plan.reason ?? 'Cursor project integration scope cannot be resolved.');
  }

  let global: CursorScopeInstallation | undefined;
  let projectScope: CursorScopeInstallation | undefined;

  if (
    plan.surfaces.mcp.global.install ||
    plan.surfaces.hooks.global.install ||
    plan.surfaces.work.global.install
  ) {
    global = {};

    if (plan.surfaces.mcp.global.install) {
      global.mcp = installCursorMcp({
        binary,
        configFile: options.configFile ?? cursorMcpConfigFile(),
      });
    }

    if (plan.surfaces.hooks.global.install) {
      global.hooks = installCursorHooks({
        binary,
        hooksFile: options.hooksFile ?? cursorHooksFile(),
      });
    }
  }

  if (
    plan.surfaces.mcp.project.install ||
    plan.surfaces.hooks.project.install ||
    plan.surfaces.work.project.install
  ) {
    if (!project?.eligible) {
      throw new Error('Cursor project integration requires an eligible project root.');
    }

    projectScope = {};

    if (plan.surfaces.mcp.project.install) {
      projectScope.mcp = installCursorMcp({
        binary,
        configFile: options.projectConfigFile ?? cursorProjectMcpConfigFile(project.root),
      });
    }

    if (plan.surfaces.hooks.project.install) {
      projectScope.hooks = installCursorHooks({
        binary,
        hooksFile: options.projectHooksFile ?? cursorProjectHooksFile(project.root),
      });
    }

    if (plan.surfaces.work.project.install) {
      projectScope.rule = installCursorProjectRule({
        projectRoot: project.root,
        ruleFile: options.projectRuleFile,
      });
    }
  }

  const effectiveMcp = projectScope?.mcp ?? global?.mcp;
  const effectiveHooks = projectScope?.hooks ?? global?.hooks;

  if (!effectiveMcp || !effectiveHooks) {
    throw new Error('Cursor integration did not produce an effective MCP/hooks installation.');
  }

  const files = Array.from(
    new Set(
      [
        global?.mcp?.configFile,
        global?.hooks?.hooksFile,
        global?.rule?.ruleFile,
        projectScope?.mcp?.configFile,
        projectScope?.hooks?.hooksFile,
        projectScope?.rule?.ruleFile,
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
    rule: projectScope?.rule,
    files,
  };
}
