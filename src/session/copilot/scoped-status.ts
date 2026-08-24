import { existsSync, readFileSync } from 'node:fs';

import {
  copilotAlternateProjectMcpConfigFile,
  copilotMcpConfigFile,
  copilotProjectMcpConfigFile,
  copilotProjectToolnetHookFile,
  copilotToolnetHookFile,
  copilotToolnetProjectInstructionFile,
} from './config-paths.js';

import { COPILOT_TOOLNET_PROJECT_INSTRUCTION } from './project-instruction-installer.js';

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

type JsonObject = Record<string, unknown>;

export interface InspectCopilotScopedStatusOptions {
  scope?: IntegrationScope;
  projectRoot?: string;
  globalConfigFile?: string;
  globalHooksFile?: string;
  projectConfigFile?: string;
  projectHooksFile?: string;
  projectInstructionFile?: string;
}

export interface CopilotProjectInstructionStatus {
  configured: boolean;
  instructionFile: string;
}

export interface CopilotScopedIntegrationStatus {
  installed: boolean;
  state: 'ready' | 'partial' | 'not-installed' | 'invalid';
  requestedScope: IntegrationScope;
  plan: AgentScopePlan;
  project?: ProjectRootResolution;
  global?: NewAgentIntegrationStatus;
  projectScope?: NewAgentIntegrationStatus & {
    instruction: CopilotProjectInstructionStatus;
  };
  dedupeReady: boolean;
  trustRequired: boolean;
  alternateProjectMcp: {
    file: string;
    toolnetDefined: boolean;
  } | null;
  warnings: string[];
}

function instructionStatus(file: string): CopilotProjectInstructionStatus {
  let configured = false;

  try {
    configured = readFileSync(file, 'utf8') === COPILOT_TOOLNET_PROJECT_INSTRUCTION;
  } catch {
    configured = false;
  }

  return {
    configured,
    instructionFile: file,
  };
}

function alternateProjectMcpStatus(
  projectRoot: string
): CopilotScopedIntegrationStatus['alternateProjectMcp'] {
  const file = copilotAlternateProjectMcpConfigFile(projectRoot);

  if (!existsSync(file)) {
    return {
      file,
      toolnetDefined: false,
    };
  }

  try {
    const root = JSON.parse(readFileSync(file, 'utf8')) as JsonObject;
    const servers =
      root.mcpServers && typeof root.mcpServers === 'object' && !Array.isArray(root.mcpServers)
        ? (root.mcpServers as JsonObject)
        : {};

    return {
      file,
      toolnetDefined: servers['toolnet-memory'] !== undefined || servers.toolnet !== undefined,
    };
  } catch {
    return {
      file,
      toolnetDefined: false,
    };
  }
}

function aggregateState(
  installed: boolean,
  statuses: Array<NewAgentIntegrationStatus | undefined>,
  instruction?: CopilotProjectInstructionStatus
): CopilotScopedIntegrationStatus['state'] {
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
    ) || Boolean(instruction && existsSync(instruction.instructionFile));

  return any ? 'partial' : 'not-installed';
}

export function inspectCopilotScopedIntegrationStatus(
  options: InspectCopilotScopedStatusOptions = {}
): CopilotScopedIntegrationStatus {
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

  const global =
    scope === 'global' || scope === 'both'
      ? inspectNewAgentIntegrationStatus('copilot', {
          configFile: options.globalConfigFile ?? copilotMcpConfigFile(),
          hooksFile: options.globalHooksFile ?? copilotToolnetHookFile(),
        })
      : undefined;

  let projectScope:
    | (NewAgentIntegrationStatus & {
        instruction: CopilotProjectInstructionStatus;
      })
    | undefined;

  if ((scope === 'project' || scope === 'both') && project?.eligible) {
    const instruction = instructionStatus(
      options.projectInstructionFile ?? copilotToolnetProjectInstructionFile(project.root)
    );

    projectScope = {
      ...inspectNewAgentIntegrationStatus('copilot', {
        configFile: options.projectConfigFile ?? copilotProjectMcpConfigFile(project.root),
        hooksFile: options.projectHooksFile ?? copilotProjectToolnetHookFile(project.root),
      }),
      instruction,
    };
  }

  const globalReady = scope === 'project' ? true : global?.installed === true;

  const projectReady =
    scope === 'global'
      ? true
      : projectScope?.installed === true && projectScope.instruction.configured === true;

  const installed = plan.canInstall && globalReady && projectReady;

  const alternateProjectMcp = project?.eligible ? alternateProjectMcpStatus(project.root) : null;

  const warnings: string[] = [];

  if (!plan.canInstall && plan.reason) {
    warnings.push(plan.reason);
  }

  if (scope === 'both') {
    warnings.push(
      'Global + project Copilot hooks are additive; ToolNet cross-process dedupe is enabled.'
    );

    warnings.push(
      'Project toolnet-memory MCP shadows the same-name global definition inside this repository.'
    );
  }

  if (alternateProjectMcp?.toolnetDefined) {
    warnings.push(
      `Alternate repository MCP file also defines ToolNet: ${alternateProjectMcp.file}`
    );
  }

  return {
    installed,
    state: aggregateState(installed, [global, projectScope], projectScope?.instruction),
    requestedScope: scope,
    plan,
    project,
    global,
    projectScope,
    dedupeReady: true,
    trustRequired: scope === 'project' || scope === 'both',
    alternateProjectMcp,
    warnings,
  };
}
