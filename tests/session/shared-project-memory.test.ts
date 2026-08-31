import { mkdtempSync, readFileSync, rmSync } from 'node:fs';

import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import { createSessionIdentity } from '../../src/session/identity.js';
import { SessionWal } from '../../src/session/wal.js';

import { sharedProjectJournalFile } from '../../src/session/shared-project-journal.js';

const roots: string[] = [];

function project(rootPath: string): ProjectManifest {
  return {
    id: 'shared-project-test',
    name: 'shared-project-test',
    rootPath,
  } as ProjectManifest;
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, {
      recursive: true,
      force: true,
    });
  }
});

describe('shared project memory journal', () => {
  it('keeps native session runtime separate but writes one shared journal', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-shared-memory-'));

    roots.push(root);

    const manifest = project(root);

    const openCode = createSessionIdentity(manifest, 'opencode', 'opencode-session-1');

    const agy = createSessionIdentity(manifest, 'agy', 'agy-conversation-1');

    expect(openCode.localDirectory).toContain(join('.toolnet', 'runtime', 'sources', 'opencode'));

    expect(agy.localDirectory).toContain(join('.toolnet', 'runtime', 'sources', 'agy'));

    expect(openCode.localDirectory).not.toContain(join('.toolnet', 'sessions'));

    expect(agy.localDirectory).not.toContain(join('.toolnet', 'sessions'));

    const openCodeWal = new SessionWal(openCode, {
      source: 'opencode',
      cwd: root,
    });

    const agyWal = new SessionWal(agy, {
      source: 'agy',
      cwd: root,
    });

    openCodeWal.append([
      {
        type: 'user_prompt',
        role: 'user',
        data: {
          content: 'OpenCode starts shared project work',
        },
      },
    ]);

    agyWal.append([
      {
        type: 'assistant_message',
        role: 'assistant',
        data: {
          content: 'AGY continues the same project work',
        },
      },
    ]);

    const journal = readFileSync(sharedProjectJournalFile(root), 'utf8')
      .trim()
      .split('\n')
      .map(
        (line) =>
          JSON.parse(line) as {
            agent: string;
            nativeSessionId: string;
            data: Record<string, unknown>;
          }
      );

    expect(journal).toHaveLength(2);

    expect(journal.map((event) => event.agent)).toEqual(['opencode', 'agy']);

    expect(journal[0].nativeSessionId).toBe('opencode-session-1');
    expect(journal[1].nativeSessionId).toBe('agy-conversation-1');

    /*
     * Different native sessions, same project journal.
     */
    expect(sharedProjectJournalFile(root)).toBe(join(root, '.toolnet', 'journal', 'events.jsonl'));
  });

  it('uses shared remote memory paths while preserving provenance metadata', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-shared-remote-'));

    roots.push(root);

    const manifest = project(root);

    const openCode = createSessionIdentity(manifest, 'opencode', 's1');
    const agy = createSessionIdentity(manifest, 'agy', 's2');

    expect(openCode.remotePrefix).toContain('runtime/sources/opencode/s1');

    expect(agy.remotePrefix).toContain('runtime/sources/agy/s2');

    expect(openCode.remotePrefix).not.toContain('/sessions/');
    expect(agy.remotePrefix).not.toContain('/sessions/');
  });
});
