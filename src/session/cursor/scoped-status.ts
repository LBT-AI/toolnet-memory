import { existsSync, readFileSync } from 'node:fs';

import {
  cursorHooksFile,
  cursorMcpConfigFile,
  cursorProjectHooksFile,
  cursorProjectMcpConfigFile,
  cursorToolnetProjectRuleFile,
} from './config-paths.js';

import { CURSOR_TOOLNET_PROJECT_RULE } from './project-rule-installer.js';

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

export interface InspectCursorScopedStatusOptions {
  scope?: IntegrationScope;
  projectRoot?: string;
  globalConfigFile?: string;
  globalHooksFile?: string;
  projectConfigFile?: string;
  projectHooksFile?: string;
  projectRuleFile?: string;
}

export interface CursorProjectRuleStatus {
  configured: boolean;
  ruleFile: string;
}

export interface CursorScopedIntegrationStatus {
  installed: boolean;
  state: 'ready' | 'partial' | 'not-installed' | 'invalid';
  requestedScope: IntegrationScope;
  plan: AgentScopePlan;
  project?: ProjectRootResolution;
  global?: NewAgentIntegrationStatus;
  projectScope?: NewAgentIntegrationStatus & {
    rule: CursorProjectRuleStatus;
  };
  dedupeReady: boolean;
  trustRequired: boolean;
  warnings: string[];
}

function ruleStatus(file: string): CursorProjectRuleStatus {
  let configured = false;

  try {
    configured = readFileSync(file, 'utf8') === CURSOR_TOOLNET_PROJECT_RULE;
  } catch {
    configured = false;
  }

  return {
    configured,
    ruleFile: file,
  };
}

function aggregateState(
  installed: boolean,
  statuses: Array<NewAgentIntegrationStatus | undefined>,
  rule?: CursorProjectRuleStatus
): CursorScopedIntegrationStatus['state'] {
  if (statuses.some((status) => status?.state === 'invalid')) {
    return 'invalid';
  }

  if (installed) {
    return 'ready';
  }

  const any =
    statuses.some(
      (status) =>
        status &&
        (status.state === 'partial' ||
          status.state === 'ready' ||
          existsSync(status.mcp.configFile) ||
          existsSync(status.hooks.hooksFile))
    ) || Boolean(rule && existsSync(rule.ruleFile));

  return any ? 'partial' : 'not-installed';
}

export function inspectCursorScopedIntegrationStatus(
  options: InspectCursorScopedStatusOptions = {}
): CursorScopedIntegrationStatus {
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

  const global =
    scope === 'global' || scope === 'both'
      ? inspectNewAgentIntegrationStatus('cursor', {
          configFile: options.globalConfigFile ?? cursorMcpConfigFile(),
          hooksFile: options.globalHooksFile ?? cursorHooksFile(),
        })
      : undefined;

  let projectScope:
    | (NewAgentIntegrationStatus & {
        rule: CursorProjectRuleStatus;
      })
    | undefined;

  if ((scope === 'project' || scope === 'both') && project?.eligible) {
    const rule = ruleStatus(options.projectRuleFile ?? cursorToolnetProjectRuleFile(project.root));

    projectScope = {
      ...inspectNewAgentIntegrationStatus('cursor', {
        configFile: options.projectConfigFile ?? cursorProjectMcpConfigFile(project.root),
        hooksFile: options.projectHooksFile ?? cursorProjectHooksFile(project.root),
      }),
      rule,
    };
  }

  const globalReady = scope === 'project' ? true : global?.installed === true;

  const projectReady =
    scope === 'global'
      ? true
      : projectScope?.installed === true && projectScope.rule.configured === true;

  const installed = plan.canInstall && globalReady && projectReady;

  const warnings: string[] = [];

  if (!plan.canInstall && plan.reason) {
    warnings.push(plan.reason);
  }

  if (scope === 'both') {
    warnings.push(
      'Global + project Cursor hooks are additive; ToolNet runtime dedupe is required and enabled.'
    );

    warnings.push(
      'Cursor same-name global/project MCP precedence remains marked for native E2E certification.'
    );
  }

  return {
    installed,
    state: aggregateState(installed, [global, projectScope], projectScope?.rule),
    requestedScope: scope,
    plan,
    project,
    global,
    projectScope,
    dedupeReady: true,
    trustRequired: scope === 'project' || scope === 'both',
    warnings,
  };
}
