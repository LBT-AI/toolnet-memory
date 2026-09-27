import type { StorageProvider } from '../../storage/types.js';

import {
  ArtifactError,
  type ArtifactComponentName,
  type ArtifactHydrateResult,
  type CodeIntelligenceArtifactManifest,
} from './types.js';

import { resolveArtifactLimits, type ArtifactLimits } from './limits.js';

import { readArtifactArchive } from './archive.js';

import { checkArtifactCompatibility } from './compatibility.js';

import { artifactComponentSpec } from './components.js';

import { applyArtifactComponents, assertGraphComponentValid } from './collection.js';

import { verifyArtifactManifest } from './manifest.js';

import {
  artifactGeneration,
  runtimeArtifactFingerprints,
  sourceManifestHash,
} from './fingerprint.js';

import { CodeIntelligenceArtifactStore } from './store.js';

import { artifactStagingRoot } from './staging.js';

import { downloadArtifact } from './downloader.js';

import { buildManifest } from '../incremental/manifest-builder.js';

import { searchableParserExtensions } from '../parsers/capabilities.js';

import type { CodeManifest } from '../incremental/manifest.js';

import type { ArtifactProjectContext } from './publisher.js';

export interface HydrateArtifactOptions {
  limits?: Partial<ArtifactLimits>;
  stagingRoot?: string;
  /** Root storage used to re-pin the Fleet registry after hydration. */
  rootStorage?: StorageProvider;
  /** Skip the (hash-only) source validation step. Never skip in production. */
  skipSourceValidation?: boolean;
  /** Abort a long source hash pass. */
  signal?: AbortSignal;
  /**
   * Source manifest already produced by this machine's index pass.
   *
   * Supplying it avoids a second source scan entirely; callers that just
   * indexed should always pass it.
   */
  sourceManifest?: CodeManifest;
  /** Hydrate a specific generation instead of the current pointer. */
  generation?: string;
  /** Report only; do not write anything. */
  dryRun?: boolean;
}

export interface ArtifactSourceVerdict {
  match: 'exact' | 'different';
  localManifestHash: string;
  artifactManifestHash: string;
  fileCount: number;
}

/**
 * Fast validation path: scan + hash only.
 *
 * The parser is never invoked to validate an artifact. If the hashes match, the
 * artifact is bit-for-bit the state the local source would produce, so hydrating
 * it can skip parsing entirely.
 */
export async function verifyArtifactSource(
  context: ArtifactProjectContext,
  manifest: CodeIntelligenceArtifactManifest,
  options: { signal?: AbortSignal; sourceManifest?: CodeManifest } = {}
): Promise<ArtifactSourceVerdict> {
  const local: CodeManifest =
    options.sourceManifest ??
    (await buildManifest(context.project.id, context.project.rootPath, {
      scan: { extensions: searchableParserExtensions() },
      ...(options.signal ? { signal: options.signal } : {}),
    }));

  const localManifestHash = sourceManifestHash(local);

  return {
    match: localManifestHash === manifest.source.manifestHash ? 'exact' : 'different',
    localManifestHash,
    artifactManifestHash: manifest.source.manifestHash,
    fileCount: Object.keys(local.files).length,
  };
}

/** Deterministic local generation identity for the currently stored state. */
export async function localArtifactGeneration(
  storage: StorageProvider,
  context: ArtifactProjectContext
): Promise<string | undefined> {
  const text = await storage.getText(`projects/${context.project.id}/graph/manifest.json`);

  if (!text) {
    return undefined;
  }

  let manifest: CodeManifest;

  try {
    manifest = JSON.parse(text) as CodeManifest;
  } catch {
    return undefined;
  }

  if (!manifest.files || typeof manifest.files !== 'object') {
    return undefined;
  }

  const graphText = await storage.getText(`projects/${context.project.id}/graph/current.json`);

  let graphValue: unknown;

  try {
    graphValue = graphText ? (JSON.parse(graphText) as unknown) : undefined;
  } catch {
    graphValue = undefined;
  }

  const runtime = runtimeArtifactFingerprints();

  const parser =
    graphValue && typeof graphValue === 'object'
      ? (((graphValue as Record<string, unknown>).parserFingerprint as string | undefined) ??
        runtime.parser)
      : runtime.parser;

  const graphSemantics =
    graphValue && typeof graphValue === 'object'
      ? (((graphValue as Record<string, unknown>).semanticFingerprint as string | undefined) ??
        runtime.graphSemantics)
      : runtime.graphSemantics;

  return artifactGeneration({
    projectIdentity: context.projectIdentity,
    sourceManifestHash: sourceManifestHash(manifest),
    parser,
    resolver: runtime.resolver,
    graphSemantics,
    querySchema: runtime.querySchema,
    artifactSchema: runtime.artifactSchema,
  });
}

/**
 * Hydrate a published artifact into the local derived cache.
 *
 * The transaction is verify-first:
 *
 *   1. resolve + verify the manifest
 *   2. compatibility (schema, parser, resolver, semantics, query)
 *   3. exact source-manifest match against the local working tree
 *   4. download + verify the outer hash
 *   5. decode the container and verify every component hash
 *   6. structurally validate the graph
 *   7. ONLY THEN write components to storage
 *
 * Because every failure mode happens before step 7, a failed hydration leaves
 * the previous generation current and queryable.
 */
export async function hydrateArtifact(
  storage: StorageProvider,
  context: ArtifactProjectContext,
  options: HydrateArtifactOptions = {}
): Promise<ArtifactHydrateResult> {
  const limits = resolveArtifactLimits(options.limits);

  const store = new CodeIntelligenceArtifactStore(storage, context.project.id);

  const staged = await downloadArtifact(store, {
    stagingRoot: artifactStagingRoot(context.project.rootPath, options.stagingRoot),
    limits,
    ...(options.generation ? { generation: options.generation } : {}),
  });

  const manifest = staged.manifest;

  verifyArtifactManifest(manifest);

  const compatibility = checkArtifactCompatibility({
    manifest,
    projectId: context.project.id,
    projectIdentity: context.projectIdentity,
  });

  if (!compatibility.adoptable) {
    throw new ArtifactError(
      compatibility.reason ?? 'ARTIFACT_SCHEMA_UNSUPPORTED',
      compatibility.detail ?? 'Artifact is not compatible with this runtime.'
    );
  }

  if (!options.skipSourceValidation) {
    const verdict = await verifyArtifactSource(context, manifest, {
      ...(options.signal ? { signal: options.signal } : {}),
      ...(options.sourceManifest ? { sourceManifest: options.sourceManifest } : {}),
    });

    if (verdict.match !== 'exact') {
      throw new ArtifactError(
        'ARTIFACT_SOURCE_MISMATCH',
        'Local source does not match the source the artifact was built from.'
      );
    }
  }

  const archive = await readArtifactArchive({
    source: staged.archivePath,
    expectedSha256: manifest.integrity.artifactHash,
    limits,
  });

  if (
    archive.header.generation !== manifest.generation ||
    archive.header.projectId !== manifest.projectId ||
    archive.header.projectIdentity !== manifest.projectIdentity
  ) {
    throw new ArtifactError(
      'ARTIFACT_MANIFEST_INVALID',
      'Artifact container header does not match its manifest.'
    );
  }

  /* Every declared component must be byte-identical to the manifest. */
  for (const component of manifest.components) {
    const spec = artifactComponentSpec(component.name);

    if (!spec.portable) {
      continue;
    }

    const data = archive.components.get(component.name);

    if (!data) {
      throw new ArtifactError(
        'ARTIFACT_COMPONENT_MISSING',
        `Artifact is missing component ${component.name}.`
      );
    }

    if (data.byteLength !== component.size) {
      throw new ArtifactError(
        'ARTIFACT_COMPONENT_HASH_MISMATCH',
        `Artifact component ${component.name} has an unexpected size.`
      );
    }
  }

  const graphBytes = archive.components.get('graph');

  if (!graphBytes) {
    throw new ArtifactError(
      'ARTIFACT_COMPONENT_MISSING',
      'Artifact is missing its graph component.'
    );
  }

  assertGraphComponentValid(context.project.id, graphBytes);

  if (options.dryRun) {
    return {
      generation: manifest.generation,
      artifactSha256: staged.archiveSha256,
      components: manifest.components
        .filter((component) => component.portable)
        .map((component) => component.name as ArtifactComponentName),
      files: manifest.source.fileCount,
      symbols: manifest.stats.symbols,
      edges: manifest.stats.edges,
      fleetRepinned: false,
    };
  }

  const applied = await applyArtifactComponents(storage, context.project.id, archive.components);

  const fleetRepinned = await repinFleet(
    options.rootStorage,
    context,
    manifest,
    archive.components
  );

  return {
    generation: manifest.generation,
    artifactSha256: staged.archiveSha256,
    components: applied.written,
    files: manifest.source.fileCount,
    symbols: manifest.stats.symbols,
    edges: manifest.stats.edges,
    fleetRepinned,
  };
}

/**
 * Re-pin the Fleet registry to the hydrated generation.
 *
 * Exactly the same bookkeeping a normal re-index performs: any `CROSS_*` link
 * pinned to the previous generation is reported stale until the Fleet is
 * rebuilt. Hydration never silently keeps an old pin current.
 */
async function repinFleet(
  rootStorage: StorageProvider | undefined,
  context: ArtifactProjectContext,
  manifest: CodeIntelligenceArtifactManifest,
  components: ReadonlyMap<string, Uint8Array>
): Promise<boolean> {
  if (!rootStorage) {
    return false;
  }

  /*
   * The Fleet pin is the EXPORT's generation, exactly as a normal index pass
   * records it. Using the artifact generation instead would fabricate a stale
   * participant on the next Fleet build.
   */
  const pinnedGeneration = exportGeneration(components) ?? manifest.generation;

  try {
    const { FleetProjectRegistry } = await import('../fleet/project-registry.js');

    await new FleetProjectRegistry(rootStorage).register({
      projectId: context.project.id,
      name: context.project.name,
      ...(context.project.remote ? { remote: context.project.remote } : {}),
      rootPath: context.project.rootPath,
      pinnedGeneration,
    });

    return true;
  } catch {
    /* Fleet registration is derived-state bookkeeping, never fatal. */
    return false;
  }
}

function exportGeneration(components: ReadonlyMap<string, Uint8Array>): string | undefined {
  const bytes = components.get('fleet-export');

  if (!bytes) {
    return undefined;
  }

  try {
    const value = JSON.parse(Buffer.from(bytes).toString('utf8')) as { generation?: unknown };
    return typeof value.generation === 'string' && value.generation ? value.generation : undefined;
  } catch {
    return undefined;
  }
}
