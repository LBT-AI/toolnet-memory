import { createServer } from 'node:http';

import { describe, expect, it } from 'vitest';

import { ToolNetApiClient } from '../../packages/sdk/remote-client.js';

describe('ToolNetApiClient Governance', () => {
  it('reads governance status', async () => {
    const server = createServer((req, res) => {
      expect(req.url).toBe('/v1/governance');

      expect(req.headers['x-toolnet-principal']).toBe('owner');

      res.setHeader('content-type', 'application/json');

      res.end(
        JSON.stringify({
          schema: 'toolnet.api-governance-summary.v1',
          governance: {
            schema: 'toolnet.knowledge-governance-summary.v1',
            projectId: 'test',
            pending: 0,
            approved: 0,
            rejected: 0,
            superseded: 0,
            criticalPending: 0,
            conflictPending: 0,
            auditEvents: 0,
            policy: {
              autoApproveThreshold: 0.86,
              criticalApproveThreshold: 0.94,
              staleAfterDays: 90,
            },
            updatedAt: '2026-08-14T00:00:00.000Z',
          },
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
        throw new Error('No test address');
      }

      const client = new ToolNetApiClient({
        baseUrl: `http://127.0.0.1:${address.port}`,
        principal: 'owner',
      });

      const result = await client.governance();

      expect(result.governance.pending).toBe(0);
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
