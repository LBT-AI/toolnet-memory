import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

import { SessionCore } from '../core.js';

import { inspectCodexRollout, pathBelongsToProject } from './discovery.js';

import { readCodexRollout } from './rollout.js';

import { shouldFilterEvent, filterEventData } from '../transcript-filter.js';
import { extractSessionMemory } from '../session-extractor.js';
import { shouldArchiveRawTranscript, shouldArchiveRemote } from '../session-memory-policy.js';

import { updateCurrentFromSession } from '../../work-continuity/auto-current.js';

export interface CodexSyncOptions {
  project: ProjectManifest;

  storage: StorageProvider;

  threadId: string;

  rolloutPath: string;

  cwd?: string;

  turnId?: string;

  client?: string;

  idle?: boolean;
}

export async function syncCodexSession(options: CodexSyncOptions) {
  const threadId = options.threadId.trim();

  if (!threadId) {
    throw new Error('Codex thread ID is required');
  }

  const meta = inspectCodexRollout(options.rolloutPath);

  const cwd = options.cwd ?? meta.cwd;

  if (cwd && !pathBelongsToProject(options.project.rootPath, cwd)) {
    throw new Error(`Codex thread does not belong to project: ${cwd}`);
  }

  if (meta.threadId && meta.threadId !== threadId) {
    throw new Error(`Codex rollout thread mismatch: expected ${threadId}, got ${meta.threadId}`);
  }

  const core = new SessionCore({
    project: options.project,

    storage: options.storage,

    agent: 'codex',

    nativeSessionId: threadId,

    metadata: {
      source: 'codex-rollout',

      rolloutPath: options.rolloutPath,

      cwd,

      client: options.client,
    },
  });

  const state = core.status();

  const previousPath = state.sourceCursors['codex.rollout.path'];

  let offset = Number(state.sourceCursors['codex.rollout.offset'] ?? 0);

  /*
   * Future Codex may rotate a resumed thread into another rollout.
   */
  if (previousPath && previousPath !== options.rolloutPath) {
    offset = 0;
  }

  if (!Number.isFinite(offset) || offset < 0) {
    offset = 0;
  }

  const rollout = readCodexRollout(options.rolloutPath, offset);

  const events = [];

  if (state.lastSequence === 0) {
    events.push({
      type: 'session_start' as const,

      sourceEventId: `codex:${threadId}:start`,

      data: {
        threadId,
        cwd,

        rolloutPath: options.rolloutPath,

        sessionMeta: meta.raw,
      },

      provenance: {
        source: 'codex-rollout',

        sourcePath: options.rolloutPath,
      },
    });
  }

  if (previousPath && previousPath !== options.rolloutPath) {
    events.push({
      type: 'custom' as const,

      sourceEventId: `codex:${threadId}:rollout-rotation:${options.rolloutPath}`,

      data: {
        event: 'rollout_rotation',

        previousPath,

        rolloutPath: options.rolloutPath,
      },

      provenance: {
        source: 'codex-rollout',
      },
    });
  }

  if (rollout.reset) {
    events.push({
      type: 'custom' as const,

      sourceEventId: `codex:${threadId}:rollout-reset:${rollout.nextOffset}`,

      data: {
        event: 'rollout_reset',
      },

      provenance: {
        source: 'codex-rollout',

        sourcePath: options.rolloutPath,
      },
    });
  }

  // Filter noisy events before recording
  const filteredEvents = rollout.events
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

  /*
   * C3.2
   *
   * Update .toolnet/current.md from the already-filtered
   * incremental Codex events.
   *
   * LOCAL ONLY:
   * - no LLM
   * - no storage
   * - no embedding
   *
   * The notify layer refreshes handoff.md immediately after
   * syncCodexSession() returns.
   */
  if (options.idle && filteredEvents.length > 0) {
    try {
      updateCurrentFromSession(options.project, {
        agent: 'codex',
        nativeSessionId: threadId,
        events: filteredEvents,
      });
    } catch {
      // Work-state update must never break Codex sync.
    }
  }

  /*
   * AfterAgent/agent-turn-complete means this TURN is done.
   * The Codex thread may be resumed later.
   */
  if (options.idle && options.turnId) {
    events.push({
      type: 'session_idle' as const,

      sourceEventId: `codex:${threadId}:turn:${options.turnId}:idle`,

      data: {
        turnId: options.turnId,

        client: options.client,
      },

      provenance: {
        source: 'codex-notify',
      },
    });
  }

  const recorded = core.recordMany(events);

  core.setSourceCursor('codex.rollout.path', options.rolloutPath);

  core.setSourceCursor('codex.rollout.offset', rollout.nextOffset);

  if (options.turnId) {
    core.setSourceCursor('codex.last.turn', options.turnId);
  }

  // Extract session memory (summary + durable facts)
  if (options.idle && filteredEvents.length > 0) {
    try {
      const messages = filteredEvents.map((e) => JSON.stringify(e.data));
      const extraction = extractSessionMemory(messages, threadId);

      core.setSourceCursor('codex.session.summary', extraction.summary);
      core.setSourceCursor('codex.session.facts_count', extraction.durableFacts.length);

      if (shouldArchiveRawTranscript() && !shouldArchiveRemote()) {
        core.setSourceCursor('codex.raw_transcript.archived', 'local');
      }
    } catch {
      // Extraction failure should not break session sync
    }
  }

  const flushed = await core.flush();

  return {
    threadId,

    imported: recorded.length,

    rolloutEvents: rollout.events.length,

    eventCount: flushed.eventCount,

    chunkCount: flushed.chunkCount,

    status: flushed.status,

    rolloutOffset: rollout.nextOffset,

    reset: rollout.reset,
  };
}
