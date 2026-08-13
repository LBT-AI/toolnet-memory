import { createServer } from 'node:http';

import { describe, expect, it } from 'vitest';

import { ToolNetApiClient } from '../../packages/sdk/remote-client.js';

describe('ToolNetApiClient Memory Hub', () => {
  it('sends principal and calls hub routes', async () => {
    const seen: Array<{
      path: string;
      principal?: string;
    }> = [];

    const server = createServer((req, res) => {
      seen.push({
        path: req.url ?? '',
        principal: req.headers['x-toolnet-principal'] as string | undefined,
      });

      res.setHeader('content-type', 'application/json');

      if (req.url === '/v1/hub') {
        res.end(
          JSON.stringify({
            schema: 'toolnet.api-hub-summary.v1',
            hub: {
              schema: 'toolnet.memory-hub.v1',
              project: {
                id: 'p',
                name: 'p',
                remote: 'p',
              },
              teams: 0,
              agents: 0,
              aclGrants: 1,
              loadouts: 0,
              updatedAt: '2026-08-14T00:00:00.000Z',
            },
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
        throw new Error('No SDK test address');
      }

      const client = new ToolNetApiClient({
        baseUrl: `http://127.0.0.1:${address.port}`,
        principal: 'owner',
      });

      const result = await client.hub();

      expect(result.hub.project.id).toBe('p');

      expect(seen).toEqual([
        {
          path: '/v1/hub',
          principal: 'owner',
        },
      ]);
    } finally {
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
  });
});
