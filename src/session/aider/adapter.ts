import { existsSync, readFileSync } from 'node:fs';

import { join } from 'node:path';

import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

import { SessionCore } from '../core.js';

import { shouldFilterEvent } from '../transcript-filter.js';
import { extractSessionMemory } from '../session-extractor.js';
import { shouldArchiveRawTranscript, shouldArchiveRemote } from '../session-memory-policy.js';
import { syncMaterialization, type SyncMaterialization } from '../sync-materialization.js';

export interface AiderSyncOptions {
  project: ProjectManifest;
  storage: StorageProvider;
  sessionId: string;
  cwd?: string;
  historyPath?: string;
  /** Byte offset into history file for delta-only ingestion. */
  historyOffset?: number;
}

export interface AiderSyncResult {
  sessionId: string;
  imported: number;
  eventCount: number;
  chunkCount: number;
  status: string;
  reset: boolean;
  materialization?: SyncMaterialization;
}

interface AiderParsedEvent {
  type: 'user_prompt' | 'assistant_message';
  data: Record<string, unknown>;
}

interface AiderHistoryResult {
  events: AiderParsedEvent[];
  nextOffset: number;
}

function parseAiderHistory(content: string, offset = 0): AiderHistoryResult {
  const events: AiderParsedEvent[] = [];
  const lines = content.split('\n');
  let currentRole: 'user' | 'assistant' | null = null;
  let currentLines: string[] = [];

  function flushBuffer() {
    if (currentLines.length === 0) {
      return;
    }

    const text = currentLines.join('\n').trim();
    if (!text) {
      currentLines = [];
      return;
    }

    if (currentRole === 'user') {
      events.push({
        type: 'user_prompt',
        data: {
          prompt: text,
          source: 'aider-chat-history',
        },
      });
    } else if (currentRole === 'assistant') {
      events.push({
        type: 'assistant_message',
        data: {
          message: text,
          source: 'aider-chat-history',
        },
      });
    }

    currentLines = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === '' && currentRole) {
      currentLines.push('');
      continue;
    }

    if (trimmed.startsWith('> ')) {
      currentLines = [];
      currentRole = null;
      continue;
    }

    if (/^# aider chat started at \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(trimmed)) {
      flushBuffer();
      currentRole = null;
      continue;
    }

    if (trimmed.startsWith('#### ')) {
      flushBuffer();
      currentRole = 'user';
      currentLines.push(trimmed.slice(5));
      continue;
    }

    if (/^#+\s/.test(trimmed)) {
      flushBuffer();
      currentRole = null;
      continue;
    }

    if (currentRole) {
      currentLines.push(line);
    }
  }

  flushBuffer();
  return { events, nextOffset: offset + content.length };
}

export async function syncAiderSession(options: AiderSyncOptions): Promise<AiderSyncResult> {
  const sessionId = options.sessionId.trim();

  if (!sessionId) {
    throw new Error('Aider session ID is required');
  }

  const cwd = options.cwd ?? '';
  const historyPath = options.historyPath ?? join(cwd, '.aider.chat.history.md');
  const historyOffset = Number(options.historyOffset ?? 0);

  const core = new SessionCore({
    project: options.project,
    storage: options.storage,
    agent: 'aider',
    nativeSessionId: sessionId,
    metadata: {
      source: 'aider-wrapper',
      cwd,
      historyPath,
    },
    eventContext: {
      source: 'aider',
      cwd: cwd || options.project.rootPath,
    },
  });

  const events: Array<
    | {
        type: 'session_start';
        sourceEventId: string;
        data: Record<string, unknown>;
        provenance: { source: string };
      }
    | {
        type: 'session_end';
        sourceEventId: string;
        data: Record<string, unknown>;
        provenance: { source: string };
      }
    | {
        type: 'user_prompt';
        sourceEventId: string;
        data: Record<string, unknown>;
        provenance: { source: string };
      }
    | {
        type: 'assistant_message';
        sourceEventId: string;
        data: Record<string, unknown>;
        provenance: { source: string };
      }
  > = [];

  if (core.status().lastSequence === 0) {
    events.push({
      type: 'session_start',
      sourceEventId: `aider:${sessionId}:start`,
      data: { sessionId, cwd, historyPath },
      provenance: { source: 'aider-wrapper' },
    });
  }

  let parsed: AiderHistoryResult = { events: [], nextOffset: historyOffset };

  if (existsSync(historyPath)) {
    try {
      const content = readFileSync(historyPath, 'utf8');
      parsed = parseAiderHistory(content, historyOffset);
    } catch {
      // Fail-open: WAL remains for later recovery.
    }
  }

  for (let i = 0; i < parsed.events.length; i++) {
    const event = parsed.events[i];

    if (shouldFilterEvent(event.data)) {
      continue;
    }

    events.push({
      ...event,
      sourceEventId: `aider:${sessionId}:${event.type}:${i}`,
      provenance: { source: 'aider-chat-history' },
    });
  }

  events.push({
    type: 'session_end',
    sourceEventId: `aider:${sessionId}:end`,
    data: { sessionId, cwd, historyPath },
    provenance: { source: 'aider-wrapper' },
  });

  const recorded = core.recordMany(events);

  if (recorded.length > 0) {
    try {
      const messages = recorded.map((e) => JSON.stringify(e.data));
      const extraction = extractSessionMemory(messages, sessionId);

      core.setSourceCursor('aider.session.summary', extraction.summary);
      core.setSourceCursor('aider.session.facts_count', extraction.durableFacts.length);

      if (shouldArchiveRawTranscript() && !shouldArchiveRemote()) {
        core.setSourceCursor('aider.raw_transcript.archived', 'local');
      }
    } catch {
      // Extraction failure must not break session sync.
    }
  }

  core.setSourceCursor('aider.history.path', historyPath);
  core.setSourceCursor('aider.history.offset', parsed.nextOffset);

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
