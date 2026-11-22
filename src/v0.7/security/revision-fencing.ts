/**
 * ToolNet v0.7 revision and fencing enforcement for secure project access.
 *
 * Provides project revision tracking, fencing tokens, and secure lease management
 * to prevent unauthorized access and ensure data integrity across agent sessions.
 */

import { createHash } from 'node:crypto';

export interface Revision {
  projectId: string;
  version: number;
  checksum: string;
  timestamp: number;
  agentId?: string;
}

export interface FencingToken {
  projectId: string;
  taskId: string;
  token: number;
  agentId: string;
  issuedAt: number;
  expiresAt: number;
}

export interface Lease {
  projectId: string;
  taskId: string;
  agentId: string;
  token: number;
  fencingToken: number;
  acquiredAt: number;
  heartbeatAt: number;
  expiresAt: number;
}

export interface RevisionConflict {
  projectId: string;
  expectedRevision: number;
  actualRevision: number;
  error: string;
}

export interface FencingConflict {
  projectId: string;
  taskId: string;
  agentId: string;
  fencingToken: number;
  error: string;
}

export class RevisionManager {
  private readonly revisions = new Map<string, Revision[]>();
  private readonly leases = new Map<string, Lease>();
  private readonly fencingTokens = new Map<string, FencingToken>();

  trackRevision(projectId: string, data: unknown, agentId?: string): Revision {
    const checksum = this.calculateChecksum(data);
    const version = this.getNextRevision(projectId);

    const revision: Revision = {
      projectId,
      version,
      checksum,
      timestamp: Date.now(),
      agentId,
    };

    const history = this.revisions.get(projectId) || [];
    history.push(revision);
    this.revisions.set(projectId, history);
    return revision;
  }

  validateRevision(
    projectId: string,
    expectedVersion: number,
    actualChecksum: string
  ): RevisionConflict {
    const history = this.revisions.get(projectId);
    if (!history || history.length === 0) {
      return {
        projectId,
        expectedRevision: expectedVersion,
        actualRevision: expectedVersion,
        error: 'REVISION_PROJECT_UNKNOWN',
      };
    }

    const stored = history.find((r) => r.version === expectedVersion);
    if (!stored) {
      const latest = history[history.length - 1];
      return {
        projectId,
        expectedRevision: expectedVersion,
        actualRevision: latest.version,
        error: 'REVISION_CONFLICT',
      };
    }

    if (stored.checksum !== actualChecksum) {
      return {
        projectId,
        expectedRevision: expectedVersion,
        actualRevision: stored.version,
        error: 'REVISION_CHECKSUM_MISMATCH',
      };
    }

    return {
      projectId,
      expectedRevision: expectedVersion,
      actualRevision: stored.version,
      error: 'OK',
    };
  }

  getCurrentRevision(projectId: string): Revision | undefined {
    const history = this.revisions.get(projectId);
    return history?.[history.length - 1];
  }

  getRevisionHistory(projectId: string): Revision[] {
    return this.revisions.get(projectId) || [];
  }

  private calculateChecksum(data: unknown): string {
    return createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  private getNextRevision(projectId: string): number {
    const history = this.revisions.get(projectId);
    return (history?.[history.length - 1]?.version || 0) + 1;
  }
}

export class FencingManager {
  private readonly activeFencingTokens = new Map<string, FencingToken>();
  private readonly activeLeases = new Map<string, Lease>();

  issueFencingToken(
    projectId: string,
    taskId: string,
    agentId: string,
    ttlMs: number
  ): FencingToken {
    const existing = this.activeFencingTokens.get(`${projectId}:${taskId}`);
    const token = existing ? existing.token + 1 : 1;

    const fencingToken: FencingToken = {
      projectId,
      taskId,
      token,
      agentId,
      issuedAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
    };

    this.activeFencingTokens.set(`${projectId}:${taskId}`, fencingToken);

    return fencingToken;
  }

  validateFencing(
    projectId: string,
    taskId: string,
    agentId: string,
    fencingToken: number
  ): FencingConflict | null {
    const key = `${projectId}:${taskId}`;
    const stored = this.activeFencingTokens.get(key);

    if (!stored) {
      return {
        projectId,
        taskId,
        agentId,
        fencingToken,
        error: 'FENCING_TOKEN_UNKNOWN',
      };
    }

    if (stored.token !== fencingToken) {
      return {
        projectId,
        taskId,
        agentId,
        fencingToken,
        error: 'FENCING_CONFLICT',
      };
    }

    if (stored.agentId !== agentId) {
      return {
        projectId,
        taskId,
        agentId,
        fencingToken,
        error: 'FENCING_AGENT_MISMATCH',
      };
    }

    if (Date.now() > stored.expiresAt) {
      // Token expired - remove it
      this.activeFencingTokens.delete(key);
      return {
        projectId,
        taskId,
        agentId,
        fencingToken,
        error: 'FENCING_TOKEN_EXPIRED',
      };
    }

    return null;
  }

  acquireLease(
    projectId: string,
    taskId: string,
    agentId: string,
    ttlMs: number,
    fencingToken: number
  ): Lease {
    const lease: Lease = {
      projectId,
      taskId,
      agentId,
      token: Date.now(),
      fencingToken,
      acquiredAt: Date.now(),
      heartbeatAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
    };

    this.activeLeases.set(`${projectId}:${taskId}`, lease);
    return lease;
  }

  validateLease(projectId: string, taskId: string, agentId: string, fencingToken: number): boolean {
    const lease = this.activeLeases.get(`${projectId}:${taskId}`);
    if (!lease) {
      return false;
    }

    if (lease.agentId !== agentId) {
      return false;
    }

    if (lease.fencingToken !== fencingToken) {
      return false;
    }

    if (Date.now() > lease.expiresAt) {
      this.activeLeases.delete(`${projectId}:${taskId}`);
      return false;
    }

    return true;
  }

  releaseLease(projectId: string, taskId: string, agentId: string, fencingToken: number): boolean {
    const key = `${projectId}:${taskId}`;
    const lease = this.activeLeases.get(key);

    if (!lease) {
      return false;
    }

    if (lease.agentId !== agentId) {
      return false;
    }

    if (lease.fencingToken !== fencingToken) {
      return false;
    }

    this.activeLeases.delete(key);
    this.activeFencingTokens.delete(key);

    return true;
  }
}

const SECRET_PATTERNS: readonly RegExp[] = [
  /sk-[a-zA-Z0-9_-]{20,}/g,
  /hf_[a-zA-Z0-9]{20,}/g,
  /gh[pousr]_[a-zA-Z0-9]{30,}/g,
  /\btoken=[a-zA-Z0-9._~+/=-]+/gi,
  /\bpassword\s*[:=]\s*['"]?[^\s"'`]+['"]?/gi,
  /\bapi[_-]?key\s*[:=]\s*['"]?[^\s"'`]+['"]?/gi,
  /\bbearer\s+[a-zA-Z0-9._~+/=-]{16,}/gi,
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface SecurityError {
  code: string;
  message: string;
  timestamp: number;
  projectId?: string;
  agentId?: string;
}

export class SecurityLogger {
  private readonly errors: SecurityError[] = [];
  private readonly secrets = new Set<string>();

  logSecurityError(
    code: string,
    message: string,
    context?: { projectId?: string; agentId?: string }
  ): void {
    const error: SecurityError = {
      code,
      message: this.redactSecrets(message),
      timestamp: Date.now(),
      projectId: context?.projectId,
      agentId: context?.agentId,
    };

    this.errors.push(error);
  }

  detectSecrets(value: unknown): void {
    if (typeof value !== 'string') {
      return;
    }

    for (const pattern of SECRET_PATTERNS) {
      const matches = value.match(pattern);
      matches?.forEach((match) => {
        const trimmed = match.trim();
        if (trimmed) {
          this.secrets.add(trimmed.toLowerCase());
        }
      });
    }
  }

  redactSecrets(value: string): string {
    let redacted = value;

    // Longest first so a shorter secret cannot partially mask a longer one.
    const secrets = [...this.secrets].sort((left, right) => right.length - left.length);

    for (const secret of secrets) {
      redacted = redacted.replace(new RegExp(escapeRegExp(secret), 'gi'), '[REDACTED]');
    }

    return redacted;
  }

  getSecurityEvents(projectId?: string): SecurityError[] {
    if (!projectId) {
      return this.errors.slice();
    }
    return this.errors.filter((error) => error.projectId === projectId);
  }
}
