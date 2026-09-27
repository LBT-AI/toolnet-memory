import { createHash } from 'node:crypto';

/**
 * Phase 73 — Fleet generation identity.
 *
 * Deterministic and timestamp-free: same project set + generations + linker
 * rules always produce the same Fleet generation.
 */
export const FLEET_LINKER_VERSION = 1;
export const FLEET_PROTOCOL_NORMALIZATION_VERSION = 1;

export interface FleetFingerprintInput {
  /** `projectId:graphGeneration` pairs; order-insensitive. */
  projectGenerations: readonly string[];
  schemaVersion: number;
}

export function fleetFingerprint(input: FleetFingerprintInput): string {
  const sorted = [...input.projectGenerations].sort();

  return createHash('sha256')
    .update(
      JSON.stringify({
        schemaVersion: input.schemaVersion,
        linkerVersion: FLEET_LINKER_VERSION,
        protocolNormalizationVersion: FLEET_PROTOCOL_NORMALIZATION_VERSION,
        projectGenerations: sorted,
      })
    )
    .digest('hex');
}

export function fleetGenerationFromFingerprint(fingerprint: string): string {
  return createHash('sha256').update(`fleet-generation:${fingerprint}`).digest('hex').slice(0, 24);
}

export function crossProjectEdgeId(parts: {
  type: string;
  fromProjectId: string;
  fromResourceId: string;
  toProjectId: string;
  toResourceId: string;
  protocol?: string;
}): string {
  return createHash('sha256')
    .update(
      [
        parts.type,
        parts.fromProjectId,
        parts.fromResourceId,
        parts.toProjectId,
        parts.toResourceId,
        parts.protocol ?? '',
      ].join(':')
    )
    .digest('hex')
    .slice(0, 24);
}
