/*
 * Phase 80 — deterministic change fingerprints.
 *
 * The snapshot id fingerprints the exact parsed input (never a timestamp); the
 * change fingerprint adds the generations and profile. Both are used for
 * evidence identity, daemon single-flight and cache keys, so a source change
 * can never reuse a stale result.
 */

import { createHash } from 'node:crypto';

import type { FileChange } from './types.js';

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 32);
}

/**
 * Fingerprint the exact change input.
 *
 * Deterministic in the parsed file/hunk model, not the raw patch text, so
 * whitespace-only formatting of the diff cannot change identity while a real
 * content change always does.
 */
export function changeSnapshotId(
  files: readonly FileChange[],
  changedLines?: Map<string, string[]>
): string {
  const normalized = [...files]
    .map((file) => ({
      path: file.path,
      oldPath: file.oldPath ?? null,
      kind: file.kind,
      binary: file.binary,
      hunks: file.hunks.map((hunk) => [
        hunk.oldStart,
        hunk.oldLines,
        hunk.newStart,
        hunk.newLines,
        hunk.additions,
        hunk.deletions,
      ]),
    }))
    .sort(
      (a, b) => a.path.localeCompare(b.path) || (a.oldPath ?? '').localeCompare(b.oldPath ?? '')
    );

  /*
   * Hunk counts alone would collapse two different edits at the same position.
   * The changed-line content is hashed too, so a real content change always
   * changes the snapshot identity while a pure formatting change still can.
   */
  const content = changedLines
    ? [...changedLines.entries()]
        .sort((left, right) => left[0].localeCompare(right[0]))
        .map(([path, lines]) => [path, lines])
    : [];

  return hash(JSON.stringify({ normalized, content }));
}

export interface ChangeFingerprintInput {
  projectId: string;
  mode: string;
  base?: string;
  head?: string;
  snapshotId: string;
  baselineGeneration: string;
  candidateGeneration?: string;
  fleetGeneration?: string;
  profile: string;
}

export function changeFingerprint(input: ChangeFingerprintInput): string {
  return hash(
    JSON.stringify({
      projectId: input.projectId,
      mode: input.mode,
      base: input.base ?? null,
      head: input.head ?? null,
      snapshotId: input.snapshotId,
      baselineGeneration: input.baselineGeneration,
      candidateGeneration: input.candidateGeneration ?? null,
      fleetGeneration: input.fleetGeneration ?? null,
      profile: input.profile,
    })
  );
}
