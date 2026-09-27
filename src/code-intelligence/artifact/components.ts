import {
  ARTIFACT_SCHEMA_VERSION,
  ArtifactError,
  type ArtifactComponentName,
  type ArtifactComponentSpec,
  type ArtifactNonPortableComponent,
} from './types.js';

import { canonicalJson } from './serializer.js';

import { sha256Hex } from './integrity.js';

/**
 * The single source of truth for what an artifact contains.
 *
 * Every component maps to a FIXED project-scoped logical storage key. No path
 * ever travels inside the archive, which removes archive path traversal as a
 * class of bug: a component can only ever be written to the key declared here.
 *
 * Keys are rooted at `projects/<projectId>/` because that is the only shape the
 * ProjectScopedStorageProvider rewrites into the owning project's namespace; a
 * bare relative key would be shared by every project on the same storage root.
 */
export const ARTIFACT_COMPONENT_SPECS: readonly ArtifactComponentSpec[] = [
  {
    name: 'graph',
    kind: 'required',
    portable: true,
    schemaVersion: 1,
    key: 'projects/<projectId>/graph/current.json',
    description: 'Semantic code graph snapshot (symbols + typed edges).',
  },
  {
    name: 'code-manifest',
    kind: 'required',
    portable: true,
    schemaVersion: 1,
    key: 'projects/<projectId>/graph/manifest.json',
    description: 'Source freshness baseline (per-file hashes) the graph was built from.',
  },
  {
    name: 'coverage',
    kind: 'required',
    portable: true,
    schemaVersion: 1,
    key: 'projects/<projectId>/graph/coverage.json',
    description: 'Phase 68 graph coverage snapshot (capability trust evidence).',
  },
  {
    name: 'resolution',
    kind: 'required',
    portable: true,
    schemaVersion: 1,
    key: 'projects/<projectId>/graph/resolution/current.json',
    description: 'Phase 70 deterministic symbol resolution snapshot.',
  },
  {
    name: 'cross-service',
    kind: 'optional',
    portable: true,
    schemaVersion: 1,
    key: 'projects/<projectId>/graph/cross-service.json',
    description: 'Phase 72 cross-service (protocol) link snapshot.',
  },
  {
    name: 'fleet-export',
    kind: 'optional',
    portable: true,
    schemaVersion: 1,
    key: 'projects/<projectId>/graph/fleet-export.json',
    description: 'Phase 73 sanitized per-project Fleet export view.',
  },
  {
    name: 'architecture',
    kind: 'optional',
    portable: true,
    schemaVersion: 1,
    key: 'projects/<projectId>/code/architecture/current.json',
    description: 'Derived architecture summary (cheap to rebuild).',
  },
  {
    name: 'analysis',
    kind: 'optional',
    portable: true,
    schemaVersion: 1,
    key: 'projects/<projectId>/code/analysis/current.json',
    description: 'Derived graph analysis summary (cheap to rebuild).',
  },
  {
    name: 'visualization',
    kind: 'optional',
    portable: true,
    schemaVersion: 1,
    key: 'projects/<projectId>/code/visualization/graph.json',
    description: 'Derived visualization dataset (cheap to rebuild).',
  },
];

/**
 * Components that are deliberately never shipped.
 *
 * The local FTS5/BM25 code-search cache is an in-process SQLite index with no
 * portable on-disk artifact; it is rebuilt locally from the hydrated graph. Its
 * absence must never make an artifact unusable.
 */
export const ARTIFACT_NON_PORTABLE_COMPONENTS: readonly ArtifactNonPortableComponent[] = [
  {
    name: 'code-search-cache',
    reason: 'REBUILT_LOCALLY',
    detail:
      'Local SQLite FTS5/BM25 code index. Rebuilt from the hydrated graph; never travels in an artifact.',
  },
];

const SPEC_BY_NAME = new Map<ArtifactComponentName, ArtifactComponentSpec>(
  ARTIFACT_COMPONENT_SPECS.map((spec) => [spec.name, spec])
);

export const ARTIFACT_COMPONENT_NAMES: readonly ArtifactComponentName[] =
  ARTIFACT_COMPONENT_SPECS.map((spec) => spec.name);

export function artifactComponentSpec(name: ArtifactComponentName): ArtifactComponentSpec {
  const spec = SPEC_BY_NAME.get(name);
  if (!spec) {
    throw new ArtifactError('ARTIFACT_COMPONENT_INVALID', `Unknown artifact component: ${name}`);
  }
  return spec;
}

export function isArtifactComponentName(value: string): value is ArtifactComponentName {
  return SPEC_BY_NAME.has(value as ArtifactComponentName);
}

/**
 * Resolve a component's project-scoped logical storage key.
 *
 * The key is derived from the fixed table and the project id only, so a hostile
 * archive can never influence where a component is written.
 */
export function artifactComponentKey(projectId: string, name: ArtifactComponentName): string {
  return artifactComponentSpec(name).key.replace('<projectId>', projectId);
}

export function artifactComponentKeys(projectId: string): Record<ArtifactComponentName, string> {
  const output = {} as Record<ArtifactComponentName, string>;
  for (const spec of ARTIFACT_COMPONENT_SPECS) {
    output[spec.name] = artifactComponentKey(projectId, spec.name);
  }
  return output;
}

export interface CollectedArtifactComponent {
  name: ArtifactComponentName;
  spec: ArtifactComponentSpec;
  value: unknown;
  bytes: Uint8Array;
  sha256: string;
  size: number;
}

/**
 * Deterministic component schema fingerprint input (used by the artifact schema
 * fingerprint so that changing the component table invalidates old cursors and
 * old artifacts).
 */
export function componentTableSignature(): string {
  return canonicalJson(
    ARTIFACT_COMPONENT_SPECS.map((spec) => [
      spec.name,
      spec.kind,
      spec.portable,
      spec.schemaVersion,
      spec.key,
    ])
  );
}

export function artifactSchemaVersion(): number {
  return ARTIFACT_SCHEMA_VERSION;
}

export function artifactSchemaDigestInput(): string {
  return canonicalJson({
    artifactSchemaVersion: ARTIFACT_SCHEMA_VERSION,
    componentTable: componentTableSignature(),
    nonPortable: ARTIFACT_NON_PORTABLE_COMPONENTS.map((item) => item.name).sort(),
  });
}

export function componentDigest(bytes: Uint8Array): string {
  return sha256Hex(bytes);
}
