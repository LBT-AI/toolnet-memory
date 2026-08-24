import {
  inspectCursorScopedIntegrationStatus,
  type CursorScopedIntegrationStatus,
} from '../cursor/scoped-status.js';

import {
  inspectCopilotScopedIntegrationStatus,
  type CopilotScopedIntegrationStatus,
} from '../copilot/scoped-status.js';

import {
  inspectGrokScopedIntegrationStatus,
  type GrokScopedIntegrationStatus,
} from '../grok/scoped-status.js';

import type {
  EffectiveScope,
  IntegrationScope,
  ScopedAgent,
  ScopeRisk,
} from '../integration-scope/index.js';

export type UnifiedWorkKind = 'rule' | 'instruction' | 'skill';

export type UnifiedReadyState = 'ready' | 'partial' | 'not-installed' | 'invalid';

export interface UnifiedSurfaceStatus {
  configured: boolean;
  file: string;
}

export interface UnifiedHookStatus extends UnifiedSurfaceStatus {
  events: string[];
}

export interface UnifiedWorkStatus extends UnifiedSurfaceStatus {
  kind: UnifiedWorkKind;
}

export interface UnifiedScopeLayerStatus {
  configured: boolean;
  mcp: UnifiedSurfaceStatus;
  hooks: UnifiedHookStatus;
  work?: UnifiedWorkStatus;
}

export interface UnifiedEffectiveStatus {
  mcp: EffectiveScope;
  hooks: EffectiveScope;
  work: EffectiveScope;
}

export interface UnifiedTrustStatus {
  required: boolean;

  /**
   * ToolNet does not claim native workspace trust without host proof.
   */
  state: 'not-required' | 'required-unverified';
}

export interface UnifiedDedupeStatus {
  required: boolean;
  ready: boolean;
}

export interface UnifiedScopedAgentStatus {
  agent: ScopedAgent;
  label: string;
  installed: boolean;
  state: UnifiedReadyState;
  requestedScope: IntegrationScope;
  projectRoot?: string;
  global?: UnifiedScopeLayerStatus;
  project?: UnifiedScopeLayerStatus;
  effective: UnifiedEffectiveStatus;
  risk: {
    mcp: ScopeRisk;
    hooks: ScopeRisk;
    work: ScopeRisk;
  };
  trust: UnifiedTrustStatus;
  dedupe: UnifiedDedupeStatus;
  warnings: string[];
}

export interface UnifiedScopedIntegrationStatus {
  installed: boolean;
  state: UnifiedReadyState;
  requestedScope: IntegrationScope;
  projectRoot?: string;
  agents: UnifiedScopedAgentStatus[];
  summary: {
    total: number;
    ready: number;
    partial: number;
    invalid: number;
    missing: number;
  };
}

export interface InspectUnifiedScopedStatusOptions {
  scope?: IntegrationScope;
  projectRoot?: string;
  agents?: ScopedAgent[];
}

export interface UnifiedScopedStatusInspectors {
  cursor: (options: {
    scope?: IntegrationScope;
    projectRoot?: string;
  }) => CursorScopedIntegrationStatus;

  copilot: (options: {
    scope?: IntegrationScope;
    projectRoot?: string;
  }) => CopilotScopedIntegrationStatus;

  grok: (options: {
    scope?: IntegrationScope;
    projectRoot?: string;
  }) => GrokScopedIntegrationStatus;
}

const DEFAULT_INSPECTORS: UnifiedScopedStatusInspectors = {
  cursor: inspectCursorScopedIntegrationStatus,
  copilot: inspectCopilotScopedIntegrationStatus,
  grok: inspectGrokScopedIntegrationStatus,
};

const LABELS: Record<ScopedAgent, string> = {
  cursor: 'Cursor CLI',
  copilot: 'GitHub Copilot CLI',
  grok: 'Grok Build',
};

function effective(value: EffectiveScope): EffectiveScope {
  return value;
}

function layer(
  status:
    | CursorScopedIntegrationStatus['global']
    | CursorScopedIntegrationStatus['projectScope']
    | CopilotScopedIntegrationStatus['global']
    | CopilotScopedIntegrationStatus['projectScope']
    | GrokScopedIntegrationStatus['global']
    | GrokScopedIntegrationStatus['projectScope']
    | undefined,
  work?: UnifiedWorkStatus
): UnifiedScopeLayerStatus | undefined {
  if (!status) {
    return undefined;
  }

  return {
    configured: status.installed && (work?.configured ?? true),
    mcp: {
      configured: status.mcp.configured,
      file: status.mcp.configFile,
    },
    hooks: {
      configured: status.hooks.configured,
      file: status.hooks.hooksFile,
      events: status.hooks.events,
    },
    work,
  };
}

export function normalizeCursorScopedStatus(
  status: CursorScopedIntegrationStatus
): UnifiedScopedAgentStatus {
  const projectWork = status.projectScope
    ? {
        kind: 'rule' as const,
        configured: status.projectScope.rule.configured,
        file: status.projectScope.rule.ruleFile,
      }
    : undefined;

  return {
    agent: 'cursor',
    label: LABELS.cursor,
    installed: status.installed,
    state: status.state,
    requestedScope: status.requestedScope,
    projectRoot: status.project?.root,
    global: layer(status.global),
    project: layer(status.projectScope, projectWork),
    effective: {
      mcp: effective(status.plan.surfaces.mcp.effective),
      hooks: effective(status.plan.surfaces.hooks.effective),
      work: effective(status.plan.surfaces.work.effective),
    },
    risk: {
      mcp: status.plan.surfaces.mcp.risk,
      hooks: status.plan.surfaces.hooks.risk,
      work: status.plan.surfaces.work.risk,
    },
    trust: {
      required: status.trustRequired,
      state: status.trustRequired ? 'required-unverified' : 'not-required',
    },
    dedupe: {
      required: status.plan.surfaces.hooks.dedupeRequired,
      ready: status.dedupeReady,
    },
    warnings: [...status.warnings],
  };
}

export function normalizeCopilotScopedStatus(
  status: CopilotScopedIntegrationStatus
): UnifiedScopedAgentStatus {
  const projectWork = status.projectScope
    ? {
        kind: 'instruction' as const,
        configured: status.projectScope.instruction.configured,
        file: status.projectScope.instruction.instructionFile,
      }
    : undefined;

  return {
    agent: 'copilot',
    label: LABELS.copilot,
    installed: status.installed,
    state: status.state,
    requestedScope: status.requestedScope,
    projectRoot: status.project?.root,
    global: layer(status.global),
    project: layer(status.projectScope, projectWork),
    effective: {
      mcp: effective(status.plan.surfaces.mcp.effective),
      hooks: effective(status.plan.surfaces.hooks.effective),
      work: effective(status.plan.surfaces.work.effective),
    },
    risk: {
      mcp: status.plan.surfaces.mcp.risk,
      hooks: status.plan.surfaces.hooks.risk,
      work: status.plan.surfaces.work.risk,
    },
    trust: {
      required: status.trustRequired,
      state: status.trustRequired ? 'required-unverified' : 'not-required',
    },
    dedupe: {
      required: status.plan.surfaces.hooks.dedupeRequired,
      ready: status.dedupeReady,
    },
    warnings: [...status.warnings],
  };
}

export function normalizeGrokScopedStatus(
  status: GrokScopedIntegrationStatus
): UnifiedScopedAgentStatus {
  const globalWork = status.global?.skill
    ? {
        kind: 'skill' as const,
        configured: status.global.skill.configured,
        file: status.global.skill.skillFile,
      }
    : undefined;

  const projectWork = status.projectScope?.skill
    ? {
        kind: 'skill' as const,
        configured: status.projectScope.skill.configured,
        file: status.projectScope.skill.skillFile,
      }
    : undefined;

  return {
    agent: 'grok',
    label: LABELS.grok,
    installed: status.installed,
    state: status.state,
    requestedScope: status.requestedScope,
    projectRoot: status.project?.root,
    global: layer(status.global, globalWork),
    project: layer(status.projectScope, projectWork),
    effective: {
      mcp: effective(status.plan.surfaces.mcp.effective),
      hooks: effective(status.plan.surfaces.hooks.effective),
      work: effective(status.plan.surfaces.work.effective),
    },
    risk: {
      mcp: status.plan.surfaces.mcp.risk,
      hooks: status.plan.surfaces.hooks.risk,
      work: status.plan.surfaces.work.risk,
    },
    trust: {
      required: status.trustRequired,
      state: status.trustRequired ? 'required-unverified' : 'not-required',
    },
    dedupe: {
      required: status.plan.surfaces.hooks.dedupeRequired,
      ready: status.dedupeReady,
    },
    warnings: [...status.warnings],
  };
}

function aggregateState(agents: UnifiedScopedAgentStatus[]): UnifiedReadyState {
  if (agents.some((agent) => agent.state === 'invalid')) {
    return 'invalid';
  }

  if (agents.length > 0 && agents.every((agent) => agent.installed)) {
    return 'ready';
  }

  if (agents.every((agent) => agent.state === 'not-installed')) {
    return 'not-installed';
  }

  return 'partial';
}

export function inspectUnifiedScopedIntegrationStatus(
  options: InspectUnifiedScopedStatusOptions = {},
  inspectors: UnifiedScopedStatusInspectors = DEFAULT_INSPECTORS
): UnifiedScopedIntegrationStatus {
  const scope = options.scope ?? 'global';
  const selected = options.agents ?? (['cursor', 'copilot', 'grok'] as ScopedAgent[]);

  const agents = selected.map((agent) => {
    if (agent === 'cursor') {
      return normalizeCursorScopedStatus(
        inspectors.cursor({
          scope,
          projectRoot: options.projectRoot,
        })
      );
    }

    if (agent === 'copilot') {
      return normalizeCopilotScopedStatus(
        inspectors.copilot({
          scope,
          projectRoot: options.projectRoot,
        })
      );
    }

    return normalizeGrokScopedStatus(
      inspectors.grok({
        scope,
        projectRoot: options.projectRoot,
      })
    );
  });

  const state = aggregateState(agents);

  return {
    installed: agents.length > 0 && agents.every((agent) => agent.installed),
    state,
    requestedScope: scope,
    projectRoot: options.projectRoot ?? agents.find((agent) => agent.projectRoot)?.projectRoot,
    agents,
    summary: {
      total: agents.length,
      ready: agents.filter((agent) => agent.state === 'ready').length,
      partial: agents.filter((agent) => agent.state === 'partial').length,
      invalid: agents.filter((agent) => agent.state === 'invalid').length,
      missing: agents.filter((agent) => agent.state === 'not-installed').length,
    },
  };
}
