import type { StorageProvider } from '../../storage/types.js';

import {
  ARTIFACT_SCHEMA_VERSION,
  type ArtifactReasonCode,
  type ArtifactStatusReport,
  type ArtifactstatusComponentReport,
} from './types.js';

import {
  ARTIFACT_COMPONENT_SPECS,
  ARTIFACT_NON_PORTABLE_COMPONENTS,
  artifactComponentKey,
} from './components.js';

import { checkArtifactCompatibility } from './compatibility.js';

import { verifyArtifactManifest } from './manifest.js';

import { CodeIntelligenceArtifactStore } from './store.js';

import { localArtifactGeneration, verifyArtifactSource } from './hydrator.js';

import type { ArtifactProjectContext } from './publisher.js';

/** Every reason code an artifact operation can report. */
export const ARTIFACT_REASON_CODES: readonly ArtifactReasonCode[] = [
  'ARTIFACT_NOT_FOUND',
  'ARTIFACT_MANIFEST_MISSING',
  'ARTIFACT_SCHEMA_UNSUPPORTED',
  'ARTIFACT_CONTAINER_UNSUPPORTED',
  'PARSER_FINGERPRINT_MISMATCH',
  'RESOLVER_FINGERPRINT_MISMATCH',
  'SEMANTIC_SCHEMA_MISMATCH',
  'QUERY_SCHEMA_MISMATCH',
  'ARTIFACT_PROJECT_MISMATCH',
  'ARTIFACT_IDENTITY_MISMATCH',
  'ARTIFACT_HASH_MISMATCH',
  'ARTIFACT_COMPONENT_HASH_MISMATCH',
  'ARTIFACT_COMPONENT_MISSING',
  'ARTIFACT_COMPONENT_INVALID',
  'ARTIFACT_COMPONENT_TOO_LARGE',
  'ARTIFACT_MANIFEST_INVALID',
  'ARTIFACT_TOO_LARGE',
  'ARTIFACT_TRUNCATED',
  'ARTIFACT_DECOMPRESSION_LIMIT',
  'ARTIFACT_GENERATION_CONFLICT',
  'ARTIFACT_SOURCE_MISMATCH',
  'ARTIFACT_GRAPH_INVALID',
  'ARTIFACT_IO_ERROR',
];

export interface ArtifactOperationRecord {
  operation: 'publish' | 'pull';
  at: string;
  generation: string;
  ok: boolean;
  code?: ArtifactReasonCode;
}

export async function recordArtifactOperation(
  store: CodeIntelligenceArtifactStore,
  record: ArtifactOperationRecord
): Promise<void> {
  await store.writeLocalStatus(record);
}

export async function readArtifactOperation(
  store: CodeIntelligenceArtifactStore
): Promise<ArtifactOperationRecord | null> {
  return store.readLocalStatus<ArtifactOperationRecord>();
}

export interface ArtifactStatusOptions {
  /** Run the hash-only source comparison (slower, but proves adoptability). */
  verifySource?: boolean;
}

/**
 * Compact, bounded artifact status. Never dumps the graph.
 */
export async function artifactStatus(
  storage: StorageProvider,
  context: ArtifactProjectContext,
  options: ArtifactStatusOptions = {}
): Promise<ArtifactStatusReport> {
  const store = new CodeIntelligenceArtifactStore(storage, context.project.id);

  const components: ArtifactstatusComponentReport[] = [];

  for (const spec of ARTIFACT_COMPONENT_SPECS) {
    let presentLocally = false;

    try {
      presentLocally = await storage.exists(artifactComponentKey(context.project.id, spec.name));
    } catch {
      presentLocally = false;
    }

    components.push({
      name: spec.name,
      kind: spec.kind,
      portable: spec.portable,
      presentLocally,
      schemaVersion: spec.schemaVersion,
    });
  }

  const localGeneration = await localArtifactGeneration(storage, context);

  const pointer = await store.getCurrent();

  let remoteGeneration: string | undefined;

  let compatibility: ArtifactStatusReport['compatibility'] = 'unknown';

  let compatibilityReason: ArtifactReasonCode | undefined;

  let sourceMatch: ArtifactStatusReport['sourceMatch'] = 'unknown';

  if (pointer) {
    remoteGeneration = pointer.generation;

    const manifest = await store.getGenerationManifest(pointer.generation);

    if (manifest) {
      try {
        verifyArtifactManifest(manifest);

        const result = checkArtifactCompatibility({
          manifest,
          projectId: context.project.id,
          projectIdentity: context.projectIdentity,
        });

        compatibility = result.adoptable ? 'compatible' : 'incompatible';
        compatibilityReason = result.reason;

        if (options.verifySource) {
          const verdict = await verifyArtifactSource(context, manifest);
          sourceMatch = verdict.match;
        }
      } catch {
        compatibility = 'incompatible';
        compatibilityReason = 'ARTIFACT_MANIFEST_INVALID';
      }
    } else {
      compatibility = 'incompatible';
      compatibilityReason = 'ARTIFACT_MANIFEST_MISSING';
    }
  }

  const freshness: ArtifactStatusReport['freshness'] = !pointer
    ? 'absent'
    : localGeneration && localGeneration === pointer.generation
      ? 'fresh'
      : 'stale';

  const generations = await store.listGenerations();

  const operation = await readArtifactOperation(store);

  return {
    projectId: context.project.id,
    projectIdentity: context.projectIdentity,
    schemaVersion: ARTIFACT_SCHEMA_VERSION,
    ...(localGeneration ? { localGeneration } : {}),
    ...(remoteGeneration ? { remoteGeneration } : {}),
    compatibility,
    ...(compatibilityReason ? { compatibilityReason } : {}),
    sourceMatch,
    freshness,
    components,
    nonPortableComponents: [...ARTIFACT_NON_PORTABLE_COMPONENTS],
    ...(operation ? { lastOperation: operation.operation, lastOperationAt: operation.at } : {}),
    retainedGenerations: generations,
    generationCount: generations.length,
  };
}
