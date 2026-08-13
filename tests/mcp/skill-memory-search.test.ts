import { mkdtempSync, rmSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import { buildSkillMemoryAssets, persistSkillMemoryAssets } from '../../src/memory/skill-memory.js';

import type { MemoryPipelineState } from '../../src/memory/pipeline-v2.js';

import type { MCPContext } from '../../src/mcp/context.js';

import { skillMemorySearch } from '../../src/mcp/tools/skill-memory-search.js';

import type { NormalizedSessionEvent, SessionIdentity } from '../../src/session/types.js';

describe('skill_memory_search MCP tool', () => {
  test('returns compact reusable SOP for similar successful project work', async () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-t3-mcp-'));

    try {
      const now = '2026-08-14T00:00:00.000Z';

      const project = {
        id: 't3-mcp-project',

        name: 'T3 MCP',

        rootPath: root,

        createdAt: now,

        updatedAt: now,

        graphVersion: 0,

        memoryVersion: 0,
      } as ProjectManifest;

      const identity = {
        projectId: project.id,

        projectName: project.name,

        projectRoot: root,

        agent: 'codex',

        nativeSessionId: 'codex-skill',

        sessionKey: 'codex:codex-skill',
      } as SessionIdentity;

      const events = [
        {
          version: 1,

          id: 'e1',

          sequence: 1,

          projectId: project.id,

          agent: 'codex',

          nativeSessionId: 'codex-skill',

          type: 'file_edit',

          timestamp: now,

          sourceEventId: 'native-e1',

          data: {
            path: 'src/cache/rebuild.ts',
          },

          provenance: {
            source: 'test',

            files: ['src/cache/rebuild.ts'],
          },
        },
        {
          version: 1,

          id: 'e2',

          sequence: 2,

          projectId: project.id,

          agent: 'codex',

          nativeSessionId: 'codex-skill',

          type: 'test',

          timestamp: '2026-08-14T00:00:01.000Z',

          sourceEventId: 'native-e2',

          data: {
            name: 'cache rebuild tests',

            passed: true,
          },

          provenance: {
            source: 'test',
          },
        },
      ] as NormalizedSessionEvent[];

      const pipelineState: MemoryPipelineState = {
        task: 'Rebuild cache safely',

        decisions: [],

        files: ['src/cache/rebuild.ts'],

        todos: [],

        completed: ['Rebuild cache safely'],

        blockers: [],

        nextActions: [],

        architecture: [],
      };

      const assets = buildSkillMemoryAssets(identity, events, pipelineState);

      persistSkillMemoryAssets(project, assets);

      const ctx = {
        project,
      } as unknown as MCPContext;

      const result = await skillMemorySearch(ctx, {
        query: 'cache rebuild',
      });

      expect(result.schema).toBe('toolnet.skill-memory-search.v1');

      expect(result.count).toBe(1);

      expect(result.matches[0]?.task).toBe('Rebuild cache safely');

      expect(result.matches[0]?.steps.join('\n')).toContain('src/cache/rebuild.ts');
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
