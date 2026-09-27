/*
 * Phase 81 — deterministic contract fingerprints.
 *
 * A snapshot fingerprint depends only on the normalised contract set, and a
 * report fingerprint additionally pins the analysed generations and profile.
 * There is no timestamp anywhere in either, so the same semantic input always
 * produces the same identity.
 */

import { createHash } from 'node:crypto';

import { entryCanonicalJson } from './shape.js';

import type { ContractEntry, ContractSnapshot } from './types.js';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 32);
}

/** Deterministic fingerprint of the normalised contract set. */
export function contractSnapshotFingerprint(entries: readonly ContractEntry[]): string {
  const canonical = [...entries]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map(entryCanonicalJson)
    .join('\n');

  return sha256(canonical);
}

export function makeSnapshot(input: {
  generation: string;
  entries: readonly ContractEntry[];
  unsupported: ContractSnapshot['unsupported'];
  unresolvedRefs: ContractSnapshot['unresolvedRefs'];
}): ContractSnapshot {
  const entries = [...input.entries].sort((left, right) => left.id.localeCompare(right.id));

  return {
    generation: input.generation,
    fingerprint: contractSnapshotFingerprint(entries),
    entries,
    unsupported: [...input.unsupported].sort(
      (left, right) =>
        left.path.localeCompare(right.path) || left.reason.localeCompare(right.reason)
    ),
    unresolvedRefs: [...input.unresolvedRefs].sort(
      (left, right) => left.path.localeCompare(right.path) || left.ref.localeCompare(right.ref)
    ),
  };
}

export interface ContractReportFingerprintInput {
  projectId: string;
  baselineFingerprint: string;
  candidateFingerprint: string;
  baselineGeneration: string;
  candidateGeneration?: string;
  fleetGeneration?: string;
  profile: string;
}

export function contractReportFingerprint(input: ContractReportFingerprintInput): string {
  return sha256(
    [
      input.projectId,
      input.baselineGeneration,
      input.candidateGeneration ?? '',
      input.fleetGeneration ?? '',
      input.profile,
      input.baselineFingerprint,
      input.candidateFingerprint,
    ].join('|')
  );
}
