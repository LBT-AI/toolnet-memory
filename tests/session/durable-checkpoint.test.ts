import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import type { StorageObject, StorageProvider } from '../../src/storage/types.js';

import { SessionCore } from '../../src/session/core.js';

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

function project(): ProjectManifest {
  const root = mkdtempSync(join(tmpdir(), 'toolnet-phase4-'));

  roots.push(root);

  const now = new Date().toISOString();

  return {
    id: 'phase4-project',

    name: 'phase4-project',

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

describe('Durable continuous memory checkpoint', () => {
  it('keeps important memory + handoff without idle or remote flush', () => {
    const p = project();

    const core = new SessionCore({
      project: p,

      storage: new OfflineStorage(),

      agent: 'opencode',

      nativeSessionId: 'ses-phase4',

      eventContext: {
        source: 'opencode',

        cwd: p.rootPath,
      },
    });

    core.recordMany([
      {
        type: 'user_prompt',

        role: 'user',

        sourceEventId: 'user-1',

        data: {
          content: [
            'Sửa OAuth callback và tiếp tục cho tới khi test xanh.',
            'Từ giờ bắt buộc dùng PKCE cho OAuth flow.',
          ].join('\n'),
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
            'Quyết định: dùng state nonce riêng cho callback.',
            'Đang sửa OAuth callback',
            'Bước tiếp theo: chạy auth tests',
          ].join('\n'),
        },
      },

      {
        type: 'file_edit',

        sourceEventId: 'edit-1',

        data: {
          filePath: 'src/auth/callback.ts',
        },
      },
    ]);

    /*
     * NO idle().
     * NO flush().
     */
    const checkpointFile = join(p.rootPath, '.toolnet', 'memory', 'checkpoints', 'latest.json');

    expect(existsSync(checkpointFile)).toBe(true);

    const checkpoint = JSON.parse(readFileSync(checkpointFile, 'utf8'));

    expect(checkpoint.request).toContain('OAuth callback');

    expect(checkpoint.files.active).toContain('src/auth/callback.ts');

    expect(
      checkpoint.durableFacts.some(
        (fact: { kind: string; content: string }) =>
          fact.kind === 'rule' && fact.content.includes('PKCE')
      )
    ).toBe(true);

    expect(
      checkpoint.durableFacts.some(
        (fact: { kind: string; content: string }) =>
          fact.kind === 'decision' && fact.content.includes('state nonce')
      )
    ).toBe(true);

    const handoffFile = join(p.rootPath, '.toolnet', 'work', 'handoff-latest.json');

    expect(existsSync(handoffFile)).toBe(true);

    const handoff = JSON.parse(readFileSync(handoffFile, 'utf8'));

    expect(handoff.continuity.request).toContain('OAuth callback');

    expect(handoff.continuity.current.file).toBe('src/auth/callback.ts');

    const retrieval = retrieveMemoryContext(p, 'Tóm tắt task và quy tắc quan trọng');

    expect(
      retrieval.facts.some((fact) => fact.kind === 'rule' && fact.value.includes('PKCE'))
    ).toBe(true);

    /*
     * Historical checkpoint is state-digest based.
     * Re-reading does not create junk duplicates.
     */
    const checkpointDir = join(p.rootPath, '.toolnet', 'memory', 'checkpoints');

    const historical = readdirSync(checkpointDir).filter((name) => name !== 'latest.json');

    expect(historical.length).toBeGreaterThan(0);
  });
});
