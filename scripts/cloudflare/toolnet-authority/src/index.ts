/**
 * ToolNet v0.7 cloud authority Worker (Cloudflare).
 *
 * One Durable Object per project owns the transaction state machine imported
 * from the repository. R2 keeps an append-only copy of every acknowledged
 * commit. Project seeds (name, initial tasks/rules/flows) are read from KV.
 *
 * This Worker is not deployed by the repository build; deployment requires the
 * operator's Cloudflare account, a KV namespace id and the authority token
 * secret. The transaction rules themselves are covered by
 * tests/v07/authority-state.test.ts.
 */

import {
  AuthorityError,
  createAuthorityState,
  restoreAuthorityState,
  type AcquireLeaseRequest,
  type AuthorityCommitRequest,
  type AuthoritySeed,
  type AuthoritySnapshot,
  type HeartbeatLeaseRequest,
  type ReleaseLeaseRequest,
  type AuthorityStateMachine,
} from '../../../../src/v0.7/authority-state';

interface Env {
  PROJECT_AUTHORITY: DurableObjectNamespace;
  AUTHORITY_EVENTS: R2Bucket;
  PROJECT_SEEDS: KVNamespace;
  TOOLNET_AUTHORITY_TOKEN: string;
}

const ROUTES = /^\/v1\/projects\/([^/]+)\/(state|commit|leases\/(?:acquire|heartbeat|release))$/u;

function jsonError(code: string, message: string, status: number): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function statusFor(code: string): number {
  switch (code) {
    case 'AUTHORITY_AUTH_FAILED':
      return 401;
    case 'AUTHORITY_PROJECT_UNKNOWN':
      return 404;
    case 'AUTHORITY_REVISION_CONFLICT':
    case 'AUTHORITY_IDEMPOTENCY_MISMATCH':
    case 'AUTHORITY_LEASE_HELD':
    case 'AUTHORITY_LEASE_FENCED':
    case 'AUTHORITY_LEASE_EXPIRED':
    case 'AUTHORITY_LEASE_REQUIRED':
      return 409;
    case 'AUTHORITY_INVALID_OPERATION':
    case 'AUTHORITY_EMPTY_COMMIT':
    case 'AUTHORITY_PROJECT_MISMATCH':
    case 'AUTHORITY_TASK_UNKNOWN':
    case 'AUTHORITY_TASK_EXISTS':
    case 'AUTHORITY_COMPLETION_REQUIRES_PASSING_TEST':
      return 400;
    default:
      return 500;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const authorization = request.headers.get('authorization') ?? '';

    if (!env.TOOLNET_AUTHORITY_TOKEN || authorization !== `Bearer ${env.TOOLNET_AUTHORITY_TOKEN}`) {
      return jsonError('AUTHORITY_AUTH_FAILED', 'Invalid authority credentials', 401);
    }

    const url = new URL(request.url);
    const match = ROUTES.exec(url.pathname);

    if (!match) {
      return jsonError('AUTHORITY_INVALID_OPERATION', 'Unknown authority route', 404);
    }

    const projectId = decodeURIComponent(match[1] ?? '');
    const route = match[2] ?? '';

    if (!projectId) {
      return jsonError('AUTHORITY_INVALID_OPERATION', 'Project id is required', 400);
    }

    const id = env.PROJECT_AUTHORITY.idFromName(projectId);
    const stub = env.PROJECT_AUTHORITY.get(id);

    const target = new URL(`https://authority.internal/project`);
    target.searchParams.set('projectId', projectId);
    target.searchParams.set('route', route);

    return stub.fetch(
      new Request(target.toString(), {
        method: request.method,
        headers: request.headers,
        ...(request.method === 'POST' ? { body: request.body } : {}),
      })
    );
  },
};

export class ProjectAuthority implements DurableObject {
  private readonly state: DurableObjectState;

  private readonly env: Env;

  private machine?: AuthorityStateMachine;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  private async load(projectId: string): Promise<AuthorityStateMachine> {
    if (this.machine) {
      return this.machine;
    }

    const stored = await this.state.storage.get<AuthoritySnapshot>('snapshot');

    if (stored) {
      this.machine = restoreAuthorityState(stored);

      return this.machine;
    }

    const seed = (await this.env.PROJECT_SEEDS.get(
      `seed:${projectId}`,
      'json'
    )) as AuthoritySeed | null;

    if (!seed || seed.projectId !== projectId) {
      throw new AuthorityError('AUTHORITY_PROJECT_UNKNOWN', `No seed for project ${projectId}`);
    }

    this.machine = createAuthorityState(seed, Date.now());

    return this.machine;
  }

  private async persist(projectId: string, request: unknown, result: unknown): Promise<void> {
    const machine = this.machine!;

    await this.state.storage.put('snapshot', machine.snapshot());

    const revision = String(machine.revision()).padStart(12, '0');

    await this.env.AUTHORITY_EVENTS.put(
      `events/${projectId}/${revision}.json`,
      JSON.stringify({ request, result }),
      {
        customMetadata: {
          projectId,
          revision,
        },
      }
    );
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId') ?? '';
    const route = url.searchParams.get('route') ?? '';

    try {
      const machine = await this.load(projectId);

      if (route === 'state') {
        return Response.json(machine.snapshot());
      }

      const body = (await request.json()) as unknown;

      if (route === 'commit') {
        const result = machine.commit(body as AuthorityCommitRequest);

        await this.persist(projectId, body, result);

        return Response.json(result);
      }

      if (route === 'leases/acquire') {
        const result = machine.acquireLease(body as AcquireLeaseRequest);

        await this.persist(projectId, body, result);

        return Response.json(result);
      }

      if (route === 'leases/heartbeat') {
        const result = machine.heartbeat(body as HeartbeatLeaseRequest);

        await this.persist(projectId, body, result);

        return Response.json(result);
      }

      if (route === 'leases/release') {
        const result = machine.release(body as ReleaseLeaseRequest);

        await this.persist(projectId, body, result);

        return Response.json(result);
      }

      return jsonError('AUTHORITY_INVALID_OPERATION', 'Unknown authority route', 404);
    } catch (error) {
      if (error instanceof AuthorityError) {
        return jsonError(error.code, error.message, statusFor(error.code));
      }

      return jsonError('AUTHORITY_UNAVAILABLE', 'Authority failure', 500);
    }
  }
}
