import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

import { SessionCore } from '../core.js';

import { extractSessionMemory } from '../session-extractor.js';

import { syncMaterialization, type SyncMaterialization } from '../sync-materialization.js';

export interface RovoSyncOptions {
  project: ProjectManifest;

  storage: StorageProvider;

  eventType: string;

  payload: Record<string, unknown>;

  cwd?: string;
}

export interface RovoSyncResult {
  eventType: string;

  imported: number;

  eventCount: number;

  chunkCount: number;

  status: string;

  reset: boolean;

  /** Canonical MemoryStore outcome once the flush boundary completed. */
  materialization?: SyncMaterialization;
}

export async function syncRovoSession(options: RovoSyncOptions): Promise<RovoSyncResult> {
  const cwd = options.cwd ?? '';

  const sessionId =
    typeof options.payload.session_id === 'string' ? options.payload.session_id : 'rovo-unknown';

  const core = new SessionCore({
    project: options.project,

    storage: options.storage,

    agent: 'rovo',

    nativeSessionId: sessionId,

    metadata: {
      source: 'rovo-hook',

      eventType: options.eventType,

      cwd,
    },

    eventContext: {
      source: 'rovo',

      cwd: cwd || options.project.rootPath,
    },
  });

  const events = [];

  if (options.eventType === 'session_end') {
    events.push({
      type: 'session_end' as const,

      sourceEventId: `rovo:${sessionId}:end`,

      data: {
        sessionId,
        cwd,
        eventType: options.eventType,
      },

      provenance: {
        source: 'rovo-hook',
      },
    });
  } else {
    events.push({
      type: 'session_idle' as const,

      sourceEventId: `rovo:${sessionId}:${options.eventType}`,

      data: {
        sessionId,
        cwd,
        eventType: options.eventType,
      },

      provenance: {
        source: 'rovo-hook',
      },
    });
  }

  const recorded = core.recordMany(events);

  if (recorded.length > 0) {
    try {
      const messages = recorded.map((e) => JSON.stringify(e.data));
      const extraction = extractSessionMemory(messages, sessionId);

      core.setSourceCursor('rovo.session.summary', extraction.summary);
      core.setSourceCursor('rovo.session.facts_count', extraction.durableFacts.length);
    } catch {
      // Extraction failure should not break session sync
    }
  }

  const flushed = await core.flush();

  return {
    eventType: options.eventType,
    imported: recorded.length,
    eventCount: flushed.eventCount,
    chunkCount: flushed.chunkCount,
    status: flushed.status,
    reset: false,
    materialization: syncMaterialization(flushed),
  };
}
