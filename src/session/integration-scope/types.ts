export type ScopedAgent = 'cursor' | 'copilot' | 'grok';

export type IntegrationScope = 'global' | 'project' | 'both';

export type IntegrationSurface = 'mcp' | 'hooks' | 'work';

export type EffectiveScope = 'none' | 'global' | 'project' | 'both';

export type ScopeRisk = 'none' | 'shadowed-global' | 'additive-duplicate' | 'precedence-unverified';

export type ProjectRootSource = 'explicit' | 'toolnet' | 'git' | 'cwd';

export interface ProjectRootResolution {
  root: string;
  source: ProjectRootSource;
  eligible: boolean;
  toolnetProject: boolean;
  manifestFile?: string;
  gitRoot?: string;
}

export interface SurfaceTarget {
  install: boolean;
  effective: boolean;
}

export interface SurfaceScopePlan {
  surface: IntegrationSurface;
  global: SurfaceTarget;
  project: SurfaceTarget;
  effective: EffectiveScope;
  risk: ScopeRisk;
  dedupeRequired: boolean;
  trustRequired: boolean;
  note?: string;
}

export interface AgentScopePlan {
  agent: ScopedAgent;
  requestedScope: IntegrationScope;
  project?: ProjectRootResolution;
  surfaces: Record<IntegrationSurface, SurfaceScopePlan>;
  canInstall: boolean;
  reason?: string;
}
