import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

import { SessionCore } from '../core.js';

import { createSessionIdentity } from '../identity.js';

import { inspectCodexRollout, pathBelongsToProject } from './discovery.js';

import { readCodexRollout } from './rollout.js';

import { shouldFilterEvent, filterEventData } from '../transcript-filter.js';
import { extractSessionMemory } from '../session-extractor.js';
import { shouldArchiveRawTranscript, shouldArchiveRemote } from '../session-memory-policy.js';

import { extractWorkObservations } from '../../work-continuity/extractor.js';
import { applyObservationsToLocalWorkState } from '../../work-continuity/local-work-state.js';
import { writeStableWorkStateToCurrent } from '../../work-continuity/work-state-current.js';
import { writeSessionOrigin } from '../../work-continuity/session-origin.js';

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

    eventContext: {
      source: 'codex',

      cwd: cwd ?? options.project.rootPath,

      turnId: options.turnId,
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
   * C3.3
   *
   * Convert the already-filtered incremental Codex events
   * into durable WorkObservations, merge them with the
   * previous LOCAL WorkState, then render current.md.
   *
   * This keeps TODO/Phase status stable across turns.
   *
   * LOCAL ONLY:
   * - no LLM
   * - no remote storage
   * - no embedding
   */
  if (filteredEvents.length > 0) {
    try {
      /*
       * Use the canonical identity builder.
       *
       * Codex session/thread identity is provenance/runtime metadata only.
       * It must never create a separate project-memory partition.
       */
      const identity = createSessionIdentity(options.project, 'codex', threadId);

      const normalizedForWork = filteredEvents.map((event, index) => ({
        version: 1 as const,

        id: `codex-work-${threadId}-${event.sourceSequence ?? index}`,

        sequence: index + 1,

        projectId: options.project.id,

        agent: 'codex',

        nativeSessionId: threadId,

        type: event.type,

        timestamp: event.timestamp ?? new Date().toISOString(),

        role: event.role,

        sourceEventId: event.sourceEventId,

        sourceSequence: event.sourceSequence,

        data: event.data ?? {},

        provenance: event.provenance ?? {},
      }));

      const observations = extractWorkObservations(identity, normalizedForWork);

      const workState = applyObservationsToLocalWorkState(options.project, observations);

      writeStableWorkStateToCurrent(options.project, workState);

      /*
       * C3.4
       *
       * Keep metadata about the exact session that
       * produced the latest work state.
       */
      writeSessionOrigin(options.project, {
        agent: 'codex',

        nativeSessionId: threadId,

        observations,

        workState,
      });
    } catch {
      // Stable work-state must never break Codex sync.
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
