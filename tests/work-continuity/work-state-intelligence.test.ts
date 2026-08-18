import { mkdtempSync, readFileSync, rmSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

import { SessionCore } from '../../src/session/core.js';

class NoRemoteStorage implements StorageProvider {
  readonly name = 'no-remote';

  async put(): Promise<void> {
    throw new Error('remote not expected');
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

function createProject(): ProjectManifest {
  const root = mkdtempSync(join(tmpdir(), 'toolnet-work-intelligence-'));

  roots.push(root);

  const now = new Date().toISOString();

  return {
    id: 'phase3-project',

    name: 'phase3-project',

    rootPath: root,

    createdAt: now,

    updatedAt: now,

    graphVersion: 0,

    memoryVersion: 0,
  };
}

afterEach(() => {
  while (roots.length > 0) {
    rmSync(roots.pop()!, {
      recursive: true,
      force: true,
    });
  }
});

describe('Work State Intelligence', () => {
  it('tracks current request, active work, files, commands and checks without remote flush', () => {
    const project = createProject();

    const core = new SessionCore({
      project,

      storage: new NoRemoteStorage(),

      agent: 'opencode',

      nativeSessionId: 'ses-phase3',

      eventContext: {
        source: 'opencode',

        cwd: project.rootPath,
      },
    });

    core.recordMany([
      {
        type: 'user_prompt',

        role: 'user',

        sourceEventId: 'request-1',

        data: {
          content: 'Sửa OAuth callback và chạy toàn bộ test auth',
        },
      },

      {
        type: 'assistant_message',

        role: 'assistant',

        sourceEventId: 'assistant-1',

        data: {
          content: [
            'TODO 1: Sửa OAuth callback',
            'TODO 1 đang làm',
            'Đang sửa OAuth callback',
            'Bước tiếp theo: chạy test auth',
          ].join('\n'),
        },
      },

      /*
       * OpenCode-like edit tool payload.
       */
      {
        type: 'tool_call',

        sourceEventId: 'open-code-edit',

        data: {
          tool: 'edit',

          state: {
            input: {
              filePath: 'src/auth/callback.ts',
            },
          },
        },
      },

      /*
       * Codex-like apply_patch payload.
       */
      {
        type: 'tool_call',

        sourceEventId: 'codex-patch',

        data: {
          payload: {
            type: 'function_call',

            name: 'apply_patch',

            arguments: [
              '*** Begin Patch',
              '*** Add File: src/auth/helper.ts',
              '+export const helper = true;',
              '*** End Patch',
            ].join('\n'),
          },
        },
      },

      /*
       * Agy/OpenCode-like completed test.
       */
      {
        type: 'tool_call',

        sourceEventId: 'test-pass',

        data: {
          tool: 'bash',

          state: {
            status: 'completed',

            input: {
              command: 'npm test',
            },

            outputSummary: 'Test Files 8 passed\nTests 27 passed',
          },
        },
      },

      /*
       * Failed build must be remembered separately.
       */
      {
        type: 'tool_call',

        sourceEventId: 'build-fail',

        data: {
          tool: 'bash',

          state: {
            status: 'error',

            input: {
              command: 'npm run build',
            },

            outputSummary: 'error TS2322: build failed',
          },
        },
      },
    ]);

    /*
     * No core.flush().
     * Phase 2 + Phase 3 must already have current state.
     */
    const current = JSON.parse(
      readFileSync(join(project.rootPath, '.toolnet', 'work', 'current.json'), 'utf8')
    );

    expect(current.currentRequest).toContain('OAuth callback');

    expect(current.currentActivity).toContain('Đang sửa OAuth callback');

    expect(current.currentTask?.title).toContain('Sửa OAuth callback');

    expect(current.currentTask?.status).toBe('in_progress');

    expect(current.activeFiles).toContain('src/auth/callback.ts');

    expect(current.activeFiles).toContain('src/auth/helper.ts');

    expect(current.modifiedFiles).toContain('src/auth/callback.ts');

    expect(current.createdFiles).toContain('src/auth/helper.ts');

    expect(current.commands).toContain('npm test');

    expect(current.commands).toContain('npm run build');

    expect(current.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'test',

          command: 'npm test',

          status: 'passed',
        }),

        expect.objectContaining({
          kind: 'build',

          command: 'npm run build',

          status: 'failed',
        }),
      ])
    );

    expect(current.nextActions.join(' ')).toContain('chạy test auth');

    const currentMd = readFileSync(join(project.rootPath, '.toolnet', 'current.md'), 'utf8');

    expect(currentMd).toContain('Current request:');

    expect(currentMd).toContain('Active files:');

    expect(currentMd).toContain('[passed] test: npm test');

    expect(currentMd).toContain('[failed] build: npm run build');
  });
});
