import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

import { SessionCore } from '../core.js';

import { shouldFilterEvent, filterEventData } from '../transcript-filter.js';
import { extractSessionMemory } from '../session-extractor.js';
import { shouldArchiveRawTranscript, shouldArchiveRemote } from '../session-memory-policy.js';
import { syncMaterialization, type SyncMaterialization } from '../sync-materialization.js';

export interface BobSyncOptions {
  project: ProjectManifest;

  storage: StorageProvider;

  sessionId: string;

  cwd?: string;
}

export interface BobSyncResult {
  sessionId: string;

  imported: number;

  eventCount: number;

  chunkCount: number;

  status: string;

  reset: boolean;

  materialization?: SyncMaterialization;
}

export async function syncBobSession(options: BobSyncOptions): Promise<BobSyncResult> {
  const sessionId = options.sessionId.trim();

  if (!sessionId) {
    throw new Error('Bob session ID is required');
  }

  const cwd = options.cwd ?? '';

  const core = new SessionCore({
    project: options.project,

    storage: options.storage,

    agent: 'bob',

    nativeSessionId: sessionId,

    metadata: {
      source: 'bob-hook',

      cwd,
    },

    eventContext: {
      source: 'bob',

      cwd: cwd || options.project.rootPath,
    },
  });

  const events = [];

  if (core.status().lastSequence === 0) {
    events.push({
      type: 'session_start' as const,

      sourceEventId: `bob:${sessionId}:start`,

      data: {
        sessionId,

        cwd,
      },

      provenance: {
        source: 'bob-hook',
      },
    });
  }

  events.push({
    type: 'session_end' as const,

    sourceEventId: `bob:${sessionId}:end`,

    data: {
      sessionId,

      cwd,
    },

    provenance: {
      source: 'bob-hook',
    },
  });

  const recorded = core.recordMany(events);

  if (recorded.length > 0) {
    try {
      const messages = recorded.map((e) => JSON.stringify(e.data));
      const extraction = extractSessionMemory(messages, sessionId);

      core.setSourceCursor('bob.session.summary', extraction.summary);
      core.setSourceCursor('bob.session.facts_count', extraction.durableFacts.length);

      if (shouldArchiveRawTranscript() && !shouldArchiveRemote()) {
        core.setSourceCursor('bob.raw_transcript.archived', 'local');
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
