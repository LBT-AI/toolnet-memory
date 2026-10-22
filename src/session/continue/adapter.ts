import { createHash } from 'node:crypto';

import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

import { SessionCore } from '../core.js';

import { shouldFilterEvent, filterEventData } from '../transcript-filter.js';
import { extractSessionMemory } from '../session-extractor.js';
import { shouldArchiveRawTranscript, shouldArchiveRemote } from '../session-memory-policy.js';
import { syncMaterialization, type SyncMaterialization } from '../sync-materialization.js';

import { readContinueSession } from './transcript.js';

export interface ContinueSyncOptions {
  project: ProjectManifest;

  storage: StorageProvider;

  sessionFile: string;

  cwd?: string;
}

export interface ContinueSyncResult {
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

export async function syncContinueSession(
  options: ContinueSyncOptions
): Promise<ContinueSyncResult> {
  const session = readContinueSession(options.sessionFile);

  const sessionId = session.sessionId ?? '';

  if (!sessionId) {
    throw new Error(`Continue session file has no sessionId: ${options.sessionFile}`);
  }

  const cwd = options.cwd ?? session.workspaceDirectory ?? options.project.rootPath;

  const core = new SessionCore({
    project: options.project,
    storage: options.storage,
    agent: 'continue',
    nativeSessionId: sessionId,
    metadata: {
      source: 'continue-session-file',
      cwd,
      sessionFile: options.sessionFile,
    },
    eventContext: {
      source: 'continue',
      cwd,
    },
  });

  const state = core.status();
  const events = [];

  if (state.lastSequence === 0) {
    events.push({
      type: 'session_start' as const,
      sourceEventId: `continue:${sessionId}:start`,
      data: {
        sessionId,
        cwd,
        title: session.title,
        sessionFile: options.sessionFile,
      },
      provenance: {
        source: 'continue-session-file',
        sourcePath: options.sessionFile,
      },
    });
  }

  for (const [index, message] of session.messages.entries()) {
    const data = { role: message.role, content: message.text, sessionId };

    if (shouldFilterEvent(data)) {
      continue;
    }

    events.push({
      type: message.role === 'user' ? ('user_prompt' as const) : ('assistant_message' as const),
      role: message.role,
      ...(message.timestamp ? { timestamp: message.timestamp } : {}),
      sourceEventId: `continue:${sessionId}:msg:${index}:${digest(message.text)}`,
      data: filterEventData(data),
      provenance: {
        source: 'continue-session-file',
        sourcePath: options.sessionFile,
        sourceOffset: index,
      },
    });
  }

  const lastTimestamp = session.messages.at(-1)?.timestamp;

  events.push({
    type: 'session_end' as const,
    ...(lastTimestamp ? { timestamp: lastTimestamp } : {}),
    sourceEventId: `continue:${sessionId}:end`,
    data: {
      sessionId,
      cwd,
      sessionFile: options.sessionFile,
      messageCount: session.messages.length,
    },
    provenance: {
      source: 'continue-session-file',
      sourcePath: options.sessionFile,
    },
  });

  const recorded = core.recordMany(events);

  if (recorded.length > 0) {
    try {
      const extraction = extractSessionMemory(
        session.messages.map((message) =>
          JSON.stringify({ role: message.role, content: message.text })
        ),
        sessionId
      );

      core.setSourceCursor('continue.session.summary', extraction.summary);
      core.setSourceCursor('continue.session.facts_count', extraction.durableFacts.length);
      core.setSourceCursor('continue.session.messages', session.messages.length);

      if (shouldArchiveRawTranscript() && !shouldArchiveRemote()) {
        core.setSourceCursor('continue.raw_transcript.archived', 'local');
      }
    } catch {
      // Extraction failure must not break sync.
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
