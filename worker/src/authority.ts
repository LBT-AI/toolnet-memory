import { DurableObject } from 'cloudflare:workers';

import {
  AuthorityStateMachine,
  type AuthoritySnapshot,
  type AuthorityCommitRequest,
  type AuthorityCommitResult,
  type AcquireLeaseRequest,
  type HeartbeatLeaseRequest,
  type ReleaseLeaseRequest,
  type LeaseGrant,
  type AuthoritySeed,
  createAuthorityState,
  restoreAuthorityState,
} from '../../src/v0.7/authority-state.js';

interface Env {
  MEMORY_EVENTS: R2Bucket;
}

interface StoredSnapshot {
  snapshot: AuthoritySnapshot;
  updatedAt: string;
}

export class Authority extends DurableObject<Env> {
  private stateMachine: AuthorityStateMachine | undefined;
  private readonly projectId: string;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.projectId = ctx.id.toString();
  }

  private async machine(): Promise<AuthorityStateMachine> {
    if (this.stateMachine) {
      return this.stateMachine;
    }

    const stored = await this.ctx.storage.get<StoredSnapshot>('snapshot');

    if (stored) {
      this.stateMachine = restoreAuthorityState(stored.snapshot);
      return this.stateMachine;
    }

    const seed: AuthoritySeed = {
      projectId: this.projectId,
      projectName: this.projectId,
    };

    this.stateMachine = createAuthorityState(seed, Date.now());
    return this.stateMachine;
  }

  private async persist(machine: AuthorityStateMachine): Promise<void> {
    const snapshot = machine.snapshot();
    await this.ctx.storage.put('snapshot', {
      snapshot,
      updatedAt: new Date().toISOString(),
    });
  }

  private async appendEventToR2(
    request: AuthorityCommitRequest,
    result: AuthorityCommitResult
  ): Promise<void> {
    const eventRecord = {
      projectId: request.projectId,
      agentId: request.agentId,
      revision: result.revision,
      sequence: result.sequence,
      operations: request.operations,
      idempotencyKey: request.idempotencyKey,
      acknowledgedAt: result.acknowledgedAt,
      checkpoint: result.checkpoint,
    };

    const key = `projects/${request.projectId}/events/${result.revision}-${result.sequence}-${request.idempotencyKey ?? Date.now()}.json`;
    await this.env.MEMORY_EVENTS.put(key, JSON.stringify(eventRecord, null, 2), {
      httpMetadata: { contentType: 'application/json' },
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      const machine = await this.machine();

      if (path === '/state' && request.method === 'GET') {
        return Response.json(machine.snapshot());
      }

      if (path === '/commit' && request.method === 'POST') {
        const body = (await request.json()) as AuthorityCommitRequest;
        const result = machine.commit(body);
        await this.persist(machine);
        await this.appendEventToR2(body, result);
        return Response.json(result);
      }

      if (path === '/leases/acquire' && request.method === 'POST') {
        const body = (await request.json()) as AcquireLeaseRequest;
        const grant = machine.acquireLease(body);
        await this.persist(machine);
        return Response.json(grant);
      }

      if (path === '/leases/heartbeat' && request.method === 'POST') {
        const body = (await request.json()) as HeartbeatLeaseRequest;
        const grant = machine.heartbeat(body);
        await this.persist(machine);
        return Response.json(grant);
      }

      if (path === '/leases/release' && request.method === 'POST') {
        const body = (await request.json()) as ReleaseLeaseRequest;
        const lease = machine.release(body);
        await this.persist(machine);
        return Response.json({ lease, revision: machine.revision() });
      }

      return Response.json(
        { error: { code: 'AUTHORITY_INVALID_OPERATION', message: 'Not found' } },
        { status: 404 }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal error';
      const code =
        error instanceof Error && 'code' in error
          ? (error as { code: string }).code
          : 'AUTHORITY_UNAVAILABLE';
      return Response.json({ error: { code, message } }, { status: 500 });
    }
  }
}
