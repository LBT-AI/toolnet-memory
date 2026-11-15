import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

import type { AddressInfo } from 'node:net';

import { afterEach, describe, expect, it } from 'vitest';

import type { AuthoritySnapshot } from '../../src/v0.7/authority-state.js';

import { AuthorityError } from '../../src/v0.7/authority-state.js';

import { HttpCloudAuthority } from '../../src/v0.7/cloud-authority.js';

const SNAPSHOT: AuthoritySnapshot = {
  projectId: 'project-a',
  projectName: 'Project A',
  revision: 3,
  sequence: 3,
  tasks: {},
  rules: [],
  flows: [],
  decisions: [],
  leases: {},
  checkpoint: {
    revision: 3,
    acknowledgedAt: '2026-11-13T00:00:00.000Z',
    sourceAgent: 'agy',
  },
  generatedAt: '2026-11-13T00:00:00.000Z',
};

const SERVERS: Server[] = [];

afterEach(async () => {
  while (SERVERS.length > 0) {
    const server = SERVERS.pop()!;

    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

async function start(
  handler: (request: IncomingMessage, response: ServerResponse) => void
): Promise<{ baseUrl: string; seen: Array<{ url?: string; authorization?: string }> }> {
  const seen: Array<{ url?: string; authorization?: string }> = [];

  const server = createServer((request, response) => {
    seen.push({ url: request.url, authorization: request.headers.authorization });
    handler(request, response);
  });

  SERVERS.push(server);

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));

  const address = server.address() as AddressInfo;

  return { baseUrl: `http://127.0.0.1:${address.port}`, seen };
}

describe('v0.7 HTTP cloud authority client', () => {
  it('reads a snapshot with a bearer token and no disk access', async () => {
    const { baseUrl, seen } = await start((_request, response) => {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify(SNAPSHOT));
    });

    const client = new HttpCloudAuthority({ baseUrl, token: 'secret-token' });
    const snapshot = await client.fetchSnapshot('project-a');

    expect(snapshot.revision).toBe(3);
    expect(seen[0]?.url).toBe('/v1/projects/project-a/state');
    expect(seen[0]?.authorization).toBe('Bearer secret-token');
  });

  it('maps cloud conflicts and auth failures to typed errors without leaking the token', async () => {
    const { baseUrl } = await start((request, response) => {
      const status = request.headers.authorization === 'Bearer bad' ? 401 : 409;

      response.writeHead(status, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          error: {
            code: status === 409 ? 'AUTHORITY_REVISION_CONFLICT' : 'AUTHORITY_AUTH_FAILED',
            message: 'rejected',
          },
        })
      );
    });

    const goodToken = new HttpCloudAuthority({ baseUrl, token: 'secret-token' });

    await expect(
      goodToken.commit({
        projectId: 'project-a',
        agentId: 'agy',
        operations: [{ type: 'decision.add', text: 'x' }],
        expectedRevision: 1,
        now: 1,
      })
    ).rejects.toMatchObject({ code: 'AUTHORITY_REVISION_CONFLICT' });

    const badToken = new HttpCloudAuthority({ baseUrl, token: 'bad' });

    const error = await badToken.fetchSnapshot('project-a').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AuthorityError);
    expect((error as AuthorityError).code).toBe('AUTHORITY_AUTH_FAILED');
    expect((error as Error).message).not.toContain('secret-token');
    expect((error as Error).message).not.toContain('bad');
  });

  it('reports an unreachable cloud as unavailable, never as a local fallback', async () => {
    const client = new HttpCloudAuthority({
      baseUrl: 'http://127.0.0.1:1',
      token: 'secret-token',
      timeoutMs: 250,
    });

    const error = await client.fetchSnapshot('project-a').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AuthorityError);
    expect((error as AuthorityError).code).toBe('AUTHORITY_UNAVAILABLE');
    expect((error as AuthorityError).retryable).toBe(true);
  });

  it('rejects a non-http base url and a missing token at construction time', () => {
    expect(() => new HttpCloudAuthority({ baseUrl: 'file:///tmp', token: 'x' })).toThrowError(
      AuthorityError
    );

    expect(
      () => new HttpCloudAuthority({ baseUrl: 'https://example.com', token: '  ' })
    ).toThrowError(/token is required/);
  });
});
