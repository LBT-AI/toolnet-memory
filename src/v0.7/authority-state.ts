/**
 * ToolNet v0.7 cloud authority state machine.
 *
 * Pure, deterministic, and storage-agnostic. The Durable Object that owns a
 * project in Cloudflare Workers uses exactly this state machine, and so does the
 * in-memory authority used by tests. Keeping the transaction rules in one place
 * means "what the cloud accepted" cannot drift from "what the tests proved".
 *
 * Invariants:
 * - revisions are project-scoped and strictly increasing;
 * - a commit is atomic: either every operation applies or none does;
 * - task mutations require the live lease and its fencing token, so a stale
 *   writer cannot overwrite a newer agent's work;
 * - a task cannot be completed without a passing test, so completion evidence
 *   is never fabricated;
 * - a repeated idempotency key returns the original ACK instead of applying the
 *   batch twice.
 */

import { createHash } from 'node:crypto';

export type KnowledgeProvenance = 'user' | 'code' | 'test' | 'inferred';
export type AuthorityTaskStatus = 'pending' | 'in_progress' | 'blocked' | 'completed';
export type TaskVerification = 'unverified' | 'partially_verified' | 'verified';
export type AuthorityTestOutcome = 'pass' | 'fail' | 'skip';

export interface AuthorityRule {
  id: string;
  text: string;
  mandatory: boolean;
  verified: boolean;
  provenance: KnowledgeProvenance;
}

export interface AuthorityFlow {
  id: string;
  description: string;
  critical: boolean;
  verified: boolean;
  provenance: KnowledgeProvenance;
}

export interface AuthorityEvidence {
  ref: string;
  summary?: string;
  at: string;
}

export interface AuthorityTest {
  name: string;
  outcome: AuthorityTestOutcome;
}

export interface AuthorityTask {
  id: string;
  title: string;
  status: AuthorityTaskStatus;
  verification: TaskVerification;
  done: string[];
  remaining: string[];
  filesTouched: string[];
  blockers: string[];
  nextAction?: string;
  evidence: AuthorityEvidence[];
  tests: AuthorityTest[];
  assignedAgentId?: string;
  revision: number;
}

export interface AuthorityLease {
  leaseId: string;
  taskId: string;
  agentId: string;
  fencingToken: number;
  acquiredAt: number;
  heartbeatAt: number;
  expiresAt: number;
}

export interface AuthorityCheckpoint {
  revision: number;
  acknowledgedAt: string;
  sourceAgent: string;
  codeRevision?: string;
}

export interface AuthoritySnapshot {
  projectId: string;
  projectName: string;
  branch?: string;
  codeRevision?: string;
  revision: number;
  sequence: number;
  tasks: Record<string, AuthorityTask>;
  rules: AuthorityRule[];
  flows: AuthorityFlow[];
  decisions: string[];
  leases: Record<string, AuthorityLease>;
  checkpoint?: AuthorityCheckpoint;
  generatedAt: string;
}

export type AuthorityOperation =
  | {
      type: 'task.create';
      task: { id: string; title: string; status?: AuthorityTaskStatus };
    }
  | {
      type: 'task.status';
      taskId: string;
      status: AuthorityTaskStatus;
      blockerReason?: string;
      nextAction?: string;
    }
  | {
      type: 'task.work';
      taskId: string;
      done?: string[];
      remaining?: string[];
      nextAction?: string | null;
    }
  | { type: 'task.file.touched'; taskId: string; path: string }
  | { type: 'task.evidence.add'; taskId: string; ref: string; summary?: string }
  | {
      type: 'task.test.recorded';
      taskId: string;
      name: string;
      outcome: AuthorityTestOutcome;
    }
  | { type: 'rule.upsert'; rule: Omit<AuthorityRule, 'verified'> & { verified?: boolean } }
  | {
      type: 'flow.upsert';
      flow: Omit<AuthorityFlow, 'verified'> & { verified?: boolean };
    }
  | { type: 'decision.add'; text: string }
  | { type: 'project.revision'; branch?: string; codeRevision?: string };

export type AuthorityErrorCode =
  | 'AUTHORITY_PROJECT_MISMATCH'
  | 'AUTHORITY_PROJECT_UNKNOWN'
  | 'AUTHORITY_REVISION_CONFLICT'
  | 'AUTHORITY_EMPTY_COMMIT'
  | 'AUTHORITY_INVALID_OPERATION'
  | 'AUTHORITY_TASK_UNKNOWN'
  | 'AUTHORITY_TASK_EXISTS'
  | 'AUTHORITY_LEASE_REQUIRED'
  | 'AUTHORITY_LEASE_HELD'
  | 'AUTHORITY_LEASE_FENCED'
  | 'AUTHORITY_LEASE_EXPIRED'
  | 'AUTHORITY_COMPLETION_REQUIRES_PASSING_TEST'
  | 'AUTHORITY_IDEMPOTENCY_MISMATCH'
  | 'AUTHORITY_UNAVAILABLE'
  | 'AUTHORITY_AUTH_FAILED'
  | 'AUTHORITY_TIMEOUT'
  | 'AUTHORITY_INVALID_RESPONSE';

export class AuthorityError extends Error {
  readonly code: AuthorityErrorCode;
  readonly details: Record<string, unknown>;

  constructor(code: AuthorityErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'AuthorityError';
    this.code = code;
    this.details = details;
  }

  get retryable(): boolean {
    return this.code === 'AUTHORITY_UNAVAILABLE' || this.code === 'AUTHORITY_TIMEOUT';
  }
}

export interface AuthorityCommitRequest {
  projectId: string;
  agentId: string;
  operations: AuthorityOperation[];
  /** Optimistic concurrency: the revision the caller last read. */
  expectedRevision: number;
  leaseId?: string;
  fencingToken?: number;
  idempotencyKey?: string;
  now: number;
  codeRevision?: string;
}

export interface AuthorityCommitResult {
  acknowledged: true;
  revision: number;
  sequence: number;
  acknowledgedAt: string;
  duplicate: boolean;
  appliedOperations: number;
  checkpoint: AuthorityCheckpoint;
}

export interface AcquireLeaseRequest {
  projectId: string;
  taskId: string;
  agentId: string;
  ttlMs: number;
  now: number;
}

export interface HeartbeatLeaseRequest {
  projectId: string;
  taskId: string;
  agentId: string;
  leaseId: string;
  fencingToken: number;
  ttlMs: number;
  now: number;
}

export interface ReleaseLeaseRequest {
  projectId: string;
  taskId: string;
  agentId: string;
  leaseId: string;
  fencingToken: number;
  now: number;
}

export interface LeaseGrant {
  lease: AuthorityLease;
  revision: number;
}

export interface AuthoritySeed {
  projectId: string;
  projectName: string;
  branch?: string;
  codeRevision?: string;
  tasks?: Array<
    Pick<AuthorityTask, 'id' | 'title'> &
      Partial<Omit<AuthorityTask, 'id' | 'title' | 'revision'>> & { revision?: number }
  >;
  rules?: AuthorityRule[];
  flows?: AuthorityFlow[];
  decisions?: string[];
}

const TASK_MUTATIONS: ReadonlySet<AuthorityOperation['type']> = new Set([
  'task.status',
  'task.work',
  'task.file.touched',
  'task.evidence.add',
  'task.test.recorded',
]);

function clone<T>(value: T): T {
  return structuredClone(value);
}

function normalizeText(value: string): string {
  return value.normalize('NFKC').replace(/\s+/gu, ' ').trim().toLowerCase();
}

function uniquePush(target: string[], incoming: string[]): void {
  const seen = new Set(target.map(normalizeText));

  for (const raw of incoming) {
    const value = raw.trim();

    if (!value) {
      continue;
    }

    const key = normalizeText(value);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    target.push(value);
  }
}

function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function createAuthorityState(seed: AuthoritySeed, now: number): AuthorityStateMachine {
  return new AuthorityStateMachine(seed, now);
}

/**
 * Rehydrate a Durable Object from its persisted snapshot.
 *
 * The idempotency cache is intentionally not persisted: a replay after a cold
 * start is re-validated against the current revision instead of trusting a
 * cached ACK, which keeps the transactional rules authoritative.
 */
export function restoreAuthorityState(snapshot: AuthoritySnapshot): AuthorityStateMachine {
  return AuthorityStateMachine.fromSnapshot(snapshot);
}

export class AuthorityStateMachine {
  private state: AuthoritySnapshot;

  private idempotency = new Map<string, { digest: string; result: AuthorityCommitResult }>();

  static fromSnapshot(snapshot: AuthoritySnapshot): AuthorityStateMachine {
    const machine = Object.create(AuthorityStateMachine.prototype) as AuthorityStateMachine;

    machine.state = clone(snapshot);
    machine.idempotency = new Map();

    return machine;
  }

  constructor(seed: AuthoritySeed, now: number) {
    if (!seed.projectId.trim() || !seed.projectName.trim()) {
      throw new AuthorityError(
        'AUTHORITY_INVALID_OPERATION',
        'A project id and name are required to seed the authority'
      );
    }

    const tasks: Record<string, AuthorityTask> = {};

    for (const task of seed.tasks ?? []) {
      tasks[task.id] = {
        id: task.id,
        title: task.title,
        status: task.status ?? 'pending',
        verification: task.verification ?? 'unverified',
        done: task.done ?? [],
        remaining: task.remaining ?? [],
        filesTouched: task.filesTouched ?? [],
        blockers: task.blockers ?? [],
        ...(task.nextAction === undefined ? {} : { nextAction: task.nextAction }),
        ...(task.assignedAgentId === undefined ? {} : { assignedAgentId: task.assignedAgentId }),
        evidence: task.evidence ?? [],
        tests: task.tests ?? [],
        revision: task.revision ?? 1,
      };
    }

    this.state = {
      projectId: seed.projectId,
      projectName: seed.projectName,
      ...(seed.branch === undefined ? {} : { branch: seed.branch }),
      ...(seed.codeRevision === undefined ? {} : { codeRevision: seed.codeRevision }),
      revision: 0,
      sequence: 0,
      tasks,
      rules: clone(seed.rules ?? []),
      flows: clone(seed.flows ?? []),
      decisions: clone(seed.decisions ?? []),
      leases: {},
      generatedAt: new Date(now).toISOString(),
    };
  }

  projectId(): string {
    return this.state.projectId;
  }

  revision(): number {
    return this.state.revision;
  }

  snapshot(): AuthoritySnapshot {
    return clone(this.state);
  }

  private requireProject(projectId: string): void {
    if (projectId !== this.state.projectId) {
      throw new AuthorityError(
        'AUTHORITY_PROJECT_MISMATCH',
        `Project ${projectId} does not belong to this authority`
      );
    }
  }

  private task(taskId: string): AuthorityTask {
    const task = this.state.tasks[taskId];

    if (!task) {
      throw new AuthorityError('AUTHORITY_TASK_UNKNOWN', `Unknown task: ${taskId}`, { taskId });
    }

    return task;
  }

  private requireLease(taskId: string, request: AuthorityCommitRequest): AuthorityLease {
    const lease = this.state.leases[taskId];

    if (!lease) {
      throw new AuthorityError(
        'AUTHORITY_LEASE_REQUIRED',
        `Task ${taskId} has no active lease; acquire ownership before mutating it`,
        { taskId }
      );
    }

    if (
      request.leaseId !== lease.leaseId ||
      request.fencingToken !== lease.fencingToken ||
      request.agentId !== lease.agentId
    ) {
      throw new AuthorityError(
        'AUTHORITY_LEASE_FENCED',
        `Stale writer rejected for task ${taskId}: fencing token ${String(request.fencingToken)} is not the active token`,
        { taskId, activeFencingToken: lease.fencingToken }
      );
    }

    if (request.now > lease.expiresAt) {
      throw new AuthorityError(
        'AUTHORITY_LEASE_EXPIRED',
        `Lease for task ${taskId} expired at ${new Date(lease.expiresAt).toISOString()}`,
        { taskId, expiresAt: lease.expiresAt }
      );
    }

    return lease;
  }

  acquireLease(request: AcquireLeaseRequest): LeaseGrant {
    this.requireProject(request.projectId);

    if (!Number.isSafeInteger(request.ttlMs) || request.ttlMs <= 0) {
      throw new AuthorityError('AUTHORITY_INVALID_OPERATION', 'Lease ttlMs must be positive');
    }

    const task = this.task(request.taskId);
    const existing = this.state.leases[request.taskId];

    if (existing && existing.agentId !== request.agentId && request.now <= existing.expiresAt) {
      throw new AuthorityError(
        'AUTHORITY_LEASE_HELD',
        `Task ${request.taskId} is leased by ${existing.agentId} until ${new Date(existing.expiresAt).toISOString()}`,
        { taskId: request.taskId, owner: existing.agentId, expiresAt: existing.expiresAt }
      );
    }

    const fencingToken = existing ? existing.fencingToken + 1 : 1;

    const lease: AuthorityLease = {
      leaseId: `lease-${task.id}-${fencingToken}`,
      taskId: task.id,
      agentId: request.agentId,
      fencingToken,
      acquiredAt: request.now,
      heartbeatAt: request.now,
      expiresAt: request.now + request.ttlMs,
    };

    this.state.leases[task.id] = lease;
    task.assignedAgentId = request.agentId;

    return { lease: clone(lease), revision: this.state.revision };
  }

  heartbeat(request: HeartbeatLeaseRequest): LeaseGrant {
    this.requireProject(request.projectId);

    const lease = this.state.leases[request.taskId];

    if (
      !lease ||
      lease.leaseId !== request.leaseId ||
      lease.fencingToken !== request.fencingToken ||
      lease.agentId !== request.agentId
    ) {
      throw new AuthorityError(
        'AUTHORITY_LEASE_FENCED',
        `Lease ${request.leaseId} for task ${request.taskId} is no longer active`,
        { taskId: request.taskId }
      );
    }

    if (request.now > lease.expiresAt) {
      throw new AuthorityError(
        'AUTHORITY_LEASE_EXPIRED',
        `Lease for task ${request.taskId} already expired`,
        { taskId: request.taskId }
      );
    }

    lease.heartbeatAt = request.now;
    lease.expiresAt = request.now + request.ttlMs;

    return { lease: clone(lease), revision: this.state.revision };
  }

  release(request: ReleaseLeaseRequest): AuthorityLease {
    this.requireProject(request.projectId);

    const lease = this.state.leases[request.taskId];

    if (
      !lease ||
      lease.leaseId !== request.leaseId ||
      lease.fencingToken !== request.fencingToken ||
      lease.agentId !== request.agentId
    ) {
      throw new AuthorityError(
        'AUTHORITY_LEASE_FENCED',
        `Lease ${request.leaseId} for task ${request.taskId} is no longer active`,
        { taskId: request.taskId }
      );
    }

    const released = clone(lease);
    delete this.state.leases[request.taskId];

    return released;
  }

  private applyOperation(operation: AuthorityOperation, request: AuthorityCommitRequest): void {
    switch (operation.type) {
      case 'task.create': {
        if (this.state.tasks[operation.task.id]) {
          throw new AuthorityError(
            'AUTHORITY_TASK_EXISTS',
            `Task ${operation.task.id} already exists`,
            { taskId: operation.task.id }
          );
        }

        if (!operation.task.id.trim() || !operation.task.title.trim()) {
          throw new AuthorityError('AUTHORITY_INVALID_OPERATION', 'A task needs an id and a title');
        }

        this.state.tasks[operation.task.id] = {
          id: operation.task.id,
          title: operation.task.title.trim(),
          status: operation.task.status ?? 'pending',
          verification: 'unverified',
          done: [],
          remaining: [],
          filesTouched: [],
          blockers: [],
          evidence: [],
          tests: [],
          revision: 1,
        };

        return;
      }

      case 'task.status': {
        const task = this.task(operation.taskId);

        this.requireLease(task.id, request);

        if (operation.status === 'completed') {
          const hasPassingTest = task.tests.some((test) => test.outcome === 'pass');

          if (!hasPassingTest) {
            throw new AuthorityError(
              'AUTHORITY_COMPLETION_REQUIRES_PASSING_TEST',
              `Task ${task.id} cannot be completed without a passing test`,
              { taskId: task.id }
            );
          }

          task.verification = 'verified';
        }

        if (operation.status === 'blocked' && !operation.blockerReason?.trim()) {
          throw new AuthorityError(
            'AUTHORITY_INVALID_OPERATION',
            `Blocking task ${task.id} requires a blocker reason`,
            { taskId: task.id }
          );
        }

        task.status = operation.status;
        task.revision += 1;

        if (operation.blockerReason?.trim()) {
          uniquePush(task.blockers, [operation.blockerReason]);
        } else if (operation.status !== 'blocked') {
          task.blockers = [];
        }

        if (operation.nextAction === undefined) {
          task.nextAction = task.nextAction;
        } else {
          task.nextAction = operation.nextAction;
        }

        return;
      }

      case 'task.work': {
        const task = this.task(operation.taskId);

        this.requireLease(task.id, request);

        uniquePush(task.done, operation.done ?? []);
        uniquePush(task.remaining, operation.remaining ?? []);

        if (operation.nextAction === null) {
          delete task.nextAction;
        } else if (operation.nextAction !== undefined) {
          task.nextAction = operation.nextAction;
        }

        task.revision += 1;

        return;
      }

      case 'task.file.touched': {
        const task = this.task(operation.taskId);

        this.requireLease(task.id, request);
        uniquePush(task.filesTouched, [operation.path]);
        task.revision += 1;

        return;
      }

      case 'task.evidence.add': {
        const task = this.task(operation.taskId);

        this.requireLease(task.id, request);

        if (!task.evidence.some((item) => item.ref === operation.ref)) {
          task.evidence.push({
            ref: operation.ref,
            ...(operation.summary === undefined ? {} : { summary: operation.summary }),
            at: new Date(request.now).toISOString(),
          });
        }

        task.revision += 1;

        return;
      }

      case 'task.test.recorded': {
        const task = this.task(operation.taskId);

        this.requireLease(task.id, request);

        const existing = task.tests.find((test) => test.name === operation.name);

        if (existing) {
          existing.outcome = operation.outcome;
        } else {
          task.tests.push({ name: operation.name, outcome: operation.outcome });
        }

        if (task.tests.some((test) => test.outcome === 'fail')) {
          task.verification = 'partially_verified';
        } else if (task.tests.some((test) => test.outcome === 'pass')) {
          task.verification = 'verified';
        }

        task.revision += 1;

        return;
      }

      case 'rule.upsert': {
        const rule: AuthorityRule = {
          ...operation.rule,
          verified:
            operation.rule.provenance === 'inferred' ? false : (operation.rule.verified ?? false),
        };

        if (!rule.id.trim() || !rule.text.trim()) {
          throw new AuthorityError('AUTHORITY_INVALID_OPERATION', 'A rule needs an id and text');
        }

        const index = this.state.rules.findIndex((item) => item.id === rule.id);

        if (index >= 0) {
          this.state.rules[index] = rule;
        } else {
          this.state.rules.push(rule);
        }

        return;
      }

      case 'flow.upsert': {
        const flow: AuthorityFlow = {
          ...operation.flow,
          verified:
            operation.flow.provenance === 'inferred' ? false : (operation.flow.verified ?? false),
        };

        if (!flow.id.trim() || !flow.description.trim()) {
          throw new AuthorityError(
            'AUTHORITY_INVALID_OPERATION',
            'A flow needs an id and description'
          );
        }

        const index = this.state.flows.findIndex((item) => item.id === flow.id);

        if (index >= 0) {
          this.state.flows[index] = flow;
        } else {
          this.state.flows.push(flow);
        }

        return;
      }

      case 'decision.add': {
        const text = operation.text.trim();

        if (!text) {
          throw new AuthorityError('AUTHORITY_INVALID_OPERATION', 'A decision cannot be empty');
        }

        uniquePush(this.state.decisions, [text]);

        return;
      }

      case 'project.revision': {
        if (operation.branch !== undefined) {
          this.state.branch = operation.branch;
        }

        if (operation.codeRevision !== undefined) {
          this.state.codeRevision = operation.codeRevision;
        }

        return;
      }

      default: {
        throw new AuthorityError(
          'AUTHORITY_INVALID_OPERATION',
          `Unsupported authority operation: ${String((operation as { type?: unknown }).type)}`
        );
      }
    }
  }

  commit(request: AuthorityCommitRequest): AuthorityCommitResult {
    this.requireProject(request.projectId);

    if (!request.agentId.trim()) {
      throw new AuthorityError('AUTHORITY_INVALID_OPERATION', 'An agent id is required');
    }

    if (request.operations.length === 0) {
      throw new AuthorityError(
        'AUTHORITY_EMPTY_COMMIT',
        'A commit must contain at least one operation'
      );
    }

    const key = request.idempotencyKey?.trim() || digest(request);

    const payloadDigest = digest({
      projectId: request.projectId,
      agentId: request.agentId,
      operations: request.operations,
      expectedRevision: request.expectedRevision,
      leaseId: request.leaseId ?? null,
      fencingToken: request.fencingToken ?? null,
    });

    const cached = this.idempotency.get(key);

    if (cached) {
      if (cached.digest !== payloadDigest) {
        throw new AuthorityError(
          'AUTHORITY_IDEMPOTENCY_MISMATCH',
          `Idempotency key ${key} was already used with a different payload`
        );
      }

      return { ...clone(cached.result), duplicate: true };
    }

    if (request.expectedRevision !== this.state.revision) {
      throw new AuthorityError(
        'AUTHORITY_REVISION_CONFLICT',
        `Expected revision ${request.expectedRevision} but the authority is at ${this.state.revision}`,
        { expectedRevision: request.expectedRevision, currentRevision: this.state.revision }
      );
    }

    /*
     * Validate lease ownership for every task mutation before applying anything.
     * A partially applied batch would make a crash unrecoverable.
     */
    for (const operation of request.operations) {
      if (TASK_MUTATIONS.has(operation.type)) {
        const taskId = (operation as { taskId?: string }).taskId;

        if (!taskId) {
          throw new AuthorityError(
            'AUTHORITY_INVALID_OPERATION',
            `${operation.type} requires a taskId`
          );
        }

        this.requireLease(taskId, request);
      }
    }

    const draft = clone(this.state);

    try {
      for (const operation of request.operations) {
        this.applyOperation(operation, request);
      }
    } catch (error) {
      this.state = draft;

      throw error;
    }

    this.state.revision += 1;
    this.state.sequence += 1;
    this.state.generatedAt = new Date(request.now).toISOString();

    if (request.codeRevision !== undefined) {
      this.state.codeRevision = request.codeRevision;
    }

    this.state.checkpoint = {
      revision: this.state.revision,
      acknowledgedAt: new Date(request.now).toISOString(),
      sourceAgent: request.agentId,
      ...(this.state.codeRevision === undefined ? {} : { codeRevision: this.state.codeRevision }),
    };

    const result: AuthorityCommitResult = {
      acknowledged: true,
      revision: this.state.revision,
      sequence: this.state.sequence,
      acknowledgedAt: this.state.checkpoint.acknowledgedAt,
      duplicate: false,
      appliedOperations: request.operations.length,
      checkpoint: clone(this.state.checkpoint),
    };

    this.idempotency.set(key, { digest: payloadDigest, result: clone(result) });

    return result;
  }
}
