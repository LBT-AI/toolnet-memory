import { mkdirSync, writeFileSync } from 'node:fs';

import { dirname } from 'node:path';

import {
  ArtifactError,
  type ArtifactCurrentPointer,
  type CodeIntelligenceArtifactManifest,
} from './types.js';

import { resolveArtifactLimits, type ArtifactLimits } from './limits.js';

import { verifyArtifactManifest } from './manifest.js';

import { sha256Hex } from './integrity.js';

import type { CodeIntelligenceArtifactStore } from './store.js';

import { artifactStagingFile } from './staging.js';

export interface DownloadArtifactOptions {
  stagingRoot: string;
  /** Download a specific generation instead of the current pointer. */
  generation?: string;
  limits?: Partial<ArtifactLimits>;
}

export interface DownloadArtifactResult {
  generation: string;
  manifest: CodeIntelligenceArtifactManifest;
  archivePath: string;
  archiveSha256: string;
  bytes: number;
  pointer?: ArtifactCurrentPointer;
}

/**
 * Resolve a generation (current pointer by default), verify its manifest and
 * archive bytes, and stage the archive locally.
 *
 * The active graph is never touched here: staging is a pure read operation, so
 * a failed download cannot damage the current derived state.
 */
export async function downloadArtifact(
  store: CodeIntelligenceArtifactStore,
  options: DownloadArtifactOptions
): Promise<DownloadArtifactResult> {
  const limits = resolveArtifactLimits(options.limits);

  let pointer: ArtifactCurrentPointer | null = null;
  let generation = options.generation;

  if (!generation) {
    pointer = await store.getCurrent();

    if (!pointer) {
      throw new ArtifactError('ARTIFACT_NOT_FOUND', 'No current artifact generation is published.');
    }

    generation = pointer.generation;
  } else {
    pointer = await store.getCurrent();
  }

  const manifest = await store.getGenerationManifest(generation);

  if (!manifest) {
    throw new ArtifactError(
      'ARTIFACT_MANIFEST_MISSING',
      `Artifact generation ${generation} has no manifest.`
    );
  }

  verifyArtifactManifest(manifest);

  if (pointer && pointer.generation === generation) {
    if (
      pointer.artifactSha256 !== manifest.integrity.artifactHash ||
      pointer.manifestSha256 !== manifest.integrity.manifestHash
    ) {
      throw new ArtifactError(
        'ARTIFACT_HASH_MISMATCH',
        'Current pointer does not match the generation manifest.'
      );
    }
  }

  const bytes = await store.getArtifactBytes(generation);

  if (!bytes) {
    throw new ArtifactError(
      'ARTIFACT_NOT_FOUND',
      `Artifact generation ${generation} has no archive bytes.`
    );
  }

  if (bytes.byteLength > limits.maxArtifactBytes) {
    throw new ArtifactError('ARTIFACT_TOO_LARGE', 'Remote artifact exceeds the size limit.');
  }

  const digest = sha256Hex(bytes);

  if (digest !== manifest.integrity.artifactHash) {
    throw new ArtifactError(
      'ARTIFACT_HASH_MISMATCH',
      'Remote artifact failed its integrity check.'
    );
  }

  const archivePath = artifactStagingFile(options.stagingRoot, generation, 'tgz');

  mkdirSync(dirname(archivePath), { recursive: true });

  writeFileSync(archivePath, bytes);

  return {
    generation,
    manifest,
    archivePath,
    archiveSha256: digest,
    bytes: bytes.byteLength,
    ...(pointer ? { pointer } : {}),
  };
}
