import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

import { recoverBoundToolNetCliSessions, type ToolNetCliRecoveryResult } from './recovery.js';

export interface ToolNetCliWatcherOptions {
  project: ProjectManifest;

  storage: StorageProvider;

  sessionsDir?: string;

  bindingFile?: string;

  localOnly?: boolean;

  intervalMs?: number;

  onSync?: (result: ToolNetCliRecoveryResult) => void;

  onError?: (error: Error) => void;
}

export interface ToolNetCliWatcherStatus {
  running: boolean;

  intervalMs: number;

  runs: number;

  successfulRuns: number;

  failedRuns: number;

  importedMessages: number;

  recordedEvents: number;

  lastRunAt?: string;
}

export interface ToolNetCliWatcher {
  runOnce(): Promise<ToolNetCliRecoveryResult>;

  stop(): void;

  status(): ToolNetCliWatcherStatus;
}

/**
 * Poll only ToolNet CLI sessions that were explicitly bound
 * to the current ToolNet project.
 *
 * This is NOT reported as a native lifecycle hook.
 *
 * Safety:
 * - no implicit binding
 * - no global session import
 * - no overlapping recovery runs
 * - SessionCore cursor/dedupe remains authoritative
 */
export function startBoundToolNetCliWatcher(options: ToolNetCliWatcherOptions): ToolNetCliWatcher {
  const intervalMs = options.intervalMs && options.intervalMs >= 250 ? options.intervalMs : 2_000;

  let running = true;

  let syncing = false;

  let runs = 0;

  let successfulRuns = 0;

  let failedRuns = 0;

  let importedMessages = 0;

  let recordedEvents = 0;

  let lastRunAt: string | undefined;

  let timer: ReturnType<typeof setInterval> | undefined;

  async function runOnce(): Promise<ToolNetCliRecoveryResult> {
    if (syncing) {
      return {
        bound: 0,
        synced: 0,
        missing: 0,
        failed: 0,
        importedMessages: 0,
        recordedEvents: 0,
        sessions: [],
      };
    }

    syncing = true;

    runs += 1;

    lastRunAt = new Date().toISOString();

    try {
      const result = await recoverBoundToolNetCliSessions({
        project: options.project,

        storage: options.storage,

        sessionsDir: options.sessionsDir,

        bindingFile: options.bindingFile,

        localOnly: options.localOnly,
      });

      successfulRuns += 1;

      importedMessages += result.importedMessages;

      recordedEvents += result.recordedEvents;

      options.onSync?.(result);

      return result;
    } catch (error) {
      failedRuns += 1;

      const normalized = error instanceof Error ? error : new Error(String(error));

      options.onError?.(normalized);

      throw normalized;
    } finally {
      syncing = false;
    }
  }

  timer = setInterval(() => {
    if (!running || syncing) {
      return;
    }

    void runOnce().catch(() => {
      // Error already surfaced through onError.
      // Watch loop continues.
    });
  }, intervalMs);

  return {
    runOnce,

    stop(): void {
      if (!running) {
        return;
      }

      running = false;

      if (timer) {
        clearInterval(timer);

        timer = undefined;
      }
    },

    status(): ToolNetCliWatcherStatus {
      return {
        running,

        intervalMs,

        runs,

        successfulRuns,

        failedRuns,

        importedMessages,

        recordedEvents,

        lastRunAt,
      };
    },
  };
}
