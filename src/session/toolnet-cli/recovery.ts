import { existsSync } from 'node:fs';

import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

import { listToolNetCliProjectBindings } from './project-binding.js';

import {
  syncToolNetCliSession,
  toolNetCliSessionFile,
  type ToolNetCliSyncResult,
} from './adapter.js';

export interface RecoverToolNetCliSessionsOptions {
  project: ProjectManifest;

  storage: StorageProvider;

  sessionsDir?: string;

  bindingFile?: string;

  localOnly?: boolean;

  idle?: boolean;
}

export interface ToolNetCliRecoveryItem {
  nativeSessionId: string;

  status: 'synced' | 'missing' | 'error';

  result?: ToolNetCliSyncResult;

  error?: string;
}

export interface ToolNetCliRecoveryResult {
  bound: number;

  synced: number;

  missing: number;

  failed: number;

  importedMessages: number;

  recordedEvents: number;

  sessions: ToolNetCliRecoveryItem[];
}

/**
 * Recover every ToolNet CLI session explicitly bound to the current
 * ToolNet project.
 *
 * Guard rails:
 * - Never scans arbitrary native sessions.
 * - Never binds implicitly.
 * - Never imports a session belonging to another project.
 * - Native session files remain read-only.
 * - SessionCore cursor/dedupe handles incremental replay.
 */
export async function recoverBoundToolNetCliSessions(
  options: RecoverToolNetCliSessionsOptions
): Promise<ToolNetCliRecoveryResult> {
  const bindings = listToolNetCliProjectBindings(options.project, {
    bindingFile: options.bindingFile,
  });

  const sessions: ToolNetCliRecoveryItem[] = [];

  let synced = 0;
  let missing = 0;
  let failed = 0;
  let importedMessages = 0;
  let recordedEvents = 0;

  for (const binding of bindings) {
    const nativeSessionId = binding.nativeSessionId;

    const sourceFile = toolNetCliSessionFile(nativeSessionId, options.sessionsDir);

    if (!existsSync(sourceFile)) {
      missing += 1;

      sessions.push({
        nativeSessionId,

        status: 'missing',
      });

      continue;
    }

    try {
      const result = await syncToolNetCliSession({
        project: options.project,

        storage: options.storage,

        nativeSessionId,

        sessionsDir: options.sessionsDir,

        bindingFile: options.bindingFile,

        localOnly: options.localOnly,

        idle: options.idle,
      });

      synced += 1;

      importedMessages += result.importedMessages;

      recordedEvents += result.recordedEvents;

      sessions.push({
        nativeSessionId,

        status: 'synced',

        result,
      });
    } catch (error) {
      failed += 1;

      sessions.push({
        nativeSessionId,

        status: 'error',

        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    bound: bindings.length,

    synced,

    missing,

    failed,

    importedMessages,

    recordedEvents,

    sessions,
  };
}
