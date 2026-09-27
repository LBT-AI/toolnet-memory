import type { StorageProvider } from '../../storage/types.js';

import {
  ArtifactError,
  type ArtifactComponentManifest,
  type ArtifactComponentName,
} from './types.js';

import {
  ARTIFACT_COMPONENT_SPECS,
  artifactComponentKey,
  artifactComponentSpec,
  type CollectedArtifactComponent,
} from './components.js';

import { canonicalJsonBytes } from './serializer.js';

import { sha256Hex } from './integrity.js';

import { CodeGraphStore } from '../graph/graph-store.js';

import { GraphValidator } from '../graph/graph-validator.js';

export interface CollectedArtifactComponents {
  components: CollectedArtifactComponent[];
  manifest: ArtifactComponentManifest[];
  missingRequired: ArtifactComponentName[];
  capabilityKeys: string[];
}

function coverageCapabilityKeys(value: unknown): string[] {
  if (!value || typeof value !== 'object') {
    return [];
  }
  const capabilities = (value as Record<string, unknown>).capabilities;
  if (!capabilities || typeof capabilities !== 'object' || Array.isArray(capabilities)) {
    return [];
  }
  return Object.keys(capabilities as Record<string, unknown>).sort();
}

/**
 * Read every declared component from project storage and canonicalize it.
 *
 * A missing or unparsable REQUIRED component aborts the build: an artifact that
 * silently omits trust-relevant state must never be published.
 */
export async function collectArtifactComponents(
  storage: StorageProvider,
  projectId: string
): Promise<CollectedArtifactComponents> {
  const components: CollectedArtifactComponent[] = [];
  const missingRequired: ArtifactComponentName[] = [];
  let capabilityKeys: string[] = [];

  for (const spec of ARTIFACT_COMPONENT_SPECS) {
    const text = await storage.getText(artifactComponentKey(projectId, spec.name));

    if (text === null || text === undefined) {
      if (spec.kind === 'required') {
        missingRequired.push(spec.name);
      }
      continue;
    }

    let value: unknown;

    try {
      value = JSON.parse(text) as unknown;
    } catch {
      if (spec.kind === 'required') {
        missingRequired.push(spec.name);
      }
      continue;
    }

    const bytes = canonicalJsonBytes(value);

    components.push({
      name: spec.name,
      spec,
      value,
      bytes,
      sha256: sha256Hex(bytes),
      size: bytes.byteLength,
    });

    if (spec.name === 'coverage') {
      capabilityKeys = coverageCapabilityKeys(value);
    }
  }

  if (missingRequired.length > 0) {
    throw new ArtifactError(
      'ARTIFACT_COMPONENT_MISSING',
      `Required artifact component(s) unavailable: ${missingRequired.join(', ')}`
    );
  }

  return {
    components: components.sort((left, right) => left.name.localeCompare(right.name)),
    manifest: components
      .map((component) => ({
        name: component.name,
        kind: component.spec.kind,
        portable: component.spec.portable,
        schemaVersion: component.spec.schemaVersion,
        sha256: component.sha256,
        size: component.size,
      }))
      .sort((left, right) => left.name.localeCompare(right.name)),
    missingRequired,
    capabilityKeys,
  };
}

/**
 * Component write order.
 *
 * `code-manifest` is the freshness baseline the whole trust chain hangs off, so
 * it is written LAST. If a storage write fails part way through, the old
 * baseline survives and the partially written generation is reported stale
 * instead of being trusted.
 */
function applyOrder(names: readonly ArtifactComponentName[]): ArtifactComponentName[] {
  return [...names].sort((left, right) => {
    if (left === right) {
      return 0;
    }
    if (left === 'code-manifest') {
      return 1;
    }
    if (right === 'code-manifest') {
      return -1;
    }
    return left.localeCompare(right);
  });
}

export interface ApplyArtifactComponentsResult {
  written: ArtifactComponentName[];
}

/**
 * Commit verified component bytes into project storage.
 *
 * Only keys declared by the fixed component table are ever written, and only
 * for the current project: a hostile archive cannot influence write targets.
 */
export async function applyArtifactComponents(
  storage: StorageProvider,
  projectId: string,
  components: ReadonlyMap<string, Uint8Array>
): Promise<ApplyArtifactComponentsResult> {
  const names = [...components.keys()].filter((name): name is ArtifactComponentName =>
    ARTIFACT_COMPONENT_SPECS.some((spec) => spec.name === name)
  );

  const written: ArtifactComponentName[] = [];

  for (const name of applyOrder(names)) {
    const data = components.get(name);

    if (!data) {
      continue;
    }

    const spec = artifactComponentSpec(name);

    await storage.put(artifactComponentKey(projectId, name), data, 'application/json');

    written.push(spec.name);
  }

  return { written };
}

/**
 * Structural + semantic validation of a graph component.
 *
 * A structurally invalid graph with a perfect hash must still be rejected: hash
 * integrity proves the bytes are unchanged, not that they describe a coherent
 * semantic graph. The same check runs at build and at hydrate time so a
 * generation that would fail adoption cannot be published in the first place.
 */
export function assertGraphComponentValid(projectId: string, bytes: Uint8Array): void {
  let parsed: { symbols?: unknown; edges?: unknown };

  try {
    parsed = JSON.parse(Buffer.from(bytes).toString('utf8')) as typeof parsed;
  } catch {
    throw new ArtifactError('ARTIFACT_GRAPH_INVALID', 'Graph component is not valid JSON.');
  }

  if (!Array.isArray(parsed.symbols) || !Array.isArray(parsed.edges)) {
    throw new ArtifactError(
      'ARTIFACT_GRAPH_INVALID',
      'Graph component is missing symbols or edges.'
    );
  }

  const graph = new CodeGraphStore();

  graph.import(
    parsed.symbols as Parameters<CodeGraphStore['import']>[0],
    parsed.edges as Parameters<CodeGraphStore['import']>[1]
  );

  const validation = new GraphValidator(graph).validate(projectId);

  if (!validation.valid) {
    throw new ArtifactError(
      'ARTIFACT_GRAPH_INVALID',
      `Graph component failed semantic validation (${validation.stats.invalidEdges} invalid edge(s)).`
    );
  }
}
