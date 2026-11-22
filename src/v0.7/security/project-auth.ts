/**
 * ToolNet v0.7 project authentication and authorization.
 *
 * Provides per-project identity validation, access control, and token management
 * for cloud authority operations in v0.7.0.
 */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

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

    if (!tokensMatch(config.token, token)) {
      return { valid: false, error: 'PROJECT_AUTH_TOKEN_MISMATCH' };
    }

    if (agentId && config.allowedAgents?.length && !config.allowedAgents.includes(agentId)) {
      return { valid: false, error: 'PROJECT_AUTH_AGENT_NOT_ALLOWED' };
    }

    return { valid: true, projectId: config.projectId };
  }

  getConfig(projectId: string): ProjectAuthConfig | undefined {
    const config = this.configs.get(projectId);
    return config ? { ...config } : undefined;
  }

  /**
   * Issue a fresh random token for a registered project and return it.
   * The previously registered token stops being valid immediately.
   */
  generateToken(projectId: string): string {
    const config = this.configs.get(projectId);
    if (!config) {
      throw new Error('PROJECT_AUTH_PROJECT_UNKNOWN');
    }

    const token = randomBytes(32).toString('hex');
    this.configs.set(projectId, { ...config, token });
    return token;
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
      case 'lease': {
        const taskId = context?.taskId;
        const agentId = context?.agentId;

        // A lease claim without an explicit task and agent cannot be authorized.
        if (typeof taskId !== 'string' || !taskId.trim()) {
          return false;
        }

        if (typeof agentId !== 'string' || !agentId.trim()) {
          return false;
        }

        return agentAllowed(config, agentId);
      }
      case 'commit': {
        const agentId = context?.agentId;
        const fencingToken = context?.fencingToken;

        // A commit must carry the live lease's agent and fencing token.
        if (typeof agentId !== 'string' || !agentId.trim()) {
          return false;
        }

        if (
          typeof fencingToken !== 'number' ||
          !Number.isSafeInteger(fencingToken) ||
          fencingToken <= 0
        ) {
          return false;
        }

        if (config.allowedOperations?.includes('write') !== true) {
          return false;
        }

        return agentAllowed(config, agentId);
      }
      case 'write':
        return true;
      case 'read':
        return true;
      default:
        return false;
    }
  }
}

function agentAllowed(config: ProjectAuthConfig, agentId: string): boolean {
  return !config.allowedAgents?.length || config.allowedAgents.includes(agentId);
}

function tokensMatch(expected: string, provided: string): boolean {
  const expectedBytes = Buffer.from(expected, 'utf8');
  const providedBytes = Buffer.from(provided, 'utf8');

  if (expectedBytes.length !== providedBytes.length) {
    // Compare a same-length dummy value so the failure path stays constant-time.
    timingSafeEqual(expectedBytes, expectedBytes);
    return false;
  }

  return timingSafeEqual(expectedBytes, providedBytes);
}

export function createProjectIdentity(projectId: string, agentId: string): string {
  const hash = createHash('sha256');
  hash.update(`${projectId}:${agentId}:${Date.now()}`);
  return hash.digest('hex').slice(0, 32);
}
