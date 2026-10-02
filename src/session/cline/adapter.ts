import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

import { SessionCore } from '../core.js';

import { extractSessionMemory } from '../session-extractor.js';

import { syncMaterialization, type SyncMaterialization } from '../sync-materialization.js';

export interface ClineSyncOptions {
  project: ProjectManifest;

  storage: StorageProvider;

  hookName: string;

  payload: Record<string, unknown>;

  cwd?: string;
}

export interface ClineSyncResult {
  hookName: string;

  imported: number;

  eventCount: number;

  chunkCount: number;

  status: string;

  reset: boolean;

  /** Canonical MemoryStore outcome once the flush boundary completed. */
  materialization?: SyncMaterialization;
}

export async function syncClineSession(options: ClineSyncOptions): Promise<ClineSyncResult> {
  const cwd = options.cwd ?? '';

  const sessionId = typeof options.payload.sessionId === 'string' ? options.payload.sessionId : '';

  const core = new SessionCore({
    project: options.project,

    storage: options.storage,

    agent: 'cline',

    nativeSessionId: sessionId,

    metadata: {
      source: 'cline-hook',

      hookName: options.hookName,

      cwd,
    },

    eventContext: {
      source: 'cline',

      cwd: cwd || options.project.rootPath,
    },
  });

  const events = [];

  if (options.hookName === 'TaskStart' || options.hookName === 'agent_start') {
    events.push({
      type: 'session_start' as const,

      sourceEventId: `cline:${sessionId || 'unknown'}:start`,

      data: {
        sessionId,
        cwd,
        hookName: options.hookName,
      },

      provenance: {
        source: 'cline-hook',
      },
    });
  }

  if (options.hookName === 'TaskComplete' || options.hookName === 'agent_end') {
    events.push({
      type: 'session_end' as const,

      sourceEventId: `cline:${sessionId || 'unknown'}:end`,

      data: {
        sessionId,
        cwd,
        hookName: options.hookName,
      },

      provenance: {
        source: 'cline-hook',
      },
    });
  }

  const recorded = core.recordMany(events);

  if (recorded.length > 0) {
    try {
      const messages = recorded.map((e) => JSON.stringify(e.data));
      const extraction = extractSessionMemory(messages, sessionId || 'cline-unknown');

      core.setSourceCursor('cline.session.summary', extraction.summary);
      core.setSourceCursor('cline.session.facts_count', extraction.durableFacts.length);
    } catch {
      // Extraction failure should not break session sync
    }
  }

  const flushed = await core.flush();

  return {
    hookName: options.hookName,
    imported: recorded.length,
    eventCount: flushed.eventCount,
    chunkCount: flushed.chunkCount,
    status: flushed.status,
    reset: false,
    materialization: syncMaterialization(flushed),
  };
}
