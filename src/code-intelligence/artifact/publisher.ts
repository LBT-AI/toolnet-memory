import { readFileSync, statSync } from 'node:fs';

import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

import {
  ARTIFACT_CONTAINER_VERSION,
  ARTIFACT_SCHEMA_VERSION,
  ArtifactError,
  type ArtifactCurrentPointer,
  type ArtifactExportResult,
  type ArtifactPublishResult,
  type CodeIntelligenceArtifactManifest,
} from './types.js';

import { resolveArtifactLimits, type ArtifactLimits } from './limits.js';

import { writeArtifactArchive, type ArtifactArchiveHeader } from './archive.js';

import { assertGraphComponentValid, collectArtifactComponents } from './collection.js';

import {
  buildArtifactManifest,
  deriveArtifactFingerprints,
  graphStats,
  verifyArtifactManifest,
} from './manifest.js';

import { artifactGeneration, sourceManifestHash } from './fingerprint.js';

import { CodeIntelligenceArtifactStore } from './store.js';

import { artifactStagingFile, artifactStagingRoot } from './staging.js';

import { applyArtifactRetention } from './retention.js';

import type { CodeManifest } from '../incremental/manifest.js';

import { normalizeGitRemote } from '../../core/project-identity.js';

import { redactUrl } from '../cross-service/endpoint-normalizer.js';

export interface ArtifactProjectContext {
  project: Pick<ProjectManifest, 'id' | 'name' | 'rootPath'> & { remote?: string };
  /** Canonical project identity (normalized git remote, else project name). */
  projectIdentity: string;
}

/**
 * Canonical, credential-free project identity.
 *
 * Never a machine path, hostname or package folder: two clones of the same
 * repository must derive the same identity on different machines.
 */
export function canonicalArtifactIdentity(project: { name: string; remote?: string }): string {
  if (project.remote) {
    return normalizeGitRemote(project.remote) ?? redactUrl(project.remote);
  }
  return project.name;
}

export function artifactProjectContext(
  project: Pick<ProjectManifest, 'id' | 'name' | 'rootPath'> & { remote?: string }
): ArtifactProjectContext {
  return { project, projectIdentity: canonicalArtifactIdentity(project) };
}

export interface BuildArtifactOptions {
  limits?: Partial<ArtifactLimits>;
  stagingRoot?: string;
  createdAt?: string;
  adrRevisionObserved?: number;
}

function readStagedArtifact(path: string): Uint8Array {
  const stats = statSync(path);

  if (!stats.isFile()) {
    throw new ArtifactError('ARTIFACT_IO_ERROR', 'Staged artifact is not a file.');
  }

  return new Uint8Array(readFileSync(path));
}

/**
 * Build an artifact locally and stream it to a staging file.
 *
 * No remote storage is required, which makes this usable for manual transport
 * and for certification.
 */
export async function buildArtifact(
  storage: StorageProvider,
  context: ArtifactProjectContext,
  options: BuildArtifactOptions = {}
): Promise<ArtifactExportResult> {
  const limits = resolveArtifactLimits(options.limits);

  const projectId = context.project.id;

  const collected = await collectArtifactComponents(storage, projectId);

  const manifestComponent = collected.components.find((item) => item.name === 'code-manifest');

  const sourceManifest = manifestComponent?.value as CodeManifest | undefined;

  if (
    !sourceManifest ||
    typeof sourceManifest !== 'object' ||
    !sourceManifest.files ||
    typeof sourceManifest.files !== 'object'
  ) {
    throw new ArtifactError(
      'ARTIFACT_COMPONENT_MISSING',
      'Artifact requires a readable source manifest component.'
    );
  }

  const graphComponent = collected.components.find((item) => item.name === 'graph');

  /*
   * Never publish a graph that hydration would reject: hash integrity proves the
   * bytes are unchanged, not that they describe a coherent semantic graph.
   */
  if (graphComponent) {
    assertGraphComponentValid(projectId, graphComponent.bytes);
  }

  const fingerprints = deriveArtifactFingerprints(graphComponent?.value);

  const generation = artifactGeneration({
    projectIdentity: context.projectIdentity,
    sourceManifestHash: sourceManifestHash(sourceManifest),
    parser: fingerprints.parser,
    resolver: fingerprints.resolver,
    graphSemantics: fingerprints.graphSemantics,
    querySchema: fingerprints.querySchema,
    artifactSchema: fingerprints.artifactSchema,
  });

  const createdAt = options.createdAt ?? new Date().toISOString();

  const header: ArtifactArchiveHeader = {
    containerVersion: ARTIFACT_CONTAINER_VERSION,
    artifactSchemaVersion: ARTIFACT_SCHEMA_VERSION,
    generation,
    projectId,
    projectIdentity: context.projectIdentity,
    components: collected.manifest,
  };

  const artifactPath = artifactStagingFile(
    artifactStagingRoot(context.project.rootPath, options.stagingRoot),
    generation,
    'tgz'
  );

  const written = await writeArtifactArchive({
    destination: artifactPath,
    header,
    payload: collected.components.map((component) => ({ data: component.bytes })),
    limits,
  });

  const manifest = buildArtifactManifest({
    projectId,
    projectIdentity: context.projectIdentity,
    generation,
    createdAt,
    sourceManifest,
    fingerprints,
    capabilities: collected.capabilityKeys,
    components: collected.manifest,
    stats: graphStats(graphComponent?.value),
    artifactHash: written.sha256,
    ...(options.adrRevisionObserved !== undefined
      ? { knowledgeCompatibility: { adrRevisionObserved: options.adrRevisionObserved } }
      : {}),
  });

  verifyArtifactManifest(manifest);

  return {
    generation,
    manifest,
    artifactPath,
    artifactSha256: written.sha256,
    artifactBytes: written.bytes,
  };
}

export interface PublishArtifactOptions extends BuildArtifactOptions {
  /** Previous generations retained in addition to the current one. */
  retain?: number;
  prune?: boolean;
}

/**
 * Build, verify, upload an immutable generation and only then move the current
 * pointer. A failure at any earlier step leaves the previous generation current.
 */
export async function publishArtifact(
  storage: StorageProvider,
  context: ArtifactProjectContext,
  options: PublishArtifactOptions = {}
): Promise<ArtifactPublishResult> {
  const store = new CodeIntelligenceArtifactStore(storage, context.project.id);

  const exported = await buildArtifact(storage, context, options);

  const archive = readStagedArtifact(exported.artifactPath);

  const outcome = await store.putGeneration(exported.manifest, archive);

  /* Read back and re-verify before the generation may become current. */
  const verified = await store.verifyGeneration(exported.generation);

  /*
   * The pointer always references the STORED manifest, never the freshly built
   * one: a re-published generation keeps its original manifest bytes, so the
   * pointer and the manifest can never disagree.
   */
  const committed = verified.manifest;

  const pointer: ArtifactCurrentPointer = {
    version: 1,
    generation: exported.generation,
    manifestSha256: committed.integrity.manifestHash,
    artifactSha256: committed.integrity.artifactHash,
    updatedAt: new Date().toISOString(),
  };

  await store.setCurrent(pointer);

  const pruned =
    options.prune === false
      ? []
      : await applyArtifactRetention(store, {
          keep: options.retain ?? resolveArtifactLimits(options.limits).defaultRetainedGenerations,
        });

  return {
    generation: exported.generation,
    artifactSha256: committed.integrity.artifactHash,
    artifactBytes: exported.artifactBytes,
    manifestSha256: committed.integrity.manifestHash,
    idempotent: outcome === 'unchanged',
    components: committed.components,
    pruned,
  };
}

export type { CodeIntelligenceArtifactManifest };
