/*
 * Phase 79 — persistent runtime trace store.
 *
 * Namespace (project-scoped, derived state only):
 *
 *   projects/<projectId>/runtime-traces/sessions/<sessionId>.json
 *   projects/<projectId>/runtime-traces/observations/index.json
 *   projects/<projectId>/runtime-traces/index/sessions.json
 *
 * Traces are NEVER written into Memory, the Task WAL, Sessions, ADRs, the Wiki
 * or the Project Manual, and they are never bundled into a Phase 76 graph
 * artifact. The session records are the source of truth; the observation index
 * is a materialized derivation that is recomputed from them, so a deleted
 * session can never leave a dangling aggregate count behind.
 */

import { canonicalJsonPretty } from '../artifact/serializer.js';

import { mergeObservations } from './observations.js';

import { resolveRuntimeTraceLimits, type RuntimeTraceLimits } from './limits.js';

import type {
  RuntimeObservation,
  RuntimeTraceSession,
  RuntimeTraceSessionRecord,
} from './types.js';

import type { StorageProvider } from '../../storage/types.js';

const TRACE_SCHEMA_VERSION = 1;

interface SessionIndexRecord {
  version: number;
  updatedAt: string;
  sessions: RuntimeTraceSession[];
}

export class PersistentRuntimeTraceStore {
  private readonly limits: RuntimeTraceLimits;

  constructor(
    private readonly storage: StorageProvider,
    limits: Partial<RuntimeTraceLimits> = {}
  ) {
    this.limits = resolveRuntimeTraceLimits(limits);
  }

  private base(projectId: string): string {
    return ['projects', projectId, 'runtime-traces'].join('/');
  }

  private sessionKey(projectId: string, sessionId: string): string {
    return `${this.base(projectId)}/sessions/${sessionId}.json`;
  }

  private observationsKey(projectId: string): string {
    return `${this.base(projectId)}/observations/index.json`;
  }

  private indexKey(projectId: string): string {
    return `${this.base(projectId)}/index/sessions.json`;
  }

  async hasSession(projectId: string, sessionId: string): Promise<boolean> {
    return this.storage.exists(this.sessionKey(projectId, sessionId));
  }

  async loadSessionRecords(projectId: string): Promise<RuntimeTraceSessionRecord[]> {
    const prefix = `${this.base(projectId)}/sessions/`;

    let objects: Awaited<ReturnType<StorageProvider['list']>> = [];

    try {
      objects = await this.storage.list(prefix);
    } catch {
      return [];
    }

    const records: RuntimeTraceSessionRecord[] = [];

    for (const object of objects.sort((left, right) => left.key.localeCompare(right.key))) {
      const text = await this.storage.getText(object.key);

      if (!text) {
        continue;
      }

      try {
        const parsed = JSON.parse(text) as RuntimeTraceSessionRecord;

        if (parsed?.session?.id) {
          records.push({
            session: parsed.session,
            observations: Array.isArray(parsed.observations) ? parsed.observations : [],
          });
        }
      } catch {
        /* Derived state: a corrupt session record must not break the store. */
      }
    }

    return records;
  }

  async loadSessionSummaries(projectId: string): Promise<RuntimeTraceSession[]> {
    const text = await this.storage.getText(this.indexKey(projectId));

    if (text) {
      try {
        const parsed = JSON.parse(text) as SessionIndexRecord;

        if (Array.isArray(parsed.sessions)) {
          return parsed.sessions;
        }
      } catch {
        /* Fall through to a rebuild from session records. */
      }
    }

    const records = await this.loadSessionRecords(projectId);

    return records
      .map((record) => record.session)
      .sort((left, right) => left.id.localeCompare(right.id));
  }

  /** Materialized aggregate; falls back to recomputation when absent. */
  async loadObservations(projectId: string): Promise<RuntimeObservation[]> {
    const text = await this.storage.getText(this.observationsKey(projectId));

    if (text) {
      try {
        const parsed = JSON.parse(text) as RuntimeObservation[];

        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        /* Fall through to recomputation. */
      }
    }

    return (await this.recompute(projectId)).observations;
  }

  /**
   * Commit a session record and re-materialize the derived index.
   *
   * The session record is written first: a crash between writes leaves an
   * unindexed session, which the next mutation repairs by recomputation, rather
   * than an index that references a session that does not exist.
   */
  async commitSession(projectId: string, record: RuntimeTraceSessionRecord): Promise<void> {
    await this.storage.put(
      this.sessionKey(projectId, record.session.id),
      canonicalJsonPretty(record),
      'application/json'
    );

    await this.recompute(projectId);
  }

  /** Remove sessions by id and re-materialize. Returns removed session ids. */
  async deleteSessions(projectId: string, sessionIds: readonly string[]): Promise<string[]> {
    const removed: string[] = [];

    for (const sessionId of [...sessionIds].sort()) {
      const key = this.sessionKey(projectId, sessionId);

      if (!(await this.storage.exists(key))) {
        continue;
      }

      await this.storage.delete(key);

      removed.push(sessionId);
    }

    if (removed.length > 0) {
      await this.recompute(projectId);
    }

    return removed;
  }

  /** Bounded byte accounting for the project's trace namespace. */
  async storageBytes(projectId: string): Promise<number> {
    try {
      const objects = await this.storage.list(`${this.base(projectId)}/`);

      return objects.reduce((total, object) => total + Math.max(0, object.size ?? 0), 0);
    } catch {
      return 0;
    }
  }

  private async recompute(
    projectId: string
  ): Promise<{ observations: RuntimeObservation[]; sessions: RuntimeTraceSession[] }> {
    const records = await this.loadSessionRecords(projectId);

    /* Bound what is materialized even before retention runs. */
    const bounded = records.slice(-this.limits.maxStoredSessions);

    let merged: RuntimeObservation[] = [];

    for (const record of bounded) {
      merged = mergeObservations(merged, record.observations, this.limits).merged;
    }

    const truncated = merged.length > this.limits.maxStoredObservations;

    const observations = truncated ? merged.slice(0, this.limits.maxStoredObservations) : merged;

    const sessions = bounded
      .map((record) => record.session)
      .sort((left, right) => left.id.localeCompare(right.id));

    await this.storage.put(
      this.observationsKey(projectId),
      canonicalJsonPretty(observations),
      'application/json'
    );

    await this.storage.put(
      this.indexKey(projectId),
      canonicalJsonPretty({
        version: TRACE_SCHEMA_VERSION,
        updatedAt: new Date().toISOString(),
        sessions,
      } satisfies SessionIndexRecord),
      'application/json'
    );

    return { observations, sessions };
  }
}
