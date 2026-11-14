/**
 * ToolNet v0.7 automatic checkpoint session.
 *
 * Bridges agent lifecycle events (task transitions, file changes, test results,
 * blockers, decisions, next actions, interruption) to the cloud authority. It
 * reuses the existing `AuthorityStateMachine` transaction rules and
 * `CheckpointEngine` RAM buffer rather than inventing a second persistence
 * layer.
 *
 * Guarantees:
 * - a checkpoint is only reported as saved after the cloud ACK;
 * - every event carries an idempotency key, so a timeout retry cannot apply a
 *   batch twice;
 * - expectedRevision and the task lease/fencing token reject stale writers;
 * - a task is never completed from an agent claim: a passing test operation must
 *   be part of the same acknowledged batch;
 * - events are held in bounded RAM and retried with exponential backoff; a full
 *   buffer drops the oldest batch and reports `degraded`;
 * - no filesystem access exists in this module.
 */

import {
  AuthorityError,
  type AuthorityOperation,
  type AuthoritySnapshot,
  type AuthorityTestOutcome,
} from './authority-state.js';
import type { AcquireLeaseRequest, HeartbeatLeaseRequest, LeaseGrant } from './authority-state.js';
import type { CloudAuthority } from './cloud-authority.js';
import { CheckpointEngine, type CheckpointResult } from './checkpoint.js';
import { selectResumeTask } from './resume.js';
import type { DurabilityMode } from './durability-policy.js';

export type AgentCheckpointEvent =
  | {
      id?: string;
      type: 'task.started';
      taskId?: string;
      title?: string;
      nextAction?: string;
    }
  | {
      id?: string;
      type: 'task.updated';
      taskId?: string;
      done?: string[];
      remaining?: string[];
      nextAction?: string;
    }
  | {
      id?: string;
      type: 'task.completed';
      taskId?: string;
      tests: Array<{ name: string; outcome: AuthorityTestOutcome }>;
      evidence?: string;
    }
  | { id?: string; type: 'file.changed'; taskId?: string; path: string }
  | {
      id?: string;
      type: 'test.passed' | 'test.failed';
      taskId?: string;
      name: string;
    }
  | {
      id?: string;
      type: 'blocker.detected';
      taskId?: string;
      reason: string;
      nextAction?: string;
    }
  | { id?: string; type: 'blocker.resolved'; taskId?: string; nextAction?: string }
  | { id?: string; type: 'decision.changed'; text: string }
  | { id?: string; type: 'next_action.updated'; taskId?: string; nextAction: string }
  | { id?: string; type: 'session.interrupted'; reason?: string };

export interface CheckpointRetryPolicy {
  /** Total attempts including the first one. */
  attempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export interface CloudCheckpointSessionOptions {
  authority: CloudAuthority;
  projectId: string;
  agentId: string;
  taskId?: string;
  mode?: DurabilityMode;
  capacity?: number;
  leaseTtlMs?: number;
  /** How long start() may wait for another agent's lease to expire. */
  maxWaitForLeaseMs?: number;
  retry?: Partial<CheckpointRetryPolicy>;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export type CheckpointSessionFailureCode =
  | 'CHECKPOINT_NOT_STARTED'
  | 'CHECKPOINT_ALREADY_STARTED'
  | 'CHECKPOINT_NO_TASK'
  | 'CHECKPOINT_TASK_NOT_LEASED'
  | 'CHECKPOINT_COMPLETION_NEEDS_PASSING_TEST'
  | 'CHECKPOINT_EVENT_INVALID'
  | 'CHECKPOINT_STALE_LEASE'
  | 'CHECKPOINT_REVISION_CONFLICT'
  | 'CHECKPOINT_AUTHORITY_UNAVAILABLE'
  | 'CHECKPOINT_LEASE_HELD';

export interface CheckpointRecordResult {
  status: 'acknowledged' | 'unacknowledged';
  revision?: number;
  code?: string;
  reason?: string;
  retryable: boolean;
  buffered: number;
  dropped: number;
}

export interface CheckpointSessionStatus {
  started: boolean;
  projectId: string;
  agentId: string;
  taskId?: string;
  expectedRevision?: number;
  lastAcknowledgedRevision?: number;
  lease?: {
    leaseId: string;
    fencingToken: number;
    expiresAt: number;
  };
  engine: ReturnType<CheckpointEngine['status']>;
}

const DEFAULT_RETRY: CheckpointRetryPolicy = {
  attempts: 3,
  baseDelayMs: 25,
  maxDelayMs: 1_000,
};

const DEFAULT_LEASE_TTL_MS = 120_000;

function validateRetry(policy: CheckpointRetryPolicy): void {
  if (!Number.isSafeInteger(policy.attempts) || policy.attempts < 1) {
    throw new Error('CHECKPOINT_INVALID_RETRY_ATTEMPTS');
  }

  if (policy.baseDelayMs < 0 || policy.maxDelayMs < 0) {
    throw new Error('CHECKPOINT_INVALID_RETRY_DELAY');
  }
}

function backoffDelay(policy: CheckpointRetryPolicy, attempt: number): number {
  return Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** (attempt - 1));
}

function failure(
  code: CheckpointSessionFailureCode,
  reason: string,
  retryable = false
): CheckpointRecordResult {
  return {
    status: 'unacknowledged',
    code,
    reason,
    retryable,
    buffered: 0,
    dropped: 0,
  };
}

/**
 * Build the atomic operation batch for one normalized event.
 *
 * Completion is special: it only produces a `completed` transition when the
 * event itself carries a passing test. The authority re-checks this rule, so a
 * bug here still cannot fabricate completion.
 */
export function eventToOperations(
  event: AgentCheckpointEvent,
  taskId: string
): AuthorityOperation[] {
  switch (event.type) {
    case 'task.started': {
      return [
        {
          type: 'task.status',
          taskId,
          status: 'in_progress',
          ...(event.nextAction === undefined ? {} : { nextAction: event.nextAction }),
        },
      ];
    }

    case 'task.updated': {
      const operations: AuthorityOperation[] = [];

      if (event.done?.length || event.remaining?.length) {
        operations.push({
          type: 'task.work',
          taskId,
          ...(event.done === undefined ? {} : { done: event.done }),
          ...(event.remaining === undefined ? {} : { remaining: event.remaining }),
        });
      }

      if (event.nextAction !== undefined) {
        operations.push({ type: 'task.work', taskId, nextAction: event.nextAction });
      }

      if (operations.length === 0) {
        throw new Error('CHECKPOINT_EVENT_EMPTY: task.updated has no work fields');
      }

      return operations;
    }

    case 'task.completed': {
      if (!event.tests.some((test) => test.outcome === 'pass')) {
        throw new Error(
          'CHECKPOINT_COMPLETION_NEEDS_PASSING_TEST: completion requires a recorded passing test'
        );
      }

      if (event.tests.some((test) => test.outcome === 'fail')) {
        throw new Error(
          'CHECKPOINT_COMPLETION_NEEDS_PASSING_TEST: a failing test cannot complete a task'
        );
      }

      return [
        ...event.tests.map((test): AuthorityOperation => ({
          type: 'task.test.recorded',
          taskId,
          name: test.name,
          outcome: test.outcome,
        })),
        ...(event.evidence === undefined
          ? []
          : [
              {
                type: 'task.evidence.add' as const,
                taskId,
                ref: event.evidence,
                summary: 'Recorded with task completion',
              },
            ]),
        { type: 'task.status', taskId, status: 'completed' },
      ];
    }

    case 'file.changed': {
      const path = event.path.trim();

      if (!path) {
        throw new Error('CHECKPOINT_EVENT_INVALID: file.changed needs a path');
      }

      return [{ type: 'task.file.touched', taskId, path }];
    }

    case 'test.passed':
    case 'test.failed': {
      const name = event.name.trim();

      if (!name) {
        throw new Error('CHECKPOINT_EVENT_INVALID: a test needs a name');
      }

      return [
        {
          type: 'task.test.recorded',
          taskId,
          name,
          outcome: event.type === 'test.passed' ? 'pass' : 'fail',
        },
      ];
    }

    case 'blocker.detected': {
      const reason = event.reason.trim();

      if (!reason) {
        throw new Error('CHECKPOINT_EVENT_INVALID: a blocker needs a reason');
      }

      return [
        {
          type: 'task.status',
          taskId,
          status: 'blocked',
          blockerReason: reason,
          ...(event.nextAction === undefined ? {} : { nextAction: event.nextAction }),
        },
      ];
    }

    case 'blocker.resolved': {
      return [
        {
          type: 'task.status',
          taskId,
          status: 'in_progress',
          ...(event.nextAction === undefined ? {} : { nextAction: event.nextAction }),
        },
      ];
    }

    case 'decision.changed': {
      const text = event.text.trim();

      if (!text) {
        throw new Error('CHECKPOINT_EVENT_INVALID: a decision needs text');
      }

      return [{ type: 'decision.add', text }];
    }

    case 'next_action.updated': {
      const nextAction = event.nextAction.trim();

      if (!nextAction) {
        throw new Error('CHECKPOINT_EVENT_INVALID: next action cannot be empty');
      }

      return [{ type: 'task.work', taskId, nextAction }];
    }

    case 'session.interrupted': {
      return [];
    }

    default: {
      throw new Error(
        `CHECKPOINT_EVENT_INVALID: unsupported event ${String((event as { type?: unknown }).type)}`
      );
    }
  }
}

export class CloudCheckpointSession {
  private readonly authority: CloudAuthority;

  private engine: CheckpointEngine;

  private readonly projectId: string;

  private readonly agentId: string;

  private readonly requestedTaskId?: string;

  private readonly leaseTtlMs: number;

  private readonly maxWaitForLeaseMs: number;

  private readonly retry: CheckpointRetryPolicy;

  private readonly now: () => number;

  private readonly sleep: (ms: number) => Promise<void>;

  private expectedRevision?: number;

  private lease?: LeaseGrant['lease'];

  private taskId?: string;

  private started = false;

  private lastAcknowledgedRevision?: number;

  constructor(options: CloudCheckpointSessionOptions) {
    if (!options.projectId.trim() || !options.agentId.trim()) {
      throw new Error('CHECKPOINT_INVALID_REQUEST: project and agent are required');
    }

    this.authority = options.authority;
    this.projectId = options.projectId.trim();
    this.agentId = options.agentId.trim();
    this.requestedTaskId = options.taskId?.trim() || undefined;
    this.leaseTtlMs = options.leaseTtlMs ?? DEFAULT_LEASE_TTL_MS;
    this.maxWaitForLeaseMs = options.maxWaitForLeaseMs ?? 0;
    this.retry = { ...DEFAULT_RETRY, ...options.retry };
    validateRetry(this.retry);
    this.now = options.now ?? (() => Date.now());
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.engine = new CheckpointEngine({
      authority: options.authority,
      mode: options.mode ?? 'strict-cloud-only',
      ...(options.capacity === undefined ? {} : { capacity: options.capacity }),
      now: this.now,
    });

    if (!Number.isSafeInteger(this.leaseTtlMs) || this.leaseTtlMs <= 0) {
      throw new Error('CHECKPOINT_INVALID_LEASE_TTL');
    }
  }

  private resolveTask(snapshot: AuthoritySnapshot): string {
    if (this.requestedTaskId) {
      if (!snapshot.tasks[this.requestedTaskId]) {
        throw new Error(`CHECKPOINT_TASK_NOT_LEASED: unknown task ${this.requestedTaskId}`);
      }

      return this.requestedTaskId;
    }

    const active = selectResumeTask(snapshot);

    if (!active) {
      throw new Error('CHECKPOINT_NO_TASK: no in-progress or blocked task to checkpoint');
    }

    return active.id;
  }

  private async waitForLease(
    request: AcquireLeaseRequest,
    expiresAt: number
  ): Promise<LeaseGrant | null> {
    const waitMs = Math.max(0, expiresAt - this.now());

    if (waitMs > this.maxWaitForLeaseMs) {
      return null;
    }

    if (waitMs > 0) {
      await this.sleep(waitMs);
    }

    const retryRequest: AcquireLeaseRequest = { ...request, now: this.now() };

    return this.authority.acquireLease(retryRequest);
  }

  /**
   * Read authority state and claim the task lease.
   *
   * `takeover` waits for an existing (dead) agent's lease to expire within
   * `maxWaitForLeaseMs`; without it, a live lease is reported as LEASE_HELD and
   * nothing is written.
   */
  async start(
    options: { takeover?: boolean } = {}
  ): Promise<
    { ok: true; taskId: string; revision: number } | { ok: false; code: string; reason: string }
  > {
    if (this.started) {
      return { ok: false, code: 'CHECKPOINT_ALREADY_STARTED', reason: 'Session already started' };
    }

    let snapshot: AuthoritySnapshot;

    try {
      snapshot = await this.authority.fetchSnapshot(this.projectId);
    } catch (error) {
      return {
        ok: false,
        code: error instanceof AuthorityError ? error.code : 'AUTHORITY_UNAVAILABLE',
        reason: 'Cloud authority is unavailable; no checkpoint is claimed',
      };
    }

    let taskId: string;

    try {
      taskId = this.resolveTask(snapshot);
    } catch (error) {
      return {
        ok: false,
        code: error instanceof Error ? error.message.split(':')[0]! : 'CHECKPOINT_NO_TASK',
        reason: error instanceof Error ? error.message : 'No task to checkpoint',
      };
    }

    const request: AcquireLeaseRequest = {
      projectId: this.projectId,
      taskId,
      agentId: this.agentId,
      ttlMs: this.leaseTtlMs,
      now: this.now(),
    };

    try {
      let grant: LeaseGrant;

      try {
        grant = await this.authority.acquireLease(request);
      } catch (error) {
        if (error instanceof AuthorityError && error.code === 'AUTHORITY_LEASE_HELD') {
          if (!options.takeover) {
            return {
              ok: false,
              code: 'CHECKPOINT_LEASE_HELD',
              reason: error.message,
            };
          }

          const existing = snapshot.leases[taskId];
          const acquired = existing
            ? await this.waitForLease(request, existing.expiresAt)
            : await this.authority.acquireLease({ ...request, now: this.now() });

          if (!acquired) {
            return {
              ok: false,
              code: 'CHECKPOINT_LEASE_HELD',
              reason: `Lease held by ${existing?.agentId ?? 'another agent'} and takeover wait was exceeded`,
            };
          }

          grant = acquired;
        } else {
          throw error;
        }
      }

      this.lease = grant.lease;
      this.expectedRevision = snapshot.revision;
      this.taskId = taskId;
      this.started = true;

      return { ok: true, taskId, revision: snapshot.revision };
    } catch (error) {
      return {
        ok: false,
        code: error instanceof AuthorityError ? error.code : 'AUTHORITY_UNAVAILABLE',
        reason: error instanceof Error ? error.message : 'Unable to claim the task lease',
      };
    }
  }

  private requireStarted(): { taskId: string; lease: LeaseGrant['lease'] } {
    if (!this.started || !this.taskId || !this.lease) {
      throw new Error('CHECKPOINT_NOT_STARTED: start() must claim a task lease first');
    }

    return { taskId: this.taskId, lease: this.lease };
  }

  private requestFor(operations: AuthorityOperation[], idempotencyKey: string) {
    const { taskId, lease } = this.requireStarted();

    return {
      projectId: this.projectId,
      agentId: this.agentId,
      taskId,
      leaseId: lease.leaseId,
      fencingToken: lease.fencingToken,
      operations,
      expectedRevision: this.expectedRevision ?? 0,
      idempotencyKey,
      now: this.now(),
    };
  }

  private async submitOnce(
    operations: AuthorityOperation[],
    idempotencyKey: string
  ): Promise<CheckpointResult> {
    return this.engine.submit(this.requestFor(operations, idempotencyKey));
  }

  /**
   * Retry the oldest buffered batches with exponential backoff.
   *
   * The idempotency key is carried inside the buffered request, so a timeout
   * followed by a successful retry returns the original ACK instead of applying
   * the batch twice.
   */
  async flush(): Promise<{
    attempted: number;
    acknowledged: number;
    remaining: number;
    lastResult?: CheckpointResult;
  }> {
    return this.engine.retryBuffered();
  }

  /**
   * Record one agent event.
   *
   * Returns `acknowledged` only after the cloud confirms the revision. Retryable
   * failures stay in the bounded RAM queue and are retried with backoff inside
   * this call; if they still fail, the caller sees `unacknowledged`.
   */
  async record(event: AgentCheckpointEvent): Promise<CheckpointRecordResult> {
    let taskId: string;

    try {
      taskId = this.requireStarted().taskId;
    } catch (error) {
      return {
        status: 'unacknowledged',
        code: 'CHECKPOINT_NOT_STARTED',
        reason: error instanceof Error ? error.message : 'No active checkpoint session',
        retryable: false,
        buffered: 0,
        dropped: 0,
      };
    }

    if (event.type === 'session.interrupted') {
      const flushed = await this.flush();
      const result = flushed.lastResult;

      return {
        status: result?.status ?? 'unacknowledged',
        revision: result?.revision,
        code: result?.code,
        reason: result?.reason,
        retryable: result?.retryable ?? false,
        buffered: flushed.remaining,
        dropped: result?.dropped ?? 0,
      };
    }

    let operations: AuthorityOperation[];

    try {
      operations = eventToOperations(event, taskId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid checkpoint event';
      const code = message.startsWith('CHECKPOINT_')
        ? message.split(':')[0]!
        : 'CHECKPOINT_EVENT_INVALID';
      return {
        status: 'unacknowledged',
        code,
        reason: message,
        retryable: false,
        buffered: 0,
        dropped: 0,
      };
    }

    const idempotencyKey =
      event.id?.trim() ||
      `${this.projectId}:${this.agentId}:${taskId}:${this.now()}:${Math.random()}`;

    if (operations.length === 0) {
      return {
        status: 'unacknowledged',
        code: 'CHECKPOINT_EVENT_INVALID',
        reason: 'Event produced no authority operation',
        retryable: false,
        buffered: 0,
        dropped: 0,
      };
    }

    let result = await this.submitOnce(operations, idempotencyKey);

    /*
     * A revision conflict means another writer advanced the project while this
     * agent was working. If this session still owns the lease, re-read and try
     * the same idempotent batch once; otherwise surface the conflict instead of
     * overwriting the newer writer.
     */
    if (result.status !== 'acknowledged' && result.code === 'AUTHORITY_REVISION_CONFLICT') {
      const refreshed = await this.refresh();

      if (refreshed) {
        result = await this.submitOnce(operations, idempotencyKey);
      }
    }

    if (result.status === 'acknowledged') {
      const revision = result.revision ?? this.expectedRevision ?? 0;
      this.expectedRevision = revision;
      this.lastAcknowledgedRevision = revision;

      return {
        status: 'acknowledged',
        revision,
        retryable: false,
        buffered: result.buffered,
        dropped: result.dropped,
      };
    }

    if (!result.retryable) {
      return {
        status: 'unacknowledged',
        ...(result.revision === undefined ? {} : { revision: result.revision }),
        ...(result.code === undefined ? {} : { code: result.code }),
        ...(result.reason === undefined ? {} : { reason: result.reason }),
        retryable: false,
        buffered: result.buffered,
        dropped: result.dropped,
      };
    }

    const flushed = await this.flush();

    return {
      status: flushed.lastResult?.status ?? 'unacknowledged',
      revision: flushed.lastResult?.revision,
      code: flushed.lastResult?.code,
      reason: flushed.lastResult?.reason,
      retryable: flushed.lastResult?.retryable ?? false,
      buffered: flushed.remaining,
      dropped: flushed.lastResult?.dropped ?? 0,
    };
  }

  /**
   * Re-read authority state and re-acquire the lease if it is still ours.
   * Returns false when the lease was taken over (a stale writer must not write).
   */
  async refresh(): Promise<boolean> {
    const current = this.requireStarted();

    try {
      const snapshot = await this.authority.fetchSnapshot(this.projectId);
      this.expectedRevision = snapshot.revision;

      const lease = snapshot.leases[current.taskId];

      if (
        !lease ||
        lease.leaseId !== current.lease.leaseId ||
        lease.fencingToken !== current.lease.fencingToken ||
        lease.agentId !== this.agentId
      ) {
        return false;
      }

      this.lease = lease;
      return true;
    } catch {
      return false;
    }
  }

  async heartbeat(): Promise<{ ok: boolean; code?: string; expiresAt?: number }> {
    const current = this.requireStarted();
    const request: HeartbeatLeaseRequest = {
      projectId: this.projectId,
      taskId: current.taskId,
      agentId: this.agentId,
      leaseId: current.lease.leaseId,
      fencingToken: current.lease.fencingToken,
      ttlMs: this.leaseTtlMs,
      now: this.now(),
    };

    try {
      const grant = await this.authority.heartbeat(request);
      this.lease = grant.lease;
      return { ok: true, expiresAt: grant.lease.expiresAt };
    } catch (error) {
      const code = error instanceof AuthorityError ? error.code : 'AUTHORITY_UNAVAILABLE';

      if (code === 'AUTHORITY_LEASE_FENCED' || code === 'AUTHORITY_LEASE_EXPIRED') {
        this.started = false;
      }

      return { ok: false, code };
    }
  }

  async release(): Promise<void> {
    if (!this.started || !this.lease || !this.taskId) {
      return;
    }

    try {
      await this.authority.release({
        projectId: this.projectId,
        taskId: this.taskId,
        agentId: this.agentId,
        leaseId: this.lease.leaseId,
        fencingToken: this.lease.fencingToken,
        now: this.now(),
      });
    } catch {
      // A dead process cannot release; lease expiry remains the safety net.
    } finally {
      this.started = false;
    }
  }

  status(): CheckpointSessionStatus {
    const engine = this.engine.status();

    return {
      started: this.started,
      projectId: this.projectId,
      agentId: this.agentId,
      ...(this.taskId === undefined ? {} : { taskId: this.taskId }),
      ...(this.expectedRevision === undefined ? {} : { expectedRevision: this.expectedRevision }),
      ...(this.lastAcknowledgedRevision === undefined
        ? {}
        : { lastAcknowledgedRevision: this.lastAcknowledgedRevision }),
      ...(this.lease === undefined
        ? {}
        : {
            lease: {
              leaseId: this.lease.leaseId,
              fencingToken: this.lease.fencingToken,
              expiresAt: this.lease.expiresAt,
            },
          }),
      engine,
    };
  }
}
