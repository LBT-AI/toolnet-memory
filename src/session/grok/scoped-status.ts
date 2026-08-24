import { existsSync } from 'node:fs';

import {
  grokConfigFile,
  grokContinuitySkillFile,
  grokProjectConfigFile,
  grokProjectContinuitySkillFile,
  grokProjectToolnetHookFile,
  grokToolnetHookFile,
} from './config-paths.js';

import {
  buildAgentScopePlan,
  resolveIntegrationProjectRoot,
  type AgentScopePlan,
  type IntegrationScope,
  type ProjectRootResolution,
} from '../integration-scope/index.js';

import {
  inspectNewAgentIntegrationStatus,
  type NewAgentIntegrationStatus,
} from '../new-agents/status.js';

export interface InspectGrokScopedStatusOptions {
  scope?: IntegrationScope;
  projectRoot?: string;

  globalConfigFile?: string;
  globalHooksFile?: string;
  globalSkillFile?: string;

  projectConfigFile?: string;
  projectHooksFile?: string;
  projectSkillFile?: string;
}

export interface GrokScopedIntegrationStatus {
  installed: boolean;
  state: 'ready' | 'partial' | 'not-installed' | 'invalid';
  requestedScope: IntegrationScope;
  plan: AgentScopePlan;
  project?: ProjectRootResolution;

  global?: NewAgentIntegrationStatus;
  projectScope?: NewAgentIntegrationStatus;

  effective: {
    mcp: 'global' | 'project' | 'none';
    hooks: 'global' | 'project' | 'both' | 'none';
    skill: 'global' | 'project' | 'none';
  };

  dedupeReady: boolean;
  trustRequired: boolean;
  warnings: string[];
}

function aggregateState(
  installed: boolean,
  statuses: Array<NewAgentIntegrationStatus | undefined>
): GrokScopedIntegrationStatus['state'] {
  if (statuses.some((status) => status?.state === 'invalid')) {
    return 'invalid';
  }

  if (installed) {
    return 'ready';
  }

  const any = statuses.some(
    (status) =>
      status &&
      (status.state === 'partial' ||
        status.state === 'ready' ||
        existsSync(status.mcp.configFile) ||
        existsSync(status.hooks.hooksFile) ||
        Boolean(status.skill && existsSync(status.skill.skillFile)))
  );

  return any ? 'partial' : 'not-installed';
}

export function inspectGrokScopedIntegrationStatus(
  options: InspectGrokScopedStatusOptions = {}
): GrokScopedIntegrationStatus {
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

  const global =
    scope === 'global' || scope === 'both'
      ? inspectNewAgentIntegrationStatus('grok', {
          configFile: options.globalConfigFile ?? grokConfigFile(),
          hooksFile: options.globalHooksFile ?? grokToolnetHookFile(),
          skillFile: options.globalSkillFile ?? grokContinuitySkillFile(),
        })
      : undefined;

  const projectScope =
    (scope === 'project' || scope === 'both') && project?.eligible
      ? inspectNewAgentIntegrationStatus('grok', {
          configFile: options.projectConfigFile ?? grokProjectConfigFile(project.root),
          hooksFile: options.projectHooksFile ?? grokProjectToolnetHookFile(project.root),
          skillFile: options.projectSkillFile ?? grokProjectContinuitySkillFile(project.root),
        })
      : undefined;

  const globalReady = scope === 'project' ? true : global?.installed === true;
  const projectReady = scope === 'global' ? true : projectScope?.installed === true;

  const installed = plan.canInstall && globalReady && projectReady;

  const warnings: string[] = [];

  if (!plan.canInstall && plan.reason) {
    warnings.push(plan.reason);
  }

  if (scope === 'both') {
    warnings.push(
      'Global + project Grok hooks are layered; ToolNet cross-process dedupe is enabled.'
    );

    warnings.push(
      'Project [mcp_servers."toolnet-memory"] fully replaces the same-name global server inside this project.'
    );

    warnings.push(
      'Project toolnet-continuity skill shadows the same-name global skill inside this project.'
    );
  }

  return {
    installed,
    state: aggregateState(installed, [global, projectScope]),
    requestedScope: scope,
    plan,
    project,
    global,
    projectScope,
    effective: {
      mcp:
        plan.surfaces.mcp.effective === 'project'
          ? 'project'
          : plan.surfaces.mcp.effective === 'global'
            ? 'global'
            : 'none',
      hooks:
        plan.surfaces.hooks.effective === 'both'
          ? 'both'
          : plan.surfaces.hooks.effective === 'project'
            ? 'project'
            : plan.surfaces.hooks.effective === 'global'
              ? 'global'
              : 'none',
      skill:
        plan.surfaces.work.effective === 'project'
          ? 'project'
          : plan.surfaces.work.effective === 'global'
            ? 'global'
            : 'none',
    },
    dedupeReady: true,
    trustRequired: scope === 'project' || scope === 'both',
    warnings,
  };
}
