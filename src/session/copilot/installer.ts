import {
  copilotMcpConfigFile,
  copilotProjectMcpConfigFile,
  copilotProjectToolnetHookFile,
  copilotToolnetHookFile,
} from './config-paths.js';

import { installCopilotHooks, type InstallCopilotHooksResult } from './hook-installer.js';

import { installCopilotMcp, type InstallCopilotMcpResult } from './mcp-installer.js';

import {
  installCopilotProjectInstruction,
  type InstallCopilotProjectInstructionResult,
} from './project-instruction-installer.js';

import {
  buildAgentScopePlan,
  resolveIntegrationProjectRoot,
  type AgentScopePlan,
  type IntegrationScope,
  type ProjectRootResolution,
} from '../integration-scope/index.js';

export interface InstallCopilotIntegrationOptions {
  binary?: string;

  /**
   * Legacy/global override retained for existing tests/callers.
   */
  configFile?: string;

  /**
   * Legacy/global override retained for existing tests/callers.
   */
  hooksFile?: string;

  scope?: IntegrationScope;

  projectRoot?: string;

  projectConfigFile?: string;

  projectHooksFile?: string;

  projectInstructionFile?: string;
}

export interface CopilotScopeInstallation {
  mcp?: InstallCopilotMcpResult;
  hooks?: InstallCopilotHooksResult;
  instruction?: InstallCopilotProjectInstructionResult;
}

export interface InstallCopilotIntegrationResult {
  installed: boolean;
  changed: boolean;
  scope: IntegrationScope;
  plan: AgentScopePlan;
  project?: ProjectRootResolution;
  global?: CopilotScopeInstallation;
  projectScope?: CopilotScopeInstallation;

  /**
   * Backward-compatible effective result.
   */
  mcp: InstallCopilotMcpResult;
  hooks: InstallCopilotHooksResult;

  instruction?: InstallCopilotProjectInstructionResult;

  files: string[];
}

function changed(scope: CopilotScopeInstallation | undefined): boolean {
  return Boolean(scope?.mcp?.changed || scope?.hooks?.changed || scope?.instruction?.changed);
}

export function installCopilotIntegration(
  options: InstallCopilotIntegrationOptions = {}
): InstallCopilotIntegrationResult {
  const binary = options.binary ?? process.env.TOOLNET_MEMORY_BIN ?? 'toolnet-memory';
  const scope = options.scope ?? 'global';

  const project =
    scope === 'global'
      ? undefined
      : resolveIntegrationProjectRoot({
          project: options.projectRoot,
        });

  const plan = buildAgentScopePlan({
    agent: 'copilot',
    scope,
    project,
  });

  if (!plan.canInstall) {
    throw new Error(plan.reason ?? 'Copilot project integration scope cannot be resolved.');
  }

  let global: CopilotScopeInstallation | undefined;
  let projectScope: CopilotScopeInstallation | undefined;

  if (
    plan.surfaces.mcp.global.install ||
    plan.surfaces.hooks.global.install ||
    plan.surfaces.work.global.install
  ) {
    global = {};

    if (plan.surfaces.mcp.global.install) {
      global.mcp = installCopilotMcp({
        binary,
        configFile: options.configFile ?? copilotMcpConfigFile(),
      });
    }

    if (plan.surfaces.hooks.global.install) {
      global.hooks = installCopilotHooks({
        binary,
        hooksFile: options.hooksFile ?? copilotToolnetHookFile(),
      });
    }
  }

  if (
    plan.surfaces.mcp.project.install ||
    plan.surfaces.hooks.project.install ||
    plan.surfaces.work.project.install
  ) {
    if (!project?.eligible) {
      throw new Error('Copilot project integration requires an eligible project root.');
    }

    projectScope = {};

    if (plan.surfaces.mcp.project.install) {
      projectScope.mcp = installCopilotMcp({
        binary,
        configFile: options.projectConfigFile ?? copilotProjectMcpConfigFile(project.root),
      });
    }

    if (plan.surfaces.hooks.project.install) {
      projectScope.hooks = installCopilotHooks({
        binary,
        hooksFile: options.projectHooksFile ?? copilotProjectToolnetHookFile(project.root),
      });
    }

    if (plan.surfaces.work.project.install) {
      projectScope.instruction = installCopilotProjectInstruction({
        projectRoot: project.root,
        instructionFile: options.projectInstructionFile,
      });
    }
  }

  const effectiveMcp = projectScope?.mcp ?? global?.mcp;
  const effectiveHooks = projectScope?.hooks ?? global?.hooks;

  if (!effectiveMcp || !effectiveHooks) {
    throw new Error('Copilot integration did not produce effective MCP/hooks.');
  }

  const files = Array.from(
    new Set(
      [
        global?.mcp?.configFile,
        global?.hooks?.hooksFile,
        global?.instruction?.instructionFile,
        projectScope?.mcp?.configFile,
        projectScope?.hooks?.hooksFile,
        projectScope?.instruction?.instructionFile,
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
    instruction: projectScope?.instruction,
    files,
  };
}
