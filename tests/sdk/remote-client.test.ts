import { createServer } from 'node:http';

import { describe, expect, it } from 'vitest';

import { ToolNetApiClient } from '../../packages/sdk/remote-client.js';

async function close(server: ReturnType<typeof createServer>): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

describe('ToolNetApiClient', () => {
  it('sends bearer auth and supports GET/POST calls', async () => {
    const seen: Array<{
      path: string;
      authorization?: string;
      method?: string;
    }> = [];

    const server = createServer((req, res) => {
      seen.push({
        path: req.url ?? '',
        authorization: req.headers.authorization,
        method: req.method,
      });

      res.setHeader('content-type', 'application/json');

      if (req.url === '/v1/health') {
        res.end(
          JSON.stringify({
            ok: true,
            service: 'toolnet-memory',
            schema: 'toolnet.api-health.v1',
            project: {
              id: 'sdk-test',
              name: 'sdk-test',
              remote: 'sdk-test',
            },
          })
        );

        return;
      }

      if (req.url === '/v1/memory/search') {
        res.end(
          JSON.stringify({
            schema: 'toolnet.api-memory-search.v1',
            results: [],
          })
        );

        return;
      }

      res.statusCode = 404;

      res.end(
        JSON.stringify({
          error: 'Not found',
        })
      );
    });

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);

      server.listen(0, '127.0.0.1', resolve);
    });

    try {
      const address = server.address();

      if (!address || typeof address === 'string') {
        throw new Error('SDK test server has no TCP address');
      }

      const client = new ToolNetApiClient({
        baseUrl: `http://127.0.0.1:${address.port}/`,
        token: 'sdk-secret',
      });

      const health = await client.health();

      expect(health.ok).toBe(true);

      const search = await client.memorySearch({
        query: 'test',
        limit: 5,
      });

      expect(search.results).toEqual([]);

      expect(seen).toEqual([
        {
          path: '/v1/health',
          authorization: 'Bearer sdk-secret',
          method: 'GET',
        },
        {
          path: '/v1/memory/search',
          authorization: 'Bearer sdk-secret',
          method: 'POST',
        },
      ]);
    } finally {
      await close(server);
    }
  });

  it('surfaces API error messages', async () => {
    const server = createServer((_req, res) => {
      res.statusCode = 401;
      res.setHeader('content-type', 'application/json');
      res.end(
        JSON.stringify({
          error: 'Unauthorized',
        })
      );
    });

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });

    try {
      const address = server.address();

      if (!address || typeof address === 'string') {
        throw new Error('SDK test server has no TCP address');
      }

      const client = new ToolNetApiClient({
        baseUrl: `http://127.0.0.1:${address.port}`,
      });

      await expect(client.health()).rejects.toThrow('Unauthorized');
    } finally {
      await close(server);
    }
  });
});
