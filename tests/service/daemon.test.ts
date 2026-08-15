import { mkdtempSync, rmSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { startToolNetService } from '../../src/service/daemon.js';

import {
  hydrateFromService,
  invalidateServiceProject,
  pingToolNetService,
  tryHydrateFromService,
} from '../../src/service/client.js';

import type { ToolNetServiceProject } from '../../src/service/protocol.js';

describe('ToolNet daemon', () => {
  it('shares cached project memory and graph over Unix socket', async () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-service-'));

    const socketPath = join(root, 'service.sock');

    const project: ToolNetServiceProject = {
      id: 'project-1',
      name: 'demo',
      remote: 'demo',
      rootPath: '/tmp/demo',
    };

    let loads = 0;

    const handle = await startToolNetService({
      socketPath,
      cacheTtlMs: 60_000,

      loader: async () => {
        loads += 1;

        return {
          memory: [],

          graph: {
            symbols: [],
            edges: [],
          },
        };
      },
    });

    try {
      const first = await hydrateFromService(project, {
        socketPath,
        timeoutMs: 1_000,
      });

      const second = await hydrateFromService(project, {
        socketPath,
        timeoutMs: 1_000,
      });

      expect(first.cacheHit).toBe(false);
      expect(second.cacheHit).toBe(true);
      expect(loads).toBe(1);

      const ping = await pingToolNetService({
        socketPath,
      });

      expect(ping.stats.cacheHits).toBe(1);
      expect(ping.stats.cacheEntries).toBe(1);

      expect(
        await invalidateServiceProject(project, {
          socketPath,
        })
      ).toBe(true);

      const third = await hydrateFromService(project, {
        socketPath,
      });

      expect(third.cacheHit).toBe(false);
      expect(loads).toBe(2);
    } finally {
      await handle.close();

      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  it('returns null so MCP can use embedded fallback when daemon is absent', async () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-no-service-'));

    const project: ToolNetServiceProject = {
      id: 'project-2',
      name: 'fallback',
      rootPath: '/tmp/fallback',
    };

    try {
      const result = await tryHydrateFromService(project, {
        socketPath: join(root, 'missing.sock'),

        timeoutMs: 50,
      });

      expect(result).toBeNull();
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
