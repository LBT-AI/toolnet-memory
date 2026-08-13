import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import type { MemoryPipelineState } from '../../src/memory/pipeline-v2.js';

import {
  buildSkillMemoryAssets,
  listSkillMemoryAssets,
  persistSkillMemoryAssets,
  searchSkillMemory,
} from '../../src/memory/skill-memory.js';

import type {
  NormalizedSessionEvent,
  SessionIdentity,
  SessionEventType,
} from '../../src/session/types.js';

function project(rootPath: string): ProjectManifest {
  const now = '2026-08-14T00:00:00.000Z';

  return {
    id: 't3-project',

    name: 'T3 Project',

    rootPath,

    createdAt: now,

    updatedAt: now,

    graphVersion: 0,

    memoryVersion: 0,
  } as ProjectManifest;
}

function identity(rootPath: string): SessionIdentity {
  return {
    projectId: 't3-project',

    projectName: 'T3 Project',

    projectRoot: rootPath,

    agent: 'opencode',

    nativeSessionId: 'skill-session-1',

    sessionKey: 'opencode:skill-session-1',

    remotePrefix: 'projects/t3-project/sessions/opencode/skill-session-1',

    localDirectory: join(rootPath, '.toolnet', 'sessions', 'skill-session-1'),
  } as SessionIdentity;
}

function event(
  sequence: number,
  type: SessionEventType,
  data: Record<string, unknown>,
  files: string[] = []
): NormalizedSessionEvent {
  return {
    version: 1,

    id: `event-${sequence}`,

    sequence,

    projectId: 't3-project',

    agent: 'opencode',

    nativeSessionId: 'skill-session-1',

    type,

    timestamp: `2026-08-14T00:00:${String(sequence).padStart(2, '0')}.000Z`,

    sourceEventId: `native-${sequence}`,

    data,

    provenance: {
      source: 'test',

      files,
    },
  } as NormalizedSessionEvent;
}

function state(): MemoryPipelineState {
  return {
    task: 'Fix login token refresh',

    decisions: ['Keep refresh logic deterministic'],

    files: ['src/auth/refresh.ts'],

    todos: [],

    completed: ['Fix login token refresh'],

    blockers: [],

    nextActions: [],

    architecture: [],
  };
}

describe('Skill Memory', () => {
  test('promotes successful task into immutable reusable SOP without raw transcript', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-t3-'));

    try {
      const events = [
        event(1, 'user_prompt', {
          text: 'RAW PRIVATE TRANSCRIPT sk-super-secret-value',
        }),
        event(
          2,
          'file_edit',
          {
            path: 'src/auth/refresh.ts',
          },
          ['src/auth/refresh.ts']
        ),
        event(3, 'command', {
          command: 'npm test',
          exitCode: 0,
        }),
        event(4, 'test', {
          name: 'auth refresh tests',
          passed: true,
        }),
        event(5, 'commit', {
          message: 'fix auth refresh',
        }),
      ];

      const assets = buildSkillMemoryAssets(identity(root), events, state());

      expect(assets).toHaveLength(1);

      const asset = assets[0];

      expect(asset?.task).toBe('Fix login token refresh');

      expect(asset?.steps.join('\n')).toContain('Update src/auth/refresh.ts');

      expect(asset?.steps.join('\n')).toContain('Run: npm test');

      expect(asset?.steps.join('\n')).toContain('Verify: auth refresh tests');

      const serialized = JSON.stringify(asset);

      expect(serialized).not.toContain('RAW PRIVATE TRANSCRIPT');

      expect(serialized).not.toContain('super-secret-value');

      const first = persistSkillMemoryAssets(project(root), assets);

      expect(first.written).toBe(1);
      expect(first.deduped).toBe(0);

      const second = persistSkillMemoryAssets(project(root), assets);

      expect(second.written).toBe(0);
      expect(second.deduped).toBe(1);

      const listed = listSkillMemoryAssets(project(root));

      expect(listed).toHaveLength(1);

      const matches = searchSkillMemory(project(root), 'login refresh', 5);

      expect(matches).toHaveLength(1);
      expect(matches[0]?.task).toBe('Fix login token refresh');

      const directory = join(root, '.toolnet', 'memory', 'skills');

      expect(statSync(directory).mode & 0o777).toBe(0o700);

      const file = first.files[0];

      expect(file).toBeDefined();

      if (!file) {
        throw new Error('Expected persisted skill file');
      }

      expect(statSync(file).mode & 0o777).toBe(0o600);

      expect(readFileSync(file, 'utf8')).toContain('"schema": "toolnet.skill-memory.v1"');
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test('does not create a skill from unfinished work without success evidence', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-t3-'));

    try {
      const unfinished: MemoryPipelineState = {
        ...state(),

        completed: [],

        task: 'Investigate unknown failure',

        nextActions: ['Continue debugging'],
      };

      const assets = buildSkillMemoryAssets(
        identity(root),
        [
          event(1, 'file_edit', {
            path: 'src/debug.ts',
          }),
          event(2, 'test', {
            name: 'debug test',
            passed: false,
          }),
        ],
        unfinished
      );

      expect(assets).toEqual([]);
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });

  test('redacts credentials from reusable command steps', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-t3-'));

    try {
      const assets = buildSkillMemoryAssets(
        identity(root),
        [
          event(1, 'command', {
            command: 'curl -H "Authorization: Bearer abcdef123456789" https://example.test',
            exitCode: 0,
          }),
          event(2, 'test', {
            name: 'API verification',
            passed: true,
          }),
        ],
        {
          ...state(),

          completed: [],
        }
      );

      expect(assets).toHaveLength(1);

      const text = JSON.stringify(assets);

      expect(text).toContain('Bearer [REDACTED]');
      expect(text).not.toContain('abcdef123456789');
    } finally {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    }
  });
});
