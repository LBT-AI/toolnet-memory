import type {
  AgentScopePlan,
  EffectiveScope,
  IntegrationScope,
  IntegrationSurface,
  ProjectRootResolution,
  ScopeRisk,
  ScopedAgent,
  SurfaceScopePlan,
} from './types.js';

export interface ParseScopeOptions {
  defaultScope?: IntegrationScope;
}

export interface BuildScopePlanOptions {
  agent: ScopedAgent;
  scope: IntegrationScope;
  project?: ProjectRootResolution;
}

export function parseIntegrationScope(
  args: string[],
  options: ParseScopeOptions = {}
): IntegrationScope {
  const explicit: IntegrationScope[] = [];

  const scopeIndex = args.indexOf('--scope');

  if (scopeIndex >= 0) {
    const value = args[scopeIndex + 1];

    if (value !== 'global' && value !== 'project' && value !== 'both') {
      throw new Error(`Invalid --scope value: ${String(value)}`);
    }

    explicit.push(value);
  }

  if (args.includes('--global')) {
    explicit.push('global');
  }

  if (args.includes('--both')) {
    explicit.push('both');
  }

  const unique = Array.from(new Set(explicit));

  if (unique.length > 1) {
    throw new Error(`Conflicting integration scopes: ${unique.join(', ')}`);
  }

  return unique[0] ?? options.defaultScope ?? 'global';
}

function target(install: boolean, effective: boolean) {
  return {
    install,
    effective,
  };
}

function plan(
  surface: IntegrationSurface,
  input: {
    globalInstall: boolean;
    projectInstall: boolean;
    effective: EffectiveScope;
    risk?: ScopeRisk;
    dedupeRequired?: boolean;
    trustRequired?: boolean;
    note?: string;
  }
): SurfaceScopePlan {
  return {
    surface,
    global: target(input.globalInstall, input.effective === 'global' || input.effective === 'both'),
    project: target(
      input.projectInstall,
      input.effective === 'project' || input.effective === 'both'
    ),
    effective: input.effective,
    risk: input.risk ?? 'none',
    dedupeRequired: input.dedupeRequired ?? false,
    trustRequired: input.trustRequired ?? input.projectInstall,
    note: input.note,
  };
}

function globalPlan(agent: ScopedAgent): AgentScopePlan['surfaces'] {
  return {
    mcp: plan('mcp', {
      globalInstall: true,
      projectInstall: false,
      effective: 'global',
    }),
    hooks: plan('hooks', {
      globalInstall: true,
      projectInstall: false,
      effective: 'global',
    }),
    work: plan('work', {
      globalInstall: agent === 'grok',
      projectInstall: false,
      effective: agent === 'grok' ? 'global' : 'none',
      note:
        agent === 'grok'
          ? 'Grok supports a global ToolNet continuity skill.'
          : 'Cursor/Copilot work instructions remain project-scoped.',
    }),
  };
}

function projectPlan(agent: ScopedAgent): AgentScopePlan['surfaces'] {
  return {
    mcp: plan('mcp', {
      globalInstall: false,
      projectInstall: true,
      effective: 'project',
      trustRequired: true,
    }),
    hooks: plan('hooks', {
      globalInstall: false,
      projectInstall: true,
      effective: 'project',
      trustRequired: true,
    }),
    work: plan('work', {
      globalInstall: false,
      projectInstall: true,
      effective: 'project',
      trustRequired: false,
      note:
        agent === 'cursor'
          ? 'Use .cursor/rules/toolnet-memory.mdc.'
          : agent === 'copilot'
            ? 'Use .github/instructions/toolnet-memory.instructions.md.'
            : 'Use .grok/skills/toolnet-continuity/SKILL.md.',
    }),
  };
}

function bothPlan(agent: ScopedAgent): AgentScopePlan['surfaces'] {
  const mcpRisk: ScopeRisk = agent === 'cursor' ? 'precedence-unverified' : 'shadowed-global';

  return {
    mcp: plan('mcp', {
      globalInstall: true,
      projectInstall: true,
      effective: 'project',
      risk: mcpRisk,
      trustRequired: true,
      note:
        agent === 'cursor'
          ? 'Project ToolNet MCP is the intended effective definition; native same-name precedence must be E2E certified before release.'
          : 'Global remains useful outside the project; same-name project definition wins inside the project.',
    }),
    hooks: plan('hooks', {
      globalInstall: true,
      projectInstall: true,
      effective: 'both',
      risk: 'additive-duplicate',
      dedupeRequired: true,
      trustRequired: true,
      note: 'Global and project hook sources can both execute for the same native event.',
    }),
    work: plan('work', {
      globalInstall: agent === 'grok',
      projectInstall: true,
      effective: 'project',
      risk: agent === 'grok' ? 'shadowed-global' : 'none',
      trustRequired: false,
      note:
        agent === 'cursor'
          ? 'Project rule is authoritative.'
          : agent === 'copilot'
            ? 'Project instruction is authoritative.'
            : 'Project skill shadows the same-name global skill inside the project.',
    }),
  };
}

export function buildAgentScopePlan(options: BuildScopePlanOptions): AgentScopePlan {
  const { agent, scope, project } = options;

  if ((scope === 'project' || scope === 'both') && (!project || !project.eligible)) {
    return {
      agent,
      requestedScope: scope,
      project,
      surfaces: scope === 'both' ? bothPlan(agent) : projectPlan(agent),
      canInstall: false,
      reason:
        'Project scope requires an explicit project, existing ToolNet project, or Git repository root.',
    };
  }

  return {
    agent,
    requestedScope: scope,
    project,
    surfaces:
      scope === 'global'
        ? globalPlan(agent)
        : scope === 'project'
          ? projectPlan(agent)
          : bothPlan(agent),
    canInstall: true,
  };
}
