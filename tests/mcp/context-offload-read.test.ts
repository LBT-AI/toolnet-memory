import { mkdtempSync, rmSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { offloadSessionEvents } from '../../src/memory/context-offload.js';

import { contextOffloadRead } from '../../src/mcp/tools/context-offload-read.js';

import type { NormalizedSessionEvent } from '../../src/session/types.js';

describe('MCP context_offload_read', () => {
  test('reads only explicitly requested external asset', async () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-t2-mcp-'));

    try {
      const event: NormalizedSessionEvent = {
        version: 1,
        id: 'event-1',
        sequence: 1,
        projectId: 'mcp-t2',
        agent: 'codex',
        nativeSessionId: 'codex-t2',
        type: 'tool_result',
        timestamp: '2026-08-14T00:00:00.000Z',
        sourceEventId: 'tool-1',

        data: {
          stdout: 'focused external tool output',
        },

        provenance: {
          source: 'test',
        },
      };

      const stored = offloadSessionEvents(root, [event]);

      const ctx = {
        project: {
          id: 'mcp-t2',
          name: 'demo',
          rootPath: root,
          remote: null,
        },
      } as any;

      const result = await contextOffloadRead(ctx, {
        assetId: stored.assetIds[0]!.slice(0, 12),
        maxChars: 2000,
      });

      expect(result.kind).toBe('tool_result');
      expect(result.content).toContain('focused external tool output');

      await expect(
        contextOffloadRead(ctx, {
          assetId: 'deadbeef',
        })
      ).rejects.toThrow(/not found/i);
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
