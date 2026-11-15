import { createHash } from 'node:crypto';

import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

import { SessionCore } from '../core.js';

import { shouldFilterEvent, filterEventData } from '../transcript-filter.js';
import { extractSessionMemory } from '../session-extractor.js';
import { shouldArchiveRawTranscript, shouldArchiveRemote } from '../session-memory-policy.js';
import { syncMaterialization, type SyncMaterialization } from '../sync-materialization.js';

import { readGeminiTranscript } from './transcript.js';

export type GeminiHookEvent = 'SessionStart' | 'SessionEnd';

export interface GeminiSyncOptions {
  project: ProjectManifest;

  storage: StorageProvider;

  sessionId: string;

  cwd?: string;

  transcriptPath?: string;

  hookEvent?: GeminiHookEvent;
}

export interface GeminiSyncResult {
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

export async function syncGeminiSession(options: GeminiSyncOptions): Promise<GeminiSyncResult> {
  const sessionId = options.sessionId.trim();

  if (!sessionId) {
    throw new Error('Gemini session ID is required');
  }

  const cwd = options.cwd ?? options.project.rootPath;

  const core = new SessionCore({
    project: options.project,
    storage: options.storage,
    agent: 'gemini',
    nativeSessionId: sessionId,
    metadata: {
      source: 'gemini-hook',
      cwd,
      transcriptPath: options.transcriptPath,
    },
    eventContext: {
      source: 'gemini',
      cwd,
    },
  });

  const state = core.status();
  const events = [];

  if (state.lastSequence === 0) {
    events.push({
      type: 'session_start' as const,
      sourceEventId: `gemini:${sessionId}:start`,
      data: {
        sessionId,
        cwd,
        transcriptPath: options.transcriptPath,
      },
      provenance: {
        source: 'gemini-hook',
        ...(options.transcriptPath ? { sourcePath: options.transcriptPath } : {}),
      },
    });
  }

  const messages = options.transcriptPath ? readGeminiTranscript(options.transcriptPath) : [];

  for (const [index, message] of messages.entries()) {
    const data = { role: message.role, content: message.text, sessionId };

    if (shouldFilterEvent(data)) {
      continue;
    }

    events.push({
      type: message.role === 'user' ? ('user_prompt' as const) : ('assistant_message' as const),
      role: message.role,
      ...(message.timestamp ? { timestamp: message.timestamp } : {}),
      sourceEventId: `gemini:${sessionId}:msg:${index}:${digest(message.text)}`,
      data: filterEventData(data),
      provenance: {
        source: 'gemini-transcript',
        ...(options.transcriptPath ? { sourcePath: options.transcriptPath } : {}),
        sourceOffset: index,
      },
    });
  }

  if (options.hookEvent === 'SessionEnd') {
    events.push({
      type: 'session_end' as const,
      sourceEventId: `gemini:${sessionId}:end`,
      data: {
        sessionId,
        cwd,
        transcriptPath: options.transcriptPath,
      },
      provenance: {
        source: 'gemini-hook',
      },
    });
  }

  const recorded = core.recordMany(events);

  if (recorded.length > 0 && messages.length > 0) {
    core.setSourceCursor('gemini.transcript.messages', messages.length);
  }

  if (recorded.length > 0) {
    try {
      const extraction = extractSessionMemory(
        messages.map((message) => JSON.stringify({ role: message.role, content: message.text })),
        sessionId
      );

      core.setSourceCursor('gemini.session.summary', extraction.summary);
      core.setSourceCursor('gemini.session.facts_count', extraction.durableFacts.length);

      if (shouldArchiveRawTranscript() && !shouldArchiveRemote()) {
        core.setSourceCursor('gemini.raw_transcript.archived', 'local');
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
