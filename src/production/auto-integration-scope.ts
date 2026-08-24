import {
  resolveIntegrationProjectRoot,
  type IntegrationScope,
  type ProjectRootResolution,
} from '../session/integration-scope/index.js';

export interface ResolveAutoIntegrationScopeOptions {
  /**
   * Explicit operator override.
   * Undefined means use ToolNet's conservative automatic policy.
   */
  scope?: IntegrationScope;

  /**
   * Optional target project supplied by init/CLI/embedders.
   */
  projectRoot?: string;

  /**
   * Lookup cwd when projectRoot is not explicitly supplied.
   */
  cwd?: string;
}

export interface AutoIntegrationScopeResolution {
  scope: IntegrationScope;
  automatic: boolean;
  project?: ProjectRootResolution;
  reason:
    | 'explicit-global'
    | 'explicit-project'
    | 'explicit-both'
    | 'toolnet-project'
    | 'no-toolnet-project';
}

/**
 * Conservative automatic policy for Cursor/Copilot/Grok.
 *
 * Default:
 * - existing ToolNet project (.toolnet/project.json) -> both
 * - Git-only / ordinary directory -> global only
 *
 * This intentionally does NOT create .cursor/.github/.grok project state in a
 * repository that has not been initialized as a ToolNet project.
 *
 * Operators can explicitly request --scope project|both with --project <path>.
 */
export function resolveAutoIntegrationScope(
  options: ResolveAutoIntegrationScopeOptions = {}
): AutoIntegrationScopeResolution {
  if (options.scope === 'global') {
    return {
      scope: 'global',
      automatic: false,
      reason: 'explicit-global',
    };
  }

  if (options.scope === 'project' || options.scope === 'both') {
    const project = resolveIntegrationProjectRoot({
      cwd: options.cwd,
      project: options.projectRoot,
    });

    if (!project.eligible) {
      throw new Error(
        `Explicit ${options.scope} integration requires an explicit project, ToolNet project, or Git repository root.`
      );
    }

    return {
      scope: options.scope,
      automatic: false,
      project,
      reason: options.scope === 'project' ? 'explicit-project' : 'explicit-both',
    };
  }

  const project = resolveIntegrationProjectRoot({
    cwd: options.cwd,
    project: options.projectRoot,
  });

  if (project.toolnetProject) {
    return {
      scope: 'both',
      automatic: true,
      project,
      reason: 'toolnet-project',
    };
  }

  return {
    scope: 'global',
    automatic: true,
    reason: 'no-toolnet-project',
  };
}
