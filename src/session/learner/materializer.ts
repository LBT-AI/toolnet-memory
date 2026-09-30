import type { ProjectManifest } from '../../core/types.js';

import type { StorageProvider } from '../../storage/types.js';

import type { SessionIdentity } from '../types.js';

import { sha256 } from '../utils.js';

import { loadSessionMemoryBatches, reconcileJournalBatches } from './journal.js';

import {
  materializationErrorCode,
  type MaterializationErrorCode,
} from './materialization-error.js';

import type { LearnedMemoryBatch } from './types.js';

export type MaterializationStatus = 'ok' | 'noop' | 'failed';

export interface MaterializationResult {
  status: MaterializationStatus;

  batchesScanned: number;

  candidates: number;

  added: number;

  duplicates: number;

  memories: number;

  evidenceUpdated: number;

  /** 1 when the canonical MemoryStore was durably rewritten, otherwise 0. */
  memoryStoreWrites: number;

  operationId: string;

  durationMs: number;

  errorCode?: MaterializationErrorCode;
}

function pad(value: number): string {
  return String(value).padStart(12, '0');
}

/*
 * Same-process materializations for one project must not interleave: two
 * flushes that both read the pre-write memory snapshot would each create the
 * same candidate under a fresh id and persist a duplicate.
 *
 * ProjectLock is intentionally NOT used here. SessionCore.flush() runs while
 * the runtime already owns the project's file lock, and re-acquiring that
 * non-reentrant lock (or releasing it on the runtime's behalf) is unsafe.
 * Cross-process exclusion stays the runtime's responsibility; immutable
 * multi-host memory operations keep concurrent hosts convergent.
 */
const projectQueues = new Map<string, Promise<void>>();

function serializePerProject<T>(projectId: string, task: () => Promise<T>): Promise<T> {
  const previous = projectQueues.get(projectId) ?? Promise.resolve();

  const current = previous.then(task, task);

  projectQueues.set(
    projectId,
    current.then(
      () => undefined,
      () => undefined
    )
  );

  return current;
}

export class SessionMemoryMaterializer {
  constructor(private readonly storage: StorageProvider) {}

  async materialize(
    project: ProjectManifest,
    identity?: SessionIdentity
  ): Promise<MaterializationResult> {
    return serializePerProject(project.id, () => this.materializeOnce(project, identity));
  }

  private async materializeOnce(
    project: ProjectManifest,
    identity: SessionIdentity | undefined
  ): Promise<MaterializationResult> {
    const started = Date.now();

    let batches: LearnedMemoryBatch[];

    try {
      batches = await loadSessionMemoryBatches(project, this.storage);
    } catch (error) {
      return this.failure(project, identity, [], started, materializationErrorCode(error));
    }

    if (batches.length === 0) {
      return this.noop(project, identity, [], started);
    }

    const operationId = this.computeOperationId(project, identity, batches);

    try {
      const result = await reconcileJournalBatches(project, this.storage, batches);

      const memoryStoreWrites = result.added > 0 || result.evidenceUpdated > 0 ? 1 : 0;

      return {
        status: memoryStoreWrites > 0 ? 'ok' : 'noop',

        batchesScanned: result.batches,

        candidates: result.candidates,

        added: result.added,

        duplicates: result.duplicates,

        memories: result.memories,

        evidenceUpdated: result.evidenceUpdated,

        memoryStoreWrites,

        operationId,

        durationMs: Date.now() - started,
      };
    } catch (error) {
      return this.failure(project, identity, batches, started, materializationErrorCode(error));
    }
  }

  private noop(
    project: ProjectManifest,
    identity: SessionIdentity | undefined,
    batches: LearnedMemoryBatch[],
    started: number
  ): MaterializationResult {
    return {
      status: 'noop',

      batchesScanned: batches.length,

      candidates: 0,

      added: 0,

      duplicates: 0,

      memories: 0,

      evidenceUpdated: 0,

      memoryStoreWrites: 0,

      operationId: this.computeOperationId(project, identity, batches),

      durationMs: Date.now() - started,
    };
  }

  private failure(
    project: ProjectManifest,
    identity: SessionIdentity | undefined,
    batches: LearnedMemoryBatch[],
    started: number,
    errorCode: MaterializationErrorCode
  ): MaterializationResult {
    return {
      status: 'failed',

      batchesScanned: batches.length,

      candidates: 0,

      added: 0,

      duplicates: 0,

      memories: 0,

      evidenceUpdated: 0,

      memoryStoreWrites: 0,

      operationId: this.computeOperationId(project, identity, batches),

      durationMs: Date.now() - started,

      errorCode,
    };
  }

  /**
   * Replay identity derived only from immutable input.
   *
   * No wall clock, no random UUID, no process identity: the same journal
   * batches always produce the same operation id across restarts and retries.
   */
  private computeOperationId(
    project: ProjectManifest,
    identity: SessionIdentity | undefined,
    batches: LearnedMemoryBatch[]
  ): string {
    const root = identity
      ? `${identity.projectId}|${identity.agent}|${identity.nativeSessionId}`
      : `${project.id}|project-wide`;

    if (batches.length === 0) {
      return sha256(`${root}|empty`).slice(0, 32);
    }

    const batchRange = batches
      .map((batch) => `${pad(batch.firstSequence)}-${pad(batch.lastSequence)}`)
      .sort()
      .join(',');

    const candidateDigest = sha256(
      batches
        .flatMap((batch) => batch.candidates.map((candidate) => candidate.fingerprint))
        .sort()
        .join('|')
    ).slice(0, 16);

    return sha256(`${root}|${batchRange}|${candidateDigest}`).slice(0, 32);
  }
}
