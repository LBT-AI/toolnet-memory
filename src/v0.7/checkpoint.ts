/**
 * ToolNet v0.7 checkpoint engine.
 *
 * A checkpoint is only "acknowledged" when the cloud authority confirmed the
 * commit. Everything else — a network failure, a rejected credential, a lease
 * conflict — is reported as unacknowledged. Events stay in a bounded RAM buffer
 * and are replayed later; nothing is ever written to disk and there is no local
 * fallback.
 */

import {
  AuthorityError,
  type AuthorityCommitRequest,
  type AuthorityCommitResult,
  type AuthorityErrorCode,
} from './authority-state.js';
import type { CloudAuthority } from './cloud-authority.js';
import { isStrictCloudOnly, type DurabilityMode } from './durability-policy.js';

export type CheckpointState = 'healthy' | 'degraded' | 'unavailable';

export interface CheckpointEngineOptions {
  authority: CloudAuthority;
  mode?: DurabilityMode;
  capacity?: number;
  now?: () => number;
}

export interface CheckpointResult {
  status: 'acknowledged' | 'unacknowledged';
  revision?: number;
  acknowledgedAt?: string;
  code?: AuthorityErrorCode | 'CHECKPOINT_INVALID_REQUEST';
  reason?: string;
  retryable: boolean;
  /** Number of batches still waiting in RAM. */
  buffered: number;
  /** Number of batches dropped because the RAM buffer was full. */
  dropped: number;
  durabilityMode: DurabilityMode;
}

export interface CheckpointEngineStatus {
  durabilityMode: DurabilityMode;
  state: CheckpointState;
  pendingBatches: number;
  pendingOperations: number;
  droppedBatches: number;
  lastAcknowledgedRevision?: number;
  lastAcknowledgedAt?: string;
  lastError?: string;
}

interface BufferedBatch {
  request: AuthorityCommitRequest;
  receivedAt: number;
}

const DEFAULT_CAPACITY = 128;

export class CheckpointEngine {
  private readonly authority: CloudAuthority;

  private readonly durabilityMode: DurabilityMode;

  private readonly capacity: number;

  private readonly now: () => number;

  private readonly buffer: BufferedBatch[] = [];

  private lastAcknowledged?: { revision: number; acknowledgedAt: string };

  private lastError?: string;

  private droppedBatches = 0;

  private state: CheckpointState = 'healthy';

  constructor(options: CheckpointEngineOptions) {
    this.authority = options.authority;
    this.durabilityMode = options.mode ?? 'strict-cloud-only';
    this.capacity = options.capacity ?? DEFAULT_CAPACITY;
    this.now = options.now ?? (() => Date.now());

    if (!Number.isSafeInteger(this.capacity) || this.capacity < 1) {
      throw new Error('CHECKPOINT_INVALID_CAPACITY');
    }
  }

  private bufferedOperations(): number {
    return this.buffer.reduce((total, batch) => total + batch.request.operations.length, 0);
  }

  private enqueue(request: AuthorityCommitRequest): void {
    if (this.buffer.length >= this.capacity) {
      this.buffer.shift();
      this.droppedBatches += 1;
      this.lastError = 'CHECKPOINT_BUFFER_FULL: oldest unacknowledged batch dropped';
      this.state = 'degraded';
    }

    this.buffer.push({ request, receivedAt: this.now() });
  }

  async submit(request: AuthorityCommitRequest): Promise<CheckpointResult> {
    if (!request.projectId.trim() || !request.agentId.trim() || request.operations.length === 0) {
      return {
        status: 'unacknowledged',
        code: 'CHECKPOINT_INVALID_REQUEST',
        reason: 'A checkpoint needs a project, an agent and at least one operation',
        retryable: false,
        buffered: this.buffer.length,
        dropped: this.droppedBatches,
        durabilityMode: this.durabilityMode,
      };
    }

    try {
      const result = await this.authority.commit(request);

      this.lastAcknowledged = {
        revision: result.revision,
        acknowledgedAt: result.acknowledgedAt,
      };
      this.state = this.buffer.length > 0 ? 'degraded' : 'healthy';
      delete this.lastError;

      return {
        status: 'acknowledged',
        revision: result.revision,
        acknowledgedAt: result.acknowledgedAt,
        retryable: false,
        buffered: this.buffer.length,
        dropped: this.droppedBatches,
        durabilityMode: this.durabilityMode,
      };
    } catch (error) {
      return this.handleFailure(request, error);
    }
  }

  private handleFailure(request: AuthorityCommitRequest, error: unknown): CheckpointResult {
    const authorityError =
      error instanceof AuthorityError
        ? error
        : new AuthorityError(
            'AUTHORITY_UNAVAILABLE',
            `Cloud authority request failed: ${error instanceof Error ? error.message : 'unknown error'}`
          );

    this.lastError = `${authorityError.code}: ${authorityError.message}`;

    if (authorityError.retryable) {
      this.state = 'unavailable';
      this.enqueue(request);

      return {
        status: 'unacknowledged',
        code: authorityError.code,
        reason: 'Cloud authority did not acknowledge the checkpoint; events kept in RAM only',
        retryable: true,
        buffered: this.buffer.length,
        dropped: this.droppedBatches,
        durabilityMode: this.durabilityMode,
      };
    }

    /*
     * Non-retryable failures (auth, revision conflict, fencing) require the
     * caller to re-read authority state. Buffering them would recreate the
     * conflict forever, so they are rejected without pretending persistence.
     */
    this.state = 'degraded';

    return {
      status: 'unacknowledged',
      code: authorityError.code,
      reason: authorityError.message,
      retryable: false,
      buffered: this.buffer.length,
      dropped: this.droppedBatches,
      durabilityMode: this.durabilityMode,
    };
  }

  async retryBuffered(): Promise<{
    attempted: number;
    acknowledged: number;
    remaining: number;
    lastResult?: CheckpointResult;
  }> {
    let attempted = 0;
    let acknowledged = 0;
    let lastResult: CheckpointResult | undefined;

    while (this.buffer.length > 0) {
      const next = this.buffer[0];
      attempted += 1;
      const result = await this.submit(next.request);
      lastResult = result;

      if (result.status !== 'acknowledged') {
        break;
      }

      this.buffer.shift();
      acknowledged += 1;
    }

    if (this.buffer.length === 0 && this.state !== 'healthy') {
      this.state = 'healthy';
      delete this.lastError;
    }

    return {
      attempted,
      acknowledged,
      remaining: this.buffer.length,
      ...(lastResult ? { lastResult } : {}),
    };
  }

  status(): CheckpointEngineStatus {
    return {
      durabilityMode: this.durabilityMode,
      state: this.state,
      pendingBatches: this.buffer.length,
      pendingOperations: this.bufferedOperations(),
      droppedBatches: this.droppedBatches,
      ...(this.lastAcknowledged === undefined
        ? {}
        : {
            lastAcknowledgedRevision: this.lastAcknowledged.revision,
            lastAcknowledgedAt: this.lastAcknowledged.acknowledgedAt,
          }),
      ...(this.lastError === undefined ? {} : { lastError: this.lastError }),
    };
  }

  /** True only when strict mode is active; local-first keeps legacy behaviour. */
  isStrictCloudOnly(): boolean {
    return isStrictCloudOnly(this.durabilityMode);
  }
}

export type { AuthorityCommitResult, AuthorityCommitRequest };
