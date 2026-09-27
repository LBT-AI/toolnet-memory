/*
 * Phase 79 — Fleet participants for cross-repo runtime evidence.
 *
 * A runtime observation may cross project boundaries, but only the registered
 * Fleet scope is known and only exact identity counts. A shared URL string is
 * never enough to link two projects.
 */

import type { FleetSnapshot } from '../fleet/types.js';

import type { FleetParticipantRef } from './types.js';

/**
 * Derive the participant list from a Fleet snapshot.
 *
 * Deterministic and sorted, so standalone and daemon runs derive the same list
 * from the same persisted Fleet state.
 */
export function fleetParticipantsFromSnapshot(
  snapshot: FleetSnapshot | null | undefined
): FleetParticipantRef[] {
  if (!snapshot) {
    return [];
  }

  return snapshot.projects
    .map((project) => ({
      projectId: project.projectId,
      name: project.name,
    }))
    .sort((left, right) => left.projectId.localeCompare(right.projectId));
}
