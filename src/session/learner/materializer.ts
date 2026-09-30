import { MemoryEngine } from '../../core/memory-engine.js';

import type { MemoryReconcileResult } from './types.js';

import { reconcileJournalBatches } from './journal.js';

import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

import type { SessionIdentity } from '../types.js';

import { sha256 } from '../utils.js';

import { ProjectLock } from '../../production/project-lock.js';

export interface MaterializationResult {
  batchesScanned: number;

  candidates: number;

  added: number;

  duplicates: number;

  memories: number;

  journalWrites: number;

  memoryStoreWrites: number;

  cursorAdvanced: boolean;

  operationId: string;

  durationMs: number;

  error?: string;
}

export interface MaterializationOptions {
  lock?: ProjectLock;
}

export class SessionMemoryMaterializer {
  constructor(private readonly storage: StorageProvider) {}

  async materialize(
    project: ProjectManifest,
    identity?: SessionIdentity,
    options?: MaterializationOptions
  ): Promise<MaterializationResult> {
    const started = Date.now();

    const lock = options?.lock ?? new ProjectLock(project.id);
    await lock.acquire();
    try {
      return this.materializeUnderLock(project, identity, started);
    } finally {
      if (!options?.lock) {
        await lock.release();
      }
    }
  }

  private async materializeUnderLock(
    project: ProjectManifest,
    identity: SessionIdentity | undefined,
    started: number
  ): Promise<MaterializationResult> {
    try {
      const batches = await this.loadPendingBatches(project, identity);

      if (batches.length === 0) {
        return {
          batchesScanned: 0,
          candidates: 0,
          added: 0,
          duplicates: 0,
          memories: 0,
          journalWrites: 0,
          memoryStoreWrites: 0,
          cursorAdvanced: false,
          operationId: this.computeOperationId(project, identity, []),
          durationMs: Date.now() - started,
        };
      }

      const operationId = this.computeOperationId(project, identity, batches);

      const result = await reconcileJournalBatches(project, this.storage, batches);

      const memoryStoreWrites = result.added > 0 || result.evidenceUpdated > 0 ? 1 : 0;

      return {
        batchesScanned: result.batches,
        candidates: result.candidates,
        added: result.added,
        duplicates: result.duplicates,
        memories: result.memories,
        journalWrites: result.batches,
        memoryStoreWrites,
        cursorAdvanced: memoryStoreWrites > 0,
        operationId,
        durationMs: Date.now() - started,
      };
    } catch (error) {
      return {
        batchesScanned: 0,
        candidates: 0,
        added: 0,
        duplicates: 0,
        memories: 0,
        journalWrites: 0,
        memoryStoreWrites: 0,
        cursorAdvanced: false,
        operationId: this.computeOperationId(project, identity, []),
        durationMs: Date.now() - started,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async loadPendingBatches(
    project: ProjectManifest,
    identity: SessionIdentity | undefined
  ): Promise<import('./types.js').LearnedMemoryBatch[]> {
    const prefix = `projects/${project.id}/memory/learned/`;

    const objects = await this.storage.list(prefix);

    const batches: import('./types.js').LearnedMemoryBatch[] = [];

    for (const object of objects
      .filter((item) => item.key.includes('/batches/') && item.key.endsWith('.json'))
      .sort((left, right) => left.key.localeCompare(right.key))) {
      const text = await this.storage.getText(object.key);

      if (!text) {
        continue;
      }

      try {
        const parsed = JSON.parse(text) as import('./types.js').LearnedMemoryBatch;

        if (parsed.version !== 1 || !Array.isArray(parsed.candidates)) {
          continue;
        }

        if (identity && (parsed.projectId !== identity.projectId || parsed.nativeSessionId !== identity.nativeSessionId)) {
          continue;
        }

        batches.push(parsed);
      } catch {
        // Ignore incomplete/corrupt optional learning batch.
      }
    }

    return batches;
  }

  private computeOperationId(
    project: ProjectManifest,
    identity: SessionIdentity | undefined,
    batches: import('./types.js').LearnedMemoryBatch[]
  ): string {
    if (batches.length === 0) {
      const seed = identity
        ? `${identity.projectId}|${identity.agent}|${identity.nativeSessionId}|empty`
        : `${project.id}|project-wide|empty`;

      return sha256(seed).slice(0, 32);
    }

    const batchRange = batches
      .map((batch) => {
        const first = String(batch.firstSequence).padStart(12, '0');
        const last = String(batch.lastSequence).padStart(12, '0');
        return `${first}-${last}`;
      })
      .sort()
      .join(',');

    const seed = identity
      ? `${identity.projectId}|${identity.agent}|${identity.nativeSessionId}|${batchRange}`
      : `${project.id}|project-wide|${batchRange}`;

    return sha256(seed).slice(0, 32);
  }
}
