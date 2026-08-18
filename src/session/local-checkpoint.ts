import type { ProjectManifest } from '../core/types.js';

import type { NormalizedSessionEvent, SessionIdentity } from './types.js';

import { extractWorkObservations } from '../work-continuity/extractor.js';

import { applyObservationsToLocalWorkState } from '../work-continuity/local-work-state.js';

import { writeStableWorkStateToCurrent } from '../work-continuity/work-state-current.js';

import { writeSessionOrigin } from '../work-continuity/session-origin.js';

import { captureLocalSmartHandoff } from '../work-continuity/handoff.js';

import { writeDurableMemoryCheckpoint } from './durable-checkpoint.js';

export interface LocalCheckpointResult {
  updated: boolean;

  observations: number;
}

/**
 * Crash-safe LOCAL projection.
 *
 * Important:
 * - no remote storage
 * - no LLM
 * - no embeddings
 * - no network
 *
 * Session WAL is already fsync'd before this function runs.
 * This projection makes current work recoverable even when
 * remote storage is unavailable or SSH/process dies suddenly.
 */
export function checkpointLocalSession(
  project: ProjectManifest,
  identity: SessionIdentity,
  events: NormalizedSessionEvent[]
): LocalCheckpointResult {
  if (process.env.TOOLNET_LOCAL_CHECKPOINT === '0' || events.length === 0) {
    return {
      updated: false,
      observations: 0,
    };
  }

  const observations = extractWorkObservations(identity, events);

  if (observations.length === 0) {
    return {
      updated: false,
      observations: 0,
    };
  }

  const workState = applyObservationsToLocalWorkState(project, observations);

  writeStableWorkStateToCurrent(project, workState);

  writeSessionOrigin(project, {
    agent: identity.agent,

    nativeSessionId: identity.nativeSessionId,

    observations,

    workState,
  });

  /*
   * Important conversations / rules / decisions / fixes
   * are checkpointed locally immediately.
   *
   * This is independent from idle and remote storage.
   */
  try {
    writeDurableMemoryCheckpoint(project, identity, events, workState);
  } catch {
    // WAL + current work remain authoritative.
  }

  /*
   * Local Smart Handoff is refreshed after every
   * meaningful event batch, not only remote flush.
   */
  try {
    captureLocalSmartHandoff({
      project,

      identity,

      state: workState,

      reason: 'continuous-checkpoint',

      sequence: events.at(-1)?.sequence ?? 0,
    });
  } catch {
    // Never break WAL capture.
  }

  return {
    updated: true,
    observations: observations.length,
  };
}
