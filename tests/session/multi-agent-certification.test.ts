import { mkdtempSync, readFileSync, rmSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

import { SessionCore } from '../../src/session/core.js';

import { readLatestDurableCheckpoint } from '../../src/session/durable-checkpoint.js';

import { retrieveMemoryContext } from '../../src/work-continuity/memory-retrieval.js';

class OfflineStorage implements StorageProvider {
  readonly name = 'offline';

  async put(): Promise<void> {
    throw new Error('remote unavailable');
  }

  async get(): Promise<Uint8Array | null> {
    return null;
  }

  async getText(): Promise<string | null> {
    return null;
  }

  async exists(): Promise<boolean> {
    return false;
  }

  async delete(): Promise<void> {}

  async list(): Promise<StorageObject[]> {
    return [];
  }
}

const roots: string[] = [];

function createProject(id: string): ProjectManifest {
  const root = mkdtempSync(join(tmpdir(), `toolnet-${id}-`));

  roots.push(root);

  const now = new Date().toISOString();

  return {
    id,
    name: id,
    rootPath: root,
    createdAt: now,
    updatedAt: now,
    graphVersion: 0,
    memoryVersion: 0,
  };
}

afterEach(() => {
  while (roots.length) {
    rmSync(roots.pop()!, {
      recursive: true,
      force: true,
    });
  }
});

describe('Multi-agent continuity certification', () => {
  it('continues one project across four agents without idle', () => {
    const project = createProject('multi-agent-project');

    const storage = new OfflineStorage();

    const agents = ['opencode', 'codex', 'agy', 'claude'] as const;

    const files = [
      'src/auth/opencode.ts',
      'src/auth/codex.ts',
      'src/auth/agy.ts',
      'src/auth/claude.ts',
    ];

    for (const [index, agent] of agents.entries()) {
      const core = new SessionCore({
        project,
        storage,
        agent,
        nativeSessionId: `${agent}-${index}`,
        eventContext: {
          source: agent,
          cwd: project.rootPath,
        },
      });

      if (index === 0) {
        core.recordMany([
          {
            type: 'user_prompt',

            role: 'user',

            data: {
              content: 'Hoàn thiện OAuth callback.',
            },
          },

          {
            type: 'assistant_message',

            data: {
              content: [
                'TODO 1: Hoàn thiện OAuth callback',
                'TODO 1 đang làm',
                'Đang sửa OAuth callback',
                'Bước tiếp theo: chạy auth tests',
              ].join('\n'),
            },
          },
        ]);
      } else {
        core.record({
          type: 'decision',

          data: {
            content: `Quyết định từ ${agent}: tiếp tục OAuth callback.`,
          },
        });
      }

      core.record({
        type: 'file_edit',

        data: {
          filePath: files[index],
        },
      });

      /*
       * Intentionally:
       * no idle()
       * no flush()
       */
      const checkpoint = readLatestDurableCheckpoint(project);

      expect(checkpoint?.source.agent).toBe(agent);

      const handoff = JSON.parse(
        readFileSync(join(project.rootPath, '.toolnet', 'work', 'handoff-latest.json'), 'utf8')
      );

      expect(handoff.continuity.source.agent).toBe(agent);
    }

    const result = retrieveMemoryContext(project, 'Tiếp tục task trước, file hiện tại là gì?');

    const text = result.facts.map((fact) => fact.value).join('\n');

    expect(text).toContain('OAuth callback');

    expect(text).toContain('src/auth/claude.ts');
  });

  it('does not mix different projects', () => {
    const p1 = createProject('project-one');

    const p2 = createProject('project-two');

    const storage = new OfflineStorage();

    new SessionCore({
      project: p1,
      storage,
      agent: 'opencode',
      nativeSessionId: 'one',
    }).record({
      type: 'user_prompt',
      role: 'user',
      data: {
        content: 'TODO: PROJECT_ONE_ONLY OAuth',
      },
    });

    new SessionCore({
      project: p2,
      storage,
      agent: 'codex',
      nativeSessionId: 'two',
    }).record({
      type: 'user_prompt',
      role: 'user',
      data: {
        content: 'TODO: PROJECT_TWO_ONLY Payment',
      },
    });

    const one = retrieveMemoryContext(p1, 'Tóm tắt task')
      .facts.map((fact) => fact.value)
      .join('\n');

    expect(one).toContain('PROJECT_ONE_ONLY');

    expect(one).not.toContain('PROJECT_TWO_ONLY');
  });
});
