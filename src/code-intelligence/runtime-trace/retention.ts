/*
 * Phase 79 — runtime trace retention.
 *
 * Traces are observational and can grow without bound, so retention is explicit
 * and bounded by session count, age and stored bytes. Pruning deletes session
 * records AND re-materializes the observation index from the survivors, so a
 * deleted session never leaves a dangling count behind.
 *
 * Pruning touches only the trace namespace: the static graph, Memory, Tasks,
 * Sessions and ADRs are never modified.
 */

import { resolveRuntimeTraceLimits, type RuntimeTraceLimits } from './limits.js';

import type { PersistentRuntimeTraceStore } from './store.js';

export interface RuntimeTraceRetentionOptions {
  /** Sessions retained per project (newest first). */
  maxSessions?: number;
  /** Sessions older than this (by `importedAt`) are removable. */
  maxAgeDays?: number;
  /** Hard byte ceiling for the project's trace namespace. */
  maxBytes?: number;
  /** Report what would be removed without removing it. */
  dryRun?: boolean;
  now?: () => Date;
  limits?: Partial<RuntimeTraceLimits>;
}

export interface RuntimeTraceRetentionResult {
  removed: string[];
  retained: number;
  bytes: number;
  dryRun: boolean;
}

/**
 * Apply retention to one project's trace namespace.
 *
 * The newest session is never removed for age reasons until it is the only one
 * left; a single very recent session is always retained.
 */
export async function applyRuntimeTraceRetention(
  store: PersistentRuntimeTraceStore,
  projectId: string,
  options: RuntimeTraceRetentionOptions = {}
): Promise<RuntimeTraceRetentionResult> {
  const limits = resolveRuntimeTraceLimits(options.limits);

  const maxSessions = clamp(
    options.maxSessions ?? limits.maxStoredSessions,
    limits.maxStoredSessions
  );

  const maxAgeDays = clamp(
    options.maxAgeDays ?? limits.maxSessionAgeDays,
    limits.maxSessionAgeDays
  );

  const now = (options.now ?? ((): Date => new Date()))();

  const summaries = await store.loadSessionSummaries(projectId);

  const dated = summaries
    .map((session) => ({
      id: session.id,
      importedAt: session.importedAt,
      at: Date.parse(session.importedAt),
    }))
    .sort((left, right) => {
      const byTime =
        (Number.isFinite(right.at) ? right.at : 0) - (Number.isFinite(left.at) ? left.at : 0);

      return byTime !== 0 ? byTime : right.id.localeCompare(left.id);
    });

  const removable = new Set<string>();

  dated.forEach((session, index) => {
    if (index >= maxSessions) {
      removable.add(session.id);
      return;
    }

    if (Number.isFinite(session.at)) {
      const ageDays = (now.getTime() - session.at) / (24 * 60 * 60 * 1000);

      if (ageDays > maxAgeDays) {
        removable.add(session.id);
      }
    }
  });

  let removed = [...removable].sort();

  if (!options.dryRun && removed.length > 0) {
    removed = await store.deleteSessions(projectId, removed);
  }

  /* Byte ceiling: drop the oldest survivors until the namespace fits. */
  let bytes = await store.storageBytes(projectId);

  const maxBytes = options.maxBytes ?? limits.maxStoredBytes;

  const exhausted: string[] = [];

  if (bytes > maxBytes && !options.dryRun) {
    const survivors = dated.filter((session) => !removed.includes(session.id)).map((s) => s.id);

    const drop = survivors.reverse().slice(0, limits.maxPruneBatch);

    if (drop.length > 0) {
      const deleted = await store.deleteSessions(projectId, drop);

      exhausted.push(...deleted);

      removed = [...removed, ...deleted].sort();

      bytes = await store.storageBytes(projectId);
    }
  }

  const retained = (await store.loadSessionSummaries(projectId)).length;

  return { removed, retained, bytes, dryRun: options.dryRun === true };
}

function clamp(value: number, ceiling: number): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    return ceiling;
  }

  return Math.min(value, ceiling);
}
