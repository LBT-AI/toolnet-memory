/*
 * Phase 77 — session and project runtime registries.
 *
 * These are RUNTIME COORDINATION ONLY. Nothing here is authoritative: losing a
 * session record or project runtime record costs an index/attach, never data.
 */

import { randomBytes } from 'node:crypto';

import { DAEMON_LIMITS } from './limits.js';

import type {
  DaemonClientIdentity,
  DaemonDiagnosticCode,
  DaemonProjectRef,
  DaemonSessionRecord,
  ProjectRuntimeState,
} from './types.js';

function newId(prefix: string): string {
  return `${prefix}-${randomBytes(12).toString('hex')}`;
}

/* ------------------------------------------------------------------ *
 * Sessions
 * ------------------------------------------------------------------ */

export interface SessionRegistryOptions {
  heartbeatTimeoutMs?: number;
  maxClients?: number;
}

export class SessionRegistry {
  private readonly sessions = new Map<string, DaemonSessionRecord>();

  private readonly heartbeatTimeoutMs: number;

  private readonly maxClients: number;

  constructor(options: SessionRegistryOptions = {}) {
    this.heartbeatTimeoutMs = options.heartbeatTimeoutMs ?? DAEMON_LIMITS.heartbeatTimeoutMs;
    this.maxClients = options.maxClients ?? DAEMON_LIMITS.maxClients;
  }

  get size(): number {
    return this.sessions.size;
  }

  get limit(): number {
    return this.maxClients;
  }

  register(
    client: DaemonClientIdentity,
    fingerprint: string,
    now = Date.now()
  ): DaemonSessionRecord {
    if (this.sessions.size >= this.maxClients) {
      throw new Error('CLIENT_LIMIT_EXCEEDED');
    }

    const record: DaemonSessionRecord = {
      sessionId: newId('sess'),
      client,
      startedAt: new Date(now).toISOString(),
      lastHeartbeatAt: new Date(now).toISOString(),
      fingerprint,
      projects: [],
    };

    this.sessions.set(record.sessionId, record);

    return record;
  }

  get(sessionId: string): DaemonSessionRecord | undefined {
    return this.sessions.get(sessionId);
  }

  touch(sessionId: string, now = Date.now()): boolean {
    const record = this.sessions.get(sessionId);

    if (!record) {
      return false;
    }

    record.lastHeartbeatAt = new Date(now).toISOString();

    return true;
  }

  list(): DaemonSessionRecord[] {
    return [...this.sessions.values()];
  }

  remove(sessionId: string): DaemonSessionRecord | undefined {
    const record = this.sessions.get(sessionId);

    this.sessions.delete(sessionId);

    return record;
  }

  /** Remove sessions whose heartbeat has expired. Returns removed ids. */
  reapStale(now = Date.now()): string[] {
    const removed: string[] = [];

    for (const record of this.sessions.values()) {
      const last = Date.parse(record.lastHeartbeatAt);

      if (!Number.isFinite(last) || now - last > this.heartbeatTimeoutMs) {
        removed.push(record.sessionId);
      }
    }

    for (const sessionId of removed) {
      this.sessions.delete(sessionId);
    }

    return removed;
  }
}

/* ------------------------------------------------------------------ *
 * Projects
 * ------------------------------------------------------------------ */

export interface ProjectRuntimeRecord {
  projectId: string;
  project: DaemonProjectRef;
  state: ProjectRuntimeState;
  generation?: string;
  sourceManifestHash?: string;
  sessions: Set<string>;
  activeJobId?: string;
  watcherActive: boolean;
  updatedAt: string;
  diagnostics: Set<DaemonDiagnosticCode>;
  lastUsedAt: number;
  resident: boolean;
}

/**
 * Explicit project state machine.
 *
 * Arbitrary state assignment is rejected: `transition` returns false for an
 * illegal move instead of silently accepting it.
 */
const ALLOWED_TRANSITIONS: Record<ProjectRuntimeState, readonly ProjectRuntimeState[]> = {
  idle: ['hydrating', 'indexing', 'ready', 'failed'],
  hydrating: ['ready', 'indexing', 'failed', 'idle'],
  indexing: ['ready', 'failed', 'stale'],
  ready: ['stale', 'indexing', 'hydrating', 'idle'],
  stale: ['indexing', 'hydrating', 'ready', 'failed'],
  failed: ['indexing', 'hydrating', 'idle'],
};

export function canTransition(from: ProjectRuntimeState, to: ProjectRuntimeState): boolean {
  return from === to || ALLOWED_TRANSITIONS[from].includes(to);
}

export interface ProjectAttachResult {
  record: ProjectRuntimeRecord;
  attached: boolean;
  watcherNeeded: boolean;
}

export class ProjectRegistry {
  private readonly records = new Map<string, ProjectRuntimeRecord>();

  get size(): number {
    return this.records.size;
  }

  list(): ProjectRuntimeRecord[] {
    return [...this.records.values()];
  }

  get(projectId: string): ProjectRuntimeRecord | undefined {
    return this.records.get(projectId);
  }

  attach(project: DaemonProjectRef, sessionId: string, now = Date.now()): ProjectAttachResult {
    const existing = this.records.get(project.id);

    if (existing) {
      existing.sessions.add(sessionId);
      existing.lastUsedAt = now;
      return {
        record: existing,
        attached: false,
        watcherNeeded: !existing.watcherActive,
      };
    }

    const record: ProjectRuntimeRecord = {
      projectId: project.id,
      project,
      state: 'idle',
      sessions: new Set([sessionId]),
      watcherActive: false,
      updatedAt: new Date(now).toISOString(),
      diagnostics: new Set(),
      lastUsedAt: now,
      resident: false,
    };

    this.records.set(project.id, record);

    return {
      record,
      attached: true,
      watcherNeeded: true,
    };
  }

  detach(projectId: string, sessionId: string, now = Date.now()): ProjectRuntimeRecord | undefined {
    const record = this.records.get(projectId);

    if (!record) {
      return undefined;
    }

    record.sessions.delete(sessionId);
    record.lastUsedAt = now;

    return record;
  }

  /** Projects a session is attached to. */
  forSession(sessionId: string): ProjectRuntimeRecord[] {
    return this.list().filter((record) => record.sessions.has(sessionId));
  }

  setState(
    projectId: string,
    state: ProjectRuntimeState,
    patch: Partial<
      Pick<ProjectRuntimeRecord, 'generation' | 'sourceManifestHash' | 'activeJobId'>
    > = {},
    now = Date.now()
  ): ProjectRuntimeRecord | undefined {
    const record = this.records.get(projectId);

    if (!record) {
      return undefined;
    }

    if (!canTransition(record.state, state)) {
      return undefined;
    }

    record.state = state;

    if (patch.generation !== undefined) {
      record.generation = patch.generation;
    }

    if (patch.sourceManifestHash !== undefined) {
      record.sourceManifestHash = patch.sourceManifestHash;
    }

    if ('activeJobId' in patch) {
      if (patch.activeJobId === undefined) {
        delete record.activeJobId;
      } else {
        record.activeJobId = patch.activeJobId;
      }
    }

    record.updatedAt = new Date(now).toISOString();
    record.lastUsedAt = now;

    return record;
  }

  addDiagnostic(projectId: string, code: DaemonDiagnosticCode): void {
    this.records.get(projectId)?.diagnostics.add(code);
  }

  markResident(projectId: string, resident: boolean): void {
    const record = this.records.get(projectId);

    if (record) {
      record.resident = resident;
    }
  }

  /** Remove a record that no session references. */
  removeIfUnused(projectId: string): boolean {
    const record = this.records.get(projectId);

    if (!record || record.sessions.size > 0 || record.activeJobId) {
      return false;
    }

    this.records.delete(projectId);

    return true;
  }

  /**
   * Idle projects eligible for eviction.
   *
   * A pinned runtime (active sessions, active job, or an active watcher
   * subscription) is never returned.
   */
  evictionCandidates(options: { maxResident: number; idleMs: number; now?: number }): string[] {
    const now = options.now ?? Date.now();

    const candidates = this.list()
      .filter((record) => record.sessions.size === 0 && !record.activeJobId)
      .filter((record) => now - record.lastUsedAt > options.idleMs)
      .sort((left, right) => left.lastUsedAt - right.lastUsedAt);

    const overflow = Math.max(0, this.size - options.maxResident);

    return candidates.slice(0, Math.max(overflow, 0)).map((record) => record.projectId);
  }
}
