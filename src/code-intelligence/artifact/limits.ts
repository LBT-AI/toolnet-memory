/*
 * Phase 76 — centralized artifact limits.
 *
 * No scattered magic values: every bound used by the archive codec, the
 * publisher, the hydrator and retention lives here.
 */

export interface ArtifactLimits {
  /** Maximum accepted/emitted compressed archive size. */
  maxArtifactBytes: number;
  /** Maximum size of a single component payload. */
  maxComponentBytes: number;
  /** Maximum total decompressed payload (decompression-bomb guard). */
  maxExtractedBytes: number;
  /** Maximum number of components in one artifact. */
  maxComponents: number;
  /** Maximum size of the archive header block. */
  maxManifestBytes: number;
  /** Maximum expansion ratio (extracted / compressed) accepted. */
  maxCompressionRatio: number;
  /** Generations retained in addition to the current one. */
  defaultRetainedGenerations: number;
  /** Hard cap on how many previous generations retention will ever keep. */
  maxRetainedGenerations: number;
}

export const ARTIFACT_LIMITS: ArtifactLimits = {
  maxArtifactBytes: 512 * 1024 * 1024,
  maxComponentBytes: 256 * 1024 * 1024,
  maxExtractedBytes: 512 * 1024 * 1024,
  maxComponents: 64,
  maxManifestBytes: 4 * 1024 * 1024,
  maxCompressionRatio: 512,
  defaultRetainedGenerations: 2,
  maxRetainedGenerations: 32,
};

export function resolveArtifactLimits(overrides: Partial<ArtifactLimits> = {}): ArtifactLimits {
  const limits: ArtifactLimits = { ...ARTIFACT_LIMITS, ...overrides };

  const positive = (value: number, fallback: number): number =>
    Number.isSafeInteger(value) && value > 0 ? value : fallback;

  return {
    maxArtifactBytes: positive(limits.maxArtifactBytes, ARTIFACT_LIMITS.maxArtifactBytes),
    maxComponentBytes: positive(limits.maxComponentBytes, ARTIFACT_LIMITS.maxComponentBytes),
    maxExtractedBytes: positive(limits.maxExtractedBytes, ARTIFACT_LIMITS.maxExtractedBytes),
    maxComponents: positive(limits.maxComponents, ARTIFACT_LIMITS.maxComponents),
    maxManifestBytes: positive(limits.maxManifestBytes, ARTIFACT_LIMITS.maxManifestBytes),
    maxCompressionRatio: positive(limits.maxCompressionRatio, ARTIFACT_LIMITS.maxCompressionRatio),
    defaultRetainedGenerations: Math.max(
      0,
      Math.min(
        limits.defaultRetainedGenerations,
        positive(limits.maxRetainedGenerations, ARTIFACT_LIMITS.maxRetainedGenerations)
      )
    ),
    maxRetainedGenerations: positive(
      limits.maxRetainedGenerations,
      ARTIFACT_LIMITS.maxRetainedGenerations
    ),
  };
}
