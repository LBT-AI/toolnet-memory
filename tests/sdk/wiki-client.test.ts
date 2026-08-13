import { createServer } from 'node:http';

import { describe, expect, it } from 'vitest';

import { ToolNetApiClient } from '../../packages/sdk/remote-client.js';

describe('ToolNetApiClient Wiki', () => {
  it('calls Wiki search with principal', async () => {
    const server = createServer((req, res) => {
      expect(req.headers['x-toolnet-principal']).toBe('owner');

      expect(req.url).toBe('/v1/wiki/search?q=architecture&limit=5');

      res.setHeader('content-type', 'application/json');

      res.end(
        JSON.stringify({
          schema: 'toolnet.api-wiki-search.v1',
          query: 'architecture',
          results: [],
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

      const result = await client.wikiSearch('architecture', 5);

      expect(result.results).toEqual([]);
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
