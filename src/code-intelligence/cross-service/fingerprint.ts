import { createHash } from 'node:crypto';

import { semanticFingerprint } from '../graph/graph-semantics.js';

/**
 * Phase 72 — cross-service identity.
 *
 * Deterministic and timestamp-free. Changing an extractor rule, the
 * normalisation rules or the Phase 71 semantic schema invalidates a persisted
 * cross-service generation instead of silently reusing it.
 */
export const CROSS_SERVICE_SCHEMA_VERSION = 1;
export const EXTRACTOR_RULES_VERSION = 3;
export const NORMALIZATION_VERSION = 1;

export const CROSS_SERVICE_EXTRACTOR_IDS: readonly string[] = [
  'cross-service-typescript',
  'cross-service-python',
  'cross-service-go',
].sort();

export function crossServiceFingerprint(): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        crossServiceSchemaVersion: CROSS_SERVICE_SCHEMA_VERSION,
        extractorRulesVersion: EXTRACTOR_RULES_VERSION,
        normalizationVersion: NORMALIZATION_VERSION,
        extractors: CROSS_SERVICE_EXTRACTOR_IDS,
        semanticFingerprint: semanticFingerprint(),
      })
    )
    .digest('hex');
}
