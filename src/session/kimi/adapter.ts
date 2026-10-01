import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

import { SessionCore } from '../core.js';

import { shouldFilterEvent, filterEventData } from '../transcript-filter.js';
import { extractSessionMemory } from '../session-extractor.js';
import { shouldArchiveRawTranscript, shouldArchiveRemote } from '../session-memory-policy.js';
import { syncMaterialization, type SyncMaterialization } from '../sync-materialization.js';

export interface KimiSyncOptions {
  project: ProjectManifest;

  storage: StorageProvider;

  sessionId: string;

  cwd?: string;
}

export interface KimiSyncResult {
  sessionId: string;

  imported: number;

  eventCount: number;

  chunkCount: number;

  status: string;

  reset: boolean;

  /** Canonical MemoryStore outcome once the flush boundary completed. */
  materialization?: SyncMaterialization;
}

export async function syncKimiSession(options: KimiSyncOptions): Promise<KimiSyncResult> {
  const sessionId = options.sessionId.trim();

  if (!sessionId) {
    throw new Error('Kimi session ID is required');
  }

  const cwd = options.cwd ?? '';

  const core = new SessionCore({
    project: options.project,

    storage: options.storage,

    agent: 'kimi',

    nativeSessionId: sessionId,

    metadata: {
      source: 'kimi-hook',

      cwd,
    },

    eventContext: {
      source: 'kimi',

      cwd: cwd || options.project.rootPath,
    },
  });

  const events = [];

  if (core.status().lastSequence === 0) {
    events.push({
      type: 'session_start' as const,

      sourceEventId: `kimi:${sessionId}:start`,

      data: {
        sessionId,

        cwd,
      },

      provenance: {
        source: 'kimi-hook',
      },
    });
  }

  events.push({
    type: 'session_end' as const,

    sourceEventId: `kimi:${sessionId}:end`,

    data: {
      sessionId,

      cwd,
    },

    provenance: {
      source: 'kimi-hook',
    },
  });

  const recorded = core.recordMany(events);

  if (recorded.length > 0) {
    try {
      const messages = recorded.map((e) => JSON.stringify(e.data));
      const extraction = extractSessionMemory(messages, sessionId);

      core.setSourceCursor('kimi.session.summary', extraction.summary);
      core.setSourceCursor('kimi.session.facts_count', extraction.durableFacts.length);

      if (shouldArchiveRawTranscript() && !shouldArchiveRemote()) {
        core.setSourceCursor('kimi.raw_transcript.archived', 'local');
      }
    } catch {
      // Extraction failure should not break session sync
    }
  }

  const flushed = await core.flush();

  return {
    sessionId,

    imported: recorded.length,

    eventCount: flushed.eventCount,

    chunkCount: flushed.chunkCount,

    status: flushed.status,

    reset: false,

    materialization: syncMaterialization(flushed),
  };
}
