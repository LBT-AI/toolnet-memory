import { existsSync } from 'node:fs';

import { homedir } from 'node:os';

import { join, resolve } from 'node:path';

import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

import { SessionCore } from '../core.js';

import { readAgyTranscript } from './transcript.js';

import { shouldFilterEvent, filterEventData } from '../transcript-filter.js';

export interface AgySyncOptions {
  project: ProjectManifest;

  storage: StorageProvider;

  conversationId: string;

  transcriptPath: string;

  workspacePaths?: string[];

  artifactDirectoryPath?: string;

  modelName?: string;

  phase?: 'pre' | 'post' | 'stop' | 'recover';

  fullyIdle?: boolean;

  terminationReason?: string;

  error?: string;
}

export interface AgySyncResult {
  conversationId: string;

  imported: number;

  eventCount: number;

  chunkCount: number;

  status: string;

  transcriptOffset: number;

  reset: boolean;
}

function expandHome(value: string): string {
  if (value === '~') {
    return homedir();
  }

  if (value.startsWith('~/')) {
    return join(homedir(), value.slice(2));
  }

  return value;
}

export async function syncAgySession(options: AgySyncOptions): Promise<AgySyncResult> {
  const conversationId = options.conversationId.trim();

  if (!conversationId) {
    throw new Error('Agy conversationId is required');
  }

  const transcriptPath = resolve(expandHome(options.transcriptPath));

  const core = new SessionCore({
    project: options.project,

    storage: options.storage,

    agent: 'agy',

    nativeSessionId: conversationId,

    metadata: {
      source: 'antigravity-hook',

      transcriptPath,

      workspacePaths: options.workspacePaths ?? [],

      artifactDirectoryPath: options.artifactDirectoryPath,

      modelName: options.modelName,
    },
  });

  const state = core.status();

  const rawCursor = state.sourceCursors['agy.transcript.offset'];

  const offset = rawCursor ? Number(rawCursor) : 0;

  const transcript = readAgyTranscript(transcriptPath, {
    offset: Number.isFinite(offset) ? offset : 0,
  });

  const events = [];

  if (state.lastSequence === 0) {
    events.push({
      type: 'session_start' as const,

      sourceEventId: `agy:${conversationId}:start`,

      data: {
        workspacePaths: options.workspacePaths ?? [],

        transcriptPath,

        modelName: options.modelName,
      },

      provenance: {
        source: 'antigravity-hook',

        sourcePath: transcriptPath,
      },
    });
  }

  if (transcript.reset) {
    events.push({
      type: 'custom' as const,

      sourceEventId: `agy:${conversationId}:transcript-reset:${transcript.nextOffset}`,

      data: {
        event: 'transcript_reset',

        transcriptPath,
      },

      provenance: {
        source: 'agy-transcript',

        sourcePath: transcriptPath,
      },
    });
  }

  // Filter noisy events before recording
  const filteredEvents = transcript.events
    .filter((event) => {
      if (shouldFilterEvent(event.data as Record<string, unknown>)) {
        return false;
      }
      return true;
    })
    .map((event) => ({
      ...event,
      data: filterEventData(event.data as Record<string, unknown>),
    }));

  events.push(...filteredEvents);

  if (options.phase === 'stop') {
    if (options.error) {
      events.push({
        type: 'error' as const,

        sourceEventId: [
          'agy',
          conversationId,
          'stop-error',
          options.terminationReason ?? '',
          transcript.nextOffset,
        ].join(':'),

        data: {
          error: options.error,

          terminationReason: options.terminationReason,

          fullyIdle: options.fullyIdle,
        },

        provenance: {
          source: 'antigravity-stop-hook',
        },
      });
    }

    /*
     * Stop is NOT permanent SessionEnd.
     * The same conversation UUID may be resumed later.
     */
    if (options.fullyIdle) {
      events.push({
        type: 'session_idle' as const,

        sourceEventId: ['agy', conversationId, 'idle', transcript.nextOffset].join(':'),

        data: {
          terminationReason: options.terminationReason,

          fullyIdle: true,
        },

        provenance: {
          source: 'antigravity-stop-hook',
        },
      });
    }
  }

  const recorded = core.recordMany(events);

  core.setSourceCursor('agy.transcript.offset', transcript.nextOffset);

  if (options.phase) {
    core.setSourceCursor('agy.last.phase', options.phase);
  }

  const flushed = await core.flush();

  return {
    conversationId,

    imported: recorded.length,

    eventCount: flushed.eventCount,

    chunkCount: flushed.chunkCount,

    status: flushed.status,

    transcriptOffset: transcript.nextOffset,

    reset: transcript.reset,
  };
}

export function defaultAgyTranscript(conversationId: string): string {
  return join(
    homedir(),
    '.gemini',
    'antigravity-cli',
    'brain',
    conversationId,
    '.system_generated',
    'logs',
    'transcript.jsonl'
  );
}

export function agyTranscriptExists(conversationId: string): boolean {
  return existsSync(defaultAgyTranscript(conversationId));
}
