/*
 * Phase 82 — deterministic test selection and execution fingerprints.
 *
 * Identity never contains a timestamp. A selection is bound to the change
 * fingerprint and generations it was computed against, so a selection made for
 * D1 can never be used to verify D2.
 */

import { createHash } from 'node:crypto';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 32);
}

/** Bump when the selection algorithm's semantics change. */
export const TEST_SELECTION_ALGORITHM_VERSION = 1;

export interface TestSelectionFingerprintInput {
  projectId: string;
  changeFingerprint?: string;
  contractFingerprint?: string;
  baselineGeneration: string;
  candidateGeneration?: string;
  fleetGeneration?: string;
  profile: string;
  selectedTestIds: readonly string[];
}

export function testSelectionFingerprint(input: TestSelectionFingerprintInput): string {
  return sha256(
    [
      `v${TEST_SELECTION_ALGORITHM_VERSION}`,
      input.projectId,
      input.changeFingerprint ?? '',
      input.contractFingerprint ?? '',
      input.baselineGeneration,
      input.candidateGeneration ?? '',
      input.fleetGeneration ?? '',
      input.profile,
      [...input.selectedTestIds].sort().join(','),
    ].join('|')
  );
}

/**
 * The selection id is the fingerprint. Executing against it is therefore
 * inherently bound to the analysed change and generations.
 */
export function testSelectionId(fingerprint: string): string {
  return `sel_${fingerprint}`;
}

export interface TestExecutionFingerprintInput {
  projectId: string;
  selectionFingerprint: string;
  changeFingerprint?: string;
  sourceGeneration: string;
  framework: string;
  runnerFingerprint: string;
  networkAllowed: boolean;
  selectedTestIds: readonly string[];
}

export function testExecutionFingerprint(input: TestExecutionFingerprintInput): string {
  return sha256(
    [
      input.projectId,
      input.selectionFingerprint,
      input.changeFingerprint ?? '',
      input.sourceGeneration,
      input.framework,
      input.runnerFingerprint,
      input.networkAllowed ? 'network' : 'isolated',
      [...input.selectedTestIds].sort().join(','),
    ].join('|')
  );
}
