import type { ProjectManifest } from '../core/types.js';

import type { NormalizedSessionEvent, SessionIdentity } from './types.js';

import { extractWorkObservations } from '../work-continuity/extractor.js';

import { applyObservationsToLocalWorkState } from '../work-continuity/local-work-state.js';

import { writeStableWorkStateToCurrent } from '../work-continuity/work-state-current.js';

import { writeSessionOrigin } from '../work-continuity/session-origin.js';

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

  return {
    updated: true,
    observations: observations.length,
  };
}
