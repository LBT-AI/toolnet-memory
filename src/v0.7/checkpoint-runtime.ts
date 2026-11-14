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
import type {
  AcquireLeaseRequest,
  HeartbeatLeaseRequest,
  LeaseGrant,
} from './authority-state.js';
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
        ...event.tests.map(
          (test): AuthorityOperation => ({
            type: 'task.test.recorded',
            taskId,
            name: test.name,
            outcome: test.outcome,
          })
        ),
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
