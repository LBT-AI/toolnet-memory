import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import {
  buildCompactContextOffloadGraph,
  offloadSessionEvents,
  readContextOffloadAsset,
} from '../../src/memory/context-offload.js';

import type { NormalizedSessionEvent } from '../../src/session/types.js';

import { buildFastProjectContext } from '../../src/work-continuity/fast-context.js';

function event(
  sequence: number,
  type: NormalizedSessionEvent['type'],
  data: Record<string, unknown>
): NormalizedSessionEvent {
  return {
    version: 1,
    id: `event-${sequence}`,
    sequence,
    projectId: 't2-project',
    agent: 'opencode',
    nativeSessionId: 't2-session',
    type,
    timestamp: `2026-08-14T00:00:0${sequence}.000Z`,
    sourceEventId: `native-${sequence}`,
    data,
    provenance: {
      source: 'test',
      files: [`src/file-${sequence}.ts`],
    },
  };
}

describe('T2 Context Offload', () => {
  test('keeps tool/file payload outside prompt context and reads on demand', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-t2-'));

    try {
      mkdirSync(join(root, '.toolnet'), {
        recursive: true,
      });

      writeFileSync(
        join(root, '.toolnet', 'project.json'),
        JSON.stringify({
          id: 't2-project',
          name: 'demo',
        })
      );

      const hugePayload = `TOOL_OUTPUT_${'x'.repeat(4000)}`;

      const events = [
        event(1, 'tool_result', {
          result: hugePayload,
        }),

        event(2, 'file_read', {
          content: 'large file body',
        }),

        event(3, 'command', {
          stdout: 'command output',
        }),

        event(4, 'assistant_message', {
          text: 'conversation must not become an offload asset',
        }),
      ];

      const first = offloadSessionEvents(root, events);

      expect(first.eligible).toBe(3);
      expect(first.written).toBe(3);
      expect(first.assetIds).toHaveLength(3);

      const graph = buildCompactContextOffloadGraph(root, {
        maxAssets: 6,
        maxChars: 900,
      });

      expect(graph).toContain('[TOOLNET CONTEXT OFFLOAD GRAPH]');
      expect(graph).toContain('--offloads-->');
      expect(graph).toContain('context_offload_read');
      expect(graph).not.toContain(hugePayload);
      expect(graph.length).toBeLessThanOrEqual(900);

      const asset = readContextOffloadAsset(root, first.assetIds[0]!.slice(0, 12), 10_000);

      expect(asset.kind).toBe('tool_result');
      expect(asset.content).toContain('TOOL_OUTPUT_');

      const second = offloadSessionEvents(root, events);

      expect(second.written).toBe(0);
      expect(second.deduped).toBe(3);

      const fast = buildFastProjectContext({
        projectPath: root,
      });

      expect(fast).toContain('[TOOLNET CONTEXT OFFLOAD GRAPH]');
      expect(fast).not.toContain(hugePayload);
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
