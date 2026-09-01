import type { ProjectManifest } from '../core/types.js';

import type { StorageProvider } from '../storage/types.js';

import { loadWorkState } from '../work-continuity/reducer.js';

import { ConvergentMemoryStore } from './memory-projection.js';

const DEFAULT_INTERVAL_MS = 30_000;

const DEFAULT_RETRY_COOLDOWN_MS = 60_000;

const MIN_INTERVAL_MS = 1_000;

export interface ProjectRefreshResult {
  startedAt: string;

  finishedAt: string;

  memories: number;

  workAvailable: boolean;
}

export interface BackgroundRefreshStatus {
  running: boolean;

  refreshing: boolean;

  runs: number;

  successfulRuns: number;

  failedRuns: number;

  skippedRuns: number;

  lastRunAt?: string;

  lastSuccessAt?: string;

  lastErrorAt?: string;

  lastError?: string;
}

export interface BackgroundRefreshOptions {
  project: ProjectManifest;

  storage: StorageProvider;

  intervalMs?: number;

  retryCooldownMs?: number;

  initialDelayMs?: number;

  onRefresh?: (result: ProjectRefreshResult) => void;

  onError?: (error: Error) => void;
}

export interface BackgroundRefreshController {
  runOnce(): Promise<ProjectRefreshResult | null>;

  stop(): void;

  status(): BackgroundRefreshStatus;
}

function normalizedDelay(value: number | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  if (!Number.isFinite(value)) {
    return fallback;
  }

  if (value < MIN_INTERVAL_MS) {
    return MIN_INTERVAL_MS;
  }

  return Math.floor(value);
}

function errorValue(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error));
}

export async function refreshProjectStateOnce(
  project: ProjectManifest,
  storage: StorageProvider
): Promise<ProjectRefreshResult> {
  const startedAt = new Date().toISOString();

  const memory = new ConvergentMemoryStore(storage);

  /*
   * Memory:
   * immutable operation log -> current.json cache.
   *
   * This must not append new memory operations.
   */
  const memories = await memory.refreshProjection(project.id);

  /*
   * Work:
   * work/observations/* -> deterministic current.json cache.
   *
   * loadWorkState() rebuilds whenever authoritative
   * observation batches exist.
   */
  const work = await loadWorkState(project, storage);

  return {
    startedAt,

    finishedAt: new Date().toISOString(),

    memories: memories.length,

    workAvailable: work !== null,
  };
}

export function startProjectBackgroundRefresh(
  options: BackgroundRefreshOptions
): BackgroundRefreshController {
  const intervalMs = normalizedDelay(options.intervalMs, DEFAULT_INTERVAL_MS);

  const retryCooldownMs = normalizedDelay(options.retryCooldownMs, DEFAULT_RETRY_COOLDOWN_MS);

  const initialDelayMs = Math.max(0, Math.floor(options.initialDelayMs ?? 250));

  let running = true;

  let refreshing = false;

  let timer: NodeJS.Timeout | null = null;

  let runs = 0;

  let successfulRuns = 0;

  let failedRuns = 0;

  let skippedRuns = 0;

  let lastRunAt: string | undefined;

  let lastSuccessAt: string | undefined;

  let lastErrorAt: string | undefined;

  let lastError: string | undefined;

  const schedule = (delayMs: number): void => {
    if (!running) {
      return;
    }

    timer = setTimeout(() => {
      void runScheduled();
    }, delayMs);

    /*
     * Background refresh must never keep a CLI alive
     * after the parent agent itself has finished.
     */
    timer.unref?.();
  };

  const runOnce = async (): Promise<ProjectRefreshResult | null> => {
    if (!running) {
      return null;
    }

    if (refreshing) {
      skippedRuns += 1;

      return null;
    }

    refreshing = true;

    runs += 1;

    lastRunAt = new Date().toISOString();

    try {
      const result = await refreshProjectStateOnce(options.project, options.storage);

      successfulRuns += 1;

      lastSuccessAt = result.finishedAt;

      lastError = undefined;

      options.onRefresh?.(result);

      return result;
    } catch (error) {
      const normalized = errorValue(error);

      failedRuns += 1;

      lastErrorAt = new Date().toISOString();

      lastError = normalized.message;

      options.onError?.(normalized);

      /*
       * Background sync failure is isolated.
       * Never propagate into the coding agent.
       */
      return null;
    } finally {
      refreshing = false;
    }
  };

  const runScheduled = async (): Promise<void> => {
    if (!running) {
      return;
    }

    const failuresBefore = failedRuns;

    await runOnce();

    if (!running) {
      return;
    }

    const failed = failedRuns > failuresBefore;

    schedule(failed ? retryCooldownMs : intervalMs);
  };

  const stop = (): void => {
    if (!running) {
      return;
    }

    running = false;

    if (!timer) {
      return;
    }

    clearTimeout(timer);

    timer = null;
  };

  const status = (): BackgroundRefreshStatus => ({
    running,

    refreshing,

    runs,

    successfulRuns,

    failedRuns,

    skippedRuns,

    lastRunAt,

    lastSuccessAt,

    lastErrorAt,

    lastError,
  });

  schedule(initialDelayMs);

  return {
    runOnce,

    stop,

    status,
  };
}
