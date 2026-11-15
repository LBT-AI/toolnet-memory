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
} from '../src/v0.7/authority-state.js';

interface StoredSnapshot {
  snapshot: AuthoritySnapshot;
  updatedAt: string;
}

export class Authority {
  private stateMachine: AuthorityStateMachine;
  private readonly env: { MEMORY_EVENTS: R2Bucket };
  private readonly projectId: string;

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: { MEMORY_EVENTS: R2Bucket }
  ) {
    this.env = env;
    this.projectId = state.id.toString();
    this.stateMachine = this.loadStateMachine();
  }

  private loadStateMachine(): AuthorityStateMachine {
    const stored = this.state.storage.get<StoredSnapshot>('snapshot');
    if (stored) {
      return restoreAuthorityState(stored.snapshot);
    }

    const seed: AuthoritySeed = {
      projectId: this.projectId,
      projectName: this.projectId,
    };
    return createAuthorityState(seed, Date.now());
  }

  private async persist(): Promise<void> {
    const snapshot = this.stateMachine.snapshot();
    await this.state.storage.put('snapshot', { snapshot, updatedAt: new Date().toISOString() });
  }

  private async appendEventToR2(request: AuthorityCommitRequest, result: AuthorityCommitResult): Promise<void> {
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
      if (path === '/state' && request.method === 'GET') {
        const snapshot = this.stateMachine.snapshot();
        return Response.json(snapshot);
      }

      if (path === '/commit' && request.method === 'POST') {
        const body = await request.json() as AuthorityCommitRequest;
        const result = this.stateMachine.commit(body);
        await this.persist();
        await this.appendEventToR2(body, result);
        return Response.json(result);
      }

      if (path === '/leases/acquire' && request.method === 'POST') {
        const body = await request.json() as AcquireLeaseRequest;
        const grant = this.stateMachine.acquireLease(body);
        await this.persist();
        return Response.json(grant);
      }

      if (path === '/leases/heartbeat' && request.method === 'POST') {
        const body = await request.json() as HeartbeatLeaseRequest;
        const grant = this.stateMachine.heartbeat(body);
        await this.persist();
        return Response.json(grant);
      }

      if (path === '/leases/release' && request.method === 'POST') {
        const body = await request.json() as ReleaseLeaseRequest;
        const lease = this.stateMachine.release(body);
        await this.persist();
        return Response.json({ lease, revision: this.stateMachine.revision() });
      }

      return Response.json({ error: { code: 'AUTHORITY_INVALID_OPERATION', message: 'Not found' } }, 404);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal error';
      const code = error instanceof Error && 'code' in error ? (error as { code: string }).code : 'AUTHORITY_UNAVAILABLE';
      return Response.json({ error: { code, message } }, 500);
    }
  }
}