import { createHash } from 'node:crypto';

import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

import { SessionCore } from '../core.js';

import { shouldFilterEvent, filterEventData } from '../transcript-filter.js';
import { extractSessionMemory } from '../session-extractor.js';
import { shouldArchiveRawTranscript, shouldArchiveRemote } from '../session-memory-policy.js';
import { syncMaterialization, type SyncMaterialization } from '../sync-materialization.js';

export type JunieHookEvent = 'SessionStart' | 'Stop' | 'SessionEnd';

export interface JunieSyncOptions {
  project: ProjectManifest;

  storage: StorageProvider;

  sessionId: string;

  cwd?: string;

  event: JunieHookEvent;

  lastAssistantMessage?: string;

  reason?: string;
}

export interface JunieSyncResult {
  sessionId: string;

  imported: number;

  eventCount: number;

  chunkCount: number;

  status: string;

  reset: boolean;

  materialization?: SyncMaterialization;
}

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

export async function syncJunieSession(options: JunieSyncOptions): Promise<JunieSyncResult> {
  const sessionId = options.sessionId.trim();

  if (!sessionId) {
    throw new Error('Junie session ID is required');
  }

  const cwd = options.cwd ?? options.project.rootPath;

  const core = new SessionCore({
    project: options.project,
    storage: options.storage,
    agent: 'junie',
    nativeSessionId: sessionId,
    metadata: {
      source: 'junie-hook',
      cwd,
    },
    eventContext: {
      source: 'junie',
      cwd,
    },
  });

  const state = core.status();
  const events = [];

  if (state.lastSequence === 0) {
    events.push({
      type: 'session_start' as const,
      sourceEventId: `junie:${sessionId}:start`,
      data: {
        sessionId,
        cwd,
      },
      provenance: {
        source: 'junie-hook',
      },
    });
  }

  const message = options.lastAssistantMessage?.trim();

  if (options.event === 'Stop' && message) {
    const data = { role: 'assistant', content: message, sessionId };

    if (!shouldFilterEvent(data)) {
      events.push({
        type: 'assistant_message' as const,
        role: 'assistant',
        sourceEventId: `junie:${sessionId}:stop:${digest(message)}`,
        data: filterEventData(data),
        provenance: {
          source: 'junie-hook',
        },
      });
    }
  }

  if (options.event === 'SessionEnd') {
    events.push({
      type: 'session_end' as const,
      sourceEventId: `junie:${sessionId}:end`,
      data: {
        sessionId,
        cwd,
        reason: options.reason,
      },
      provenance: {
        source: 'junie-hook',
      },
    });
  }

  const recorded = core.recordMany(events);

  if (recorded.length > 0) {
    try {
      const extraction = extractSessionMemory(
        recorded.map((event) => JSON.stringify(event.data)),
        sessionId
      );

      core.setSourceCursor('junie.session.summary', extraction.summary);
      core.setSourceCursor('junie.session.facts_count', extraction.durableFacts.length);

      if (shouldArchiveRawTranscript() && !shouldArchiveRemote()) {
        core.setSourceCursor('junie.raw_transcript.archived', 'local');
      }
    } catch {
      // Extraction failure must not break capture.
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
