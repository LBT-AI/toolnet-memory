import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import { inspectSessionCaptureHealth } from '../../src/production/session-capture-health.js';

const roots: string[] = [];

function project(): ProjectManifest {
  const root = mkdtempSync(join(tmpdir(), 'toolnet-health-'));

  roots.push(root);

  const now = new Date().toISOString();

  return {
    id: 'capture-health-project',

    name: 'capture-health-project',

    rootPath: root,

    createdAt: now,

    updatedAt: now,

    graphVersion: 0,

    memoryVersion: 0,
  };
}

function writeState(
  project: ProjectManifest,
  agent: string,
  session: string,
  values: {
    lastSequence: number;
    lastRemoteSequence: number;
    lastLocalEventAt: string;
    lastRemoteAt?: string;
  }
): void {
  const directory = join(project.rootPath, '.toolnet', 'sessions', agent, session);

  mkdirSync(directory, {
    recursive: true,
  });

  writeFileSync(
    join(directory, 'state.json'),
    JSON.stringify({
      version: 1,

      projectId: project.id,

      agent,

      nativeSessionId: session,

      status: 'active',

      createdAt: values.lastLocalEventAt,

      updatedAt: values.lastLocalEventAt,

      lastLocalEventAt: values.lastLocalEventAt,

      lastRemoteAt: values.lastRemoteAt,

      lastSequence: values.lastSequence,

      lastRemoteSequence: values.lastRemoteSequence,

      remoteByteOffset: 0,

      sourceCursors: {},

      recentEventIds: [],
    })
  );
}

afterEach(() => {
  while (roots.length) {
    rmSync(roots.pop()!, {
      recursive: true,
      force: true,
    });
  }
});

describe('Session capture health', () => {
  it('reports capture and pending WAL per project', () => {
    const p = project();

    writeState(p, 'opencode', 'ses-one', {
      lastSequence: 10,
      lastRemoteSequence: 8,
      lastLocalEventAt: '2026-08-18T18:10:00.000Z',
      lastRemoteAt: '2026-08-18T18:09:00.000Z',
    });

    writeState(p, 'codex', 'thread-two', {
      lastSequence: 3,
      lastRemoteSequence: 3,
      lastLocalEventAt: '2026-08-18T18:20:00.000Z',
      lastRemoteAt: '2026-08-18T18:20:01.000Z',
    });

    const result = inspectSessionCaptureHealth(p);

    expect(result.agents).toEqual(['codex', 'opencode']);

    expect(result.sessions).toBe(2);

    expect(result.latestAgent).toBe('codex');

    expect(result.pendingWal).toBe(2);

    expect(result.syncHealth).toBe('pending');

    expect(result.lastCaptureAt).toBe('2026-08-18T18:20:00.000Z');

    expect(result.lastFlushAt).toBe('2026-08-18T18:20:01.000Z');
  });

  it('detects local capture failure', () => {
    const p = project();

    writeState(p, 'opencode', 'ses-bad', {
      lastSequence: 5,
      lastRemoteSequence: 5,
      lastLocalEventAt: '2026-08-18T19:00:00.000Z',
    });

    const runtime = join(p.rootPath, '.toolnet', 'runtime');

    mkdirSync(runtime, {
      recursive: true,
    });

    writeFileSync(
      join(runtime, 'opencode-status.json'),
      JSON.stringify({
        timestamp: '2026-08-18T19:00:01.000Z',

        projectRoot: p.rootPath,

        state: 'capture-failed',

        error: 'ToolNet command timeout',
      })
    );

    const result = inspectSessionCaptureHealth(p);

    expect(result.syncHealth).toBe('degraded');

    expect(result.ok).toBe(false);

    expect(result.opencode?.error).toBe('ToolNet command timeout');
  });
});
