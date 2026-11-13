/**
 * ToolNet v0.7 cloud authority clients.
 *
 * The authority is the only source of truth for project revisions, task state,
 * leases and acknowledged checkpoints. Both implementations below speak the same
 * contract, so tests exercise the real transaction rules rather than a stub.
 *
 * Nothing here writes to the filesystem. A cloud failure is surfaced as an
 * error; it is never converted into a local fallback.
 */

import {
  AuthorityError,
  AuthorityStateMachine,
  createAuthorityState,
  type AcquireLeaseRequest,
  type AuthorityCommitRequest,
  type AuthorityCommitResult,
  type AuthoritySnapshot,
  type AuthoritySeed,
  type HeartbeatLeaseRequest,
  type LeaseGrant,
  type ReleaseLeaseRequest,
} from './authority-state.js';

export interface CloudAuthority {
  readonly kind: 'cloud' | 'memory';

  fetchSnapshot(projectId: string): Promise<AuthoritySnapshot>;

  commit(request: AuthorityCommitRequest): Promise<AuthorityCommitResult>;

  acquireLease(request: AcquireLeaseRequest): Promise<LeaseGrant>;

  heartbeat(request: HeartbeatLeaseRequest): Promise<LeaseGrant>;

  release(request: ReleaseLeaseRequest): Promise<LeaseGrant>;
}

export interface InMemoryAuthorityOptions {
  now?: () => number;
}

/**
 * A faithful in-process authority. It is used by unit and integration tests and
 * by the acceptance scenario; production code uses `HttpCloudAuthority`.
 */
export class InMemoryCloudAuthority implements CloudAuthority {
  readonly kind = 'memory';

  private readonly projects = new Map<string, AuthorityStateMachine>();

  private readonly now: () => number;

  private offline = false;

  private failNextCommit = 0;

  constructor(options: InMemoryAuthorityOptions = {}) {
    this.now = options.now ?? (() => Date.now());
  }

  seed(seed: AuthoritySeed): void {
    this.projects.set(seed.projectId, createAuthorityState(seed, this.now()));
  }

  setOffline(offline: boolean): void {
    this.offline = offline;
  }

  /** Fail the next N commits as if the cloud were unreachable. */
  failCommits(count: number): void {
    this.failNextCommit = count;
  }

  private machine(projectId: string): AuthorityStateMachine {
    if (this.offline) {
      throw new AuthorityError('AUTHORITY_UNAVAILABLE', 'Cloud authority is unreachable');
    }

    const machine = this.projects.get(projectId);

    if (!machine) {
      throw new AuthorityError('AUTHORITY_PROJECT_UNKNOWN', `Unknown project: ${projectId}`, {
        projectId,
      });
    }

    return machine;
  }

  async fetchSnapshot(projectId: string): Promise<AuthoritySnapshot> {
    return this.machine(projectId).snapshot();
  }

  async commit(request: AuthorityCommitRequest): Promise<AuthorityCommitResult> {
    const machine = this.machine(request.projectId);

    if (this.failNextCommit > 0) {
      this.failNextCommit -= 1;
      throw new AuthorityError('AUTHORITY_UNAVAILABLE', 'Cloud authority write failed');
    }

    return machine.commit(request);
  }

  async acquireLease(request: AcquireLeaseRequest): Promise<LeaseGrant> {
    return this.machine(request.projectId).acquireLease(request);
  }

  async heartbeat(request: HeartbeatLeaseRequest): Promise<LeaseGrant> {
    return this.machine(request.projectId).heartbeat(request);
  }

  async release(request: ReleaseLeaseRequest): Promise<LeaseGrant> {
    const machine = this.machine(request.projectId);
    const lease = machine.release(request);

    return { lease, revision: machine.revision() };
  }
}

export interface HttpCloudAuthorityOptions {
  baseUrl: string;
  token: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

interface ErrorBody {
  error?: { code?: string; message?: string };
}

const ERROR_CODES = new Set<string>([
  'AUTHORITY_PROJECT_MISMATCH',
  'AUTHORITY_PROJECT_UNKNOWN',
  'AUTHORITY_REVISION_CONFLICT',
  'AUTHORITY_EMPTY_COMMIT',
  'AUTHORITY_INVALID_OPERATION',
  'AUTHORITY_TASK_UNKNOWN',
  'AUTHORITY_TASK_EXISTS',
  'AUTHORITY_LEASE_REQUIRED',
  'AUTHORITY_LEASE_HELD',
  'AUTHORITY_LEASE_FENCED',
  'AUTHORITY_LEASE_EXPIRED',
  'AUTHORITY_COMPLETION_REQUIRES_PASSING_TEST',
  'AUTHORITY_IDEMPOTENCY_MISMATCH',
]);

function mappedError(
  code: string | undefined,
  message: string | undefined,
  status: number
): AuthorityError {
  if (code && ERROR_CODES.has(code)) {
    return new AuthorityError(code as never, message ?? code);
  }

  if (status === 401 || status === 403) {
    return new AuthorityError(
      'AUTHORITY_AUTH_FAILED',
      message ?? 'Cloud authority rejected credentials'
    );
  }

  if (status === 404) {
    return new AuthorityError('AUTHORITY_PROJECT_UNKNOWN', message ?? 'Project not found');
  }

  if (status === 408 || status === 504) {
    return new AuthorityError('AUTHORITY_TIMEOUT', message ?? 'Cloud authority timed out');
  }

  if (status >= 500) {
    return new AuthorityError('AUTHORITY_UNAVAILABLE', message ?? 'Cloud authority unavailable');
  }

  return new AuthorityError(
    'AUTHORITY_INVALID_RESPONSE',
    message ?? `Unexpected authority status ${status}`
  );
}

export class HttpCloudAuthority implements CloudAuthority {
  readonly kind = 'cloud';

  private readonly baseUrl: string;

  private readonly token: string;

  private readonly timeoutMs: number;

  private readonly fetchImpl: typeof fetch;

  constructor(options: HttpCloudAuthorityOptions) {
    if (!/^https?:\/\//u.test(options.baseUrl)) {
      throw new AuthorityError(
        'AUTHORITY_INVALID_OPERATION',
        'Cloud authority baseUrl must be http(s)'
      );
    }

    if (!options.token.trim()) {
      throw new AuthorityError('AUTHORITY_AUTH_FAILED', 'Cloud authority token is required');
    }

    this.baseUrl = options.baseUrl.replace(/\/+$/u, '');
    this.token = options.token;
    this.timeoutMs = options.timeoutMs ?? 5_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private async call<T>(
    path: string,
    init: { method: 'GET' | 'POST'; body?: unknown }
  ): Promise<T> {
    let response: Response;

    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method: init.method,
        headers: {
          authorization: `Bearer ${this.token}`,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      const name = error instanceof Error ? error.name : '';

      throw new AuthorityError(
        name === 'TimeoutError' || name === 'AbortError'
          ? 'AUTHORITY_TIMEOUT'
          : 'AUTHORITY_UNAVAILABLE',
        'Cloud authority request failed'
      );
    }

    if (!response.ok) {
      let body: ErrorBody = {};

      try {
        body = (await response.json()) as ErrorBody;
      } catch {
        body = {};
      }

      throw mappedError(body.error?.code, body.error?.message, response.status);
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new AuthorityError(
        'AUTHORITY_INVALID_RESPONSE',
        'Cloud authority returned invalid JSON'
      );
    }
  }

  async fetchSnapshot(projectId: string): Promise<AuthoritySnapshot> {
    return this.call<AuthoritySnapshot>(`/v1/projects/${encodeURIComponent(projectId)}/state`, {
      method: 'GET',
    });
  }

  async commit(request: AuthorityCommitRequest): Promise<AuthorityCommitResult> {
    return this.call<AuthorityCommitResult>(
      `/v1/projects/${encodeURIComponent(request.projectId)}/commit`,
      { method: 'POST', body: request }
    );
  }

  async acquireLease(request: AcquireLeaseRequest): Promise<LeaseGrant> {
    return this.call<LeaseGrant>(
      `/v1/projects/${encodeURIComponent(request.projectId)}/leases/acquire`,
      { method: 'POST', body: request }
    );
  }

  async heartbeat(request: HeartbeatLeaseRequest): Promise<LeaseGrant> {
    return this.call<LeaseGrant>(
      `/v1/projects/${encodeURIComponent(request.projectId)}/leases/heartbeat`,
      { method: 'POST', body: request }
    );
  }

  async release(request: ReleaseLeaseRequest): Promise<LeaseGrant> {
    return this.call<LeaseGrant>(
      `/v1/projects/${encodeURIComponent(request.projectId)}/leases/release`,
      { method: 'POST', body: request }
    );
  }
}
