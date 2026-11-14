/**
 * ToolNet v0.7 project authentication and authorization.
 *
 * Provides per-project identity validation, access control, and token management
 * for cloud authority operations in v0.7.0.
 */

import { createHash } from 'node:crypto';

export interface ProjectAuthConfig {
  projectId: string;
  projectName: string;
  token: string;
  allowedAgents?: string[];
  allowedOperations?: ('read' | 'write' | 'lease' | 'commit')[];
}

export interface AuthResult {
  valid: boolean;
  projectId?: string;
  error?: string;
}

export class ProjectAuthenticator {
  private readonly configs = new Map<string, ProjectAuthConfig>();

  register(config: ProjectAuthConfig): void {
    if (!config.projectId.trim() || !config.projectName.trim() || !config.token.trim()) {
      throw new Error('PROJECT_AUTH_INVALID_CONFIG');
    }

    this.configs.set(config.projectId, {
      ...config,
      projectId: config.projectId.trim(),
      projectName: config.projectName.trim(),
      token: config.token.trim(),
      allowedAgents: config.allowedAgents?.slice() ?? [],
      allowedOperations: config.allowedOperations?.slice() ?? ['read', 'write', 'lease', 'commit'],
    });
  }

  validateAuth(projectId: string, token: string, agentId?: string): AuthResult {
    const config = this.configs.get(projectId);

    if (!config) {
      return { valid: false, error: 'PROJECT_AUTH_PROJECT_UNKNOWN' };
    }

    if (config.token !== token) {
      return { valid: false, error: 'PROJECT_AUTH_TOKEN_MISMATCH' };
    }

    if (agentId && config.allowedAgents?.length && !config.allowedAgents.includes(agentId)) {
      return { valid: false, error: 'PROJECT_AUTH_AGENT_NOT_ALLOWED' };
    }

    return { valid: true, projectId: config.projectId };
  }

  getConfig(projectId: string): ProjectAuthConfig | undefined {
    return this.configs.get(projectId);
  }

  generateToken(projectId: string): string {
    const config = this.configs.get(projectId);
    if (!config) {
      throw new Error('PROJECT_AUTH_PROJECT_UNKNOWN');
    }
    return config.token;
  }
}

export class ProjectAuthorizer {
  constructor(private readonly authenticator: ProjectAuthenticator) {}

  canAccess(
    projectId: string,
    token: string,
    operation: string,
    agentId?: string,
    context?: Record<string, unknown>
  ): boolean {
    const auth = this.authenticator.validateAuth(projectId, token, agentId);
    if (!auth.valid || !auth.projectId) {
      return false;
    }

    const config = this.authenticator.getConfig(auth.projectId);
    if (!config) {
      return false;
    }

    if (!config.allowedOperations?.includes(operation as any)) {
      return false;
    }

    return this.validateOperationContext(operation, config, context);
  }

  private validateOperationContext(
    operation: string,
    config: ProjectAuthConfig,
    context?: Record<string, unknown>
  ): boolean {
    switch (operation) {
      case 'lease':
        return !context?.taskId || !context?.agentId || context.agentId === config.allowedAgents?.[0];
      case 'commit':
        return !context?.agentId || !context?.fencingToken || config.allowedOperations?.includes('write');
      case 'write':
        return true;
      case 'read':
        return true;
      default:
        return false;
    }
  }
}

export function createProjectIdentity(projectId: string, agentId: string): string {
  const hash = createHash('sha256');
  hash.update(`${projectId}:${agentId}:${Date.now()}`);
  return hash.digest('hex').slice(0, 32);
}
