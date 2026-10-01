import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

import { SessionCore } from '../core.js';

import { shouldFilterEvent, filterEventData } from '../transcript-filter.js';
import { extractSessionMemory } from '../session-extractor.js';
import { shouldArchiveRawTranscript, shouldArchiveRemote } from '../session-memory-policy.js';
import { syncMaterialization, type SyncMaterialization } from '../sync-materialization.js';

export interface QoderSyncOptions {
  project: ProjectManifest;

  storage: StorageProvider;

  sessionId: string;

  cwd?: string;

  transcriptPath?: string;
}

export interface QoderSyncResult {
  sessionId: string;

  imported: number;

  eventCount: number;

  chunkCount: number;

  status: string;

  reset: boolean;

  /** Canonical MemoryStore outcome once the flush boundary completed. */
  materialization?: SyncMaterialization;
}

export async function syncQoderSession(options: QoderSyncOptions): Promise<QoderSyncResult> {
  const sessionId = options.sessionId.trim();

  if (!sessionId) {
    throw new Error('Qoder session ID is required');
  }

  const cwd = options.cwd ?? '';

  const core = new SessionCore({
    project: options.project,

    storage: options.storage,

    agent: 'qoder',

    nativeSessionId: sessionId,

    metadata: {
      source: 'qoder-hook',

      cwd,

      transcriptPath: options.transcriptPath,
    },

    eventContext: {
      source: 'qoder',

      cwd: cwd || options.project.rootPath,
    },
  });

  const events = [];

  if (core.status().lastSequence === 0) {
    events.push({
      type: 'session_start' as const,

      sourceEventId: `qoder:${sessionId}:start`,

      data: {
        sessionId,

        cwd,

        transcriptPath: options.transcriptPath,
      },

      provenance: {
        source: 'qoder-hook',
      },
    });
  }

  events.push({
    type: 'session_end' as const,

    sourceEventId: `qoder:${sessionId}:end`,

    data: {
      sessionId,

      cwd,

      transcriptPath: options.transcriptPath,
    },

    provenance: {
      source: 'qoder-hook',
    },
  });

  const recorded = core.recordMany(events);

  if (recorded.length > 0) {
    try {
      const messages = recorded.map((e) => JSON.stringify(e.data));
      const extraction = extractSessionMemory(messages, sessionId);

      core.setSourceCursor('qoder.session.summary', extraction.summary);
      core.setSourceCursor('qoder.session.facts_count', extraction.durableFacts.length);

      if (shouldArchiveRawTranscript() && !shouldArchiveRemote()) {
        core.setSourceCursor('qoder.raw_transcript.archived', 'local');
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
