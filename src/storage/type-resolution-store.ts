import {
  canonicalizeTypeResolutionSnapshot,
  normalizeTypeResolutionSnapshot,
} from '../code-intelligence/resolution/legacy.js';

import { checkStoreCompatibility } from './compatibility/index.js';

import type { StorageProvider } from './types.js';

import type { StoreCompatibilityResult } from './compatibility/index.js';

import type {
  ResolutionSnapshot,
  TypeResolutionSnapshot,
} from '../code-intelligence/resolution/types.js';

const STORE_KIND = 'resolution_snapshot' as const;

export interface TypeResolutionLoadResult {
  snapshot: ResolutionSnapshot | TypeResolutionSnapshot | null;
  compatibility: StoreCompatibilityResult;
}

/**
 * Persisted symbol resolution snapshot.
 *
 * Store kind: `resolution_snapshot` — DERIVED (regenerated from repository
 * source by the index pipeline), never an authority store.
 *
 * Compatibility: the snapshot format kept `version: 1` while the `kind`
 * vocabulary changed without a version bump, so a legacy payload is normalized in memory on
 * read instead of being silently misread. Entries are never dropped.
 */
export class PersistentTypeResolutionStore {
  constructor(private readonly storage: StorageProvider) {}

  private key(projectId: string): string {
    return ['projects', projectId, 'graph', 'resolution', 'current.json'].join('/');
  }

  async load(projectId: string): Promise<ResolutionSnapshot | TypeResolutionSnapshot | null> {
    const loaded = await this.loadWithCompatibility(projectId);

    return loaded.snapshot;
  }

  /**
   * Load plus the storage compatibility verdict for the payload that was read.
   *
   * Read-only: the normalized snapshot is a new in-memory value; the stored
   * object is never rewritten by a read.
   */
  async loadWithCompatibility(projectId: string): Promise<TypeResolutionLoadResult> {
    const text = await this.storage.getText(this.key(projectId));

    if (!text) {
      return { snapshot: null, compatibility: checkStoreCompatibility({ kind: STORE_KIND }) };
    }

    const parsed = JSON.parse(text) as Record<string, unknown>;

    const detectedVersion = typeof parsed.version === 'number' ? parsed.version : undefined;

    /* The current generation snapshot carries generation + fingerprint. */
    if ('generation' in parsed && 'fingerprint' in parsed) {
      return {
        snapshot: parsed as unknown as ResolutionSnapshot,
        compatibility: checkStoreCompatibility({
          kind: STORE_KIND,
          ...(detectedVersion !== undefined ? { detectedVersion } : {}),
        }),
      };
    }

    const legacy = parsed as unknown as TypeResolutionSnapshot;

    const normalized = normalizeTypeResolutionSnapshot(legacy);

    return {
      snapshot: normalized.snapshot,
      compatibility: checkStoreCompatibility({
        kind: STORE_KIND,
        ...(detectedVersion !== undefined ? { detectedVersion } : {}),
        normalized: normalized.rewritten > 0,
      }),
    };
  }

  async save(snapshot: ResolutionSnapshot | TypeResolutionSnapshot): Promise<void> {
    const projectId =
      'projectId' in snapshot ? snapshot.projectId : (snapshot as TypeResolutionSnapshot).projectId;

    /* Never persist a legacy vocabulary: an upgrade must not write forward the
     * format it just normalized away. Unknown vocabularies are preserved. */
    const canonical =
      'generation' in snapshot
        ? snapshot
        : canonicalizeTypeResolutionSnapshot(snapshot as TypeResolutionSnapshot);

    await this.storage.put(this.key(projectId), JSON.stringify(canonical), 'application/json');
  }
}
