import { ARTIFACT_LIMITS } from './limits.js';

import type { CodeIntelligenceArtifactStore } from './store.js';

export interface ArtifactRetentionOptions {
  /** Previous generations kept in addition to the current one. */
  keep?: number;
  /** Report what would be deleted without deleting anything. */
  dryRun?: boolean;
}

export interface ArtifactRetentionInput {
  store: CodeIntelligenceArtifactStore;
}

/**
 * Project-scoped, generation-aware, current-safe garbage collection.
 *
 * Ordering uses each generation's recorded `createdAt` because a generation id
 * is a content hash and has no inherent order. Timestamps are only ever used
 * for retention ordering here — never for generation identity.
 *
 * The generation referenced by the current pointer is never deleted.
 */
export async function applyArtifactRetention(
  store: CodeIntelligenceArtifactStore,
  options: ArtifactRetentionOptions = {}
): Promise<string[]> {
  const keep = Math.max(
    0,
    Math.min(
      options.keep ?? ARTIFACT_LIMITS.defaultRetainedGenerations,
      ARTIFACT_LIMITS.maxRetainedGenerations
    )
  );

  const current = await store.getCurrent();

  const generations = await store.listGenerations();

  if (generations.length <= keep + 1) {
    return [];
  }

  const dated: Array<{ generation: string; createdAt: string }> = [];

  for (const generation of generations) {
    const manifest = await store.getGenerationManifest(generation);
    dated.push({
      generation,
      createdAt: manifest?.createdAt ?? new Date(0).toISOString(),
    });
  }

  dated.sort((left, right) => {
    const byDate = right.createdAt.localeCompare(left.createdAt);
    return byDate !== 0 ? byDate : right.generation.localeCompare(left.generation);
  });

  const protectedGenerations = new Set<string>();

  /*
   * The current generation is always protected and does NOT consume one of the
   * `keep` slots: `keep: 1` means "the current generation plus one previous
   * generation", which is what an operator expects from a retention policy.
   */
  if (current) {
    protectedGenerations.add(current.generation);
  }

  let retained = 0;

  for (const entry of dated) {
    if (protectedGenerations.has(entry.generation)) {
      continue;
    }

    if (retained >= keep) {
      break;
    }

    protectedGenerations.add(entry.generation);
    retained += 1;
  }

  const removed: string[] = [];

  for (const entry of dated) {
    if (protectedGenerations.has(entry.generation)) {
      continue;
    }

    removed.push(entry.generation);

    if (!options.dryRun) {
      await store.deleteGeneration(entry.generation);
    }
  }

  return removed.sort();
}
