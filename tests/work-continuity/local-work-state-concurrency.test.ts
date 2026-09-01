import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { dirname, join, resolve } from 'node:path';

import { pathToFileURL } from 'node:url';

import { spawn } from 'node:child_process';

import { afterEach, describe, expect, it } from 'vitest';

import type { ProjectManifest } from '../../src/core/types.js';

import {
  loadLocalWorkState,
  localWorkStateFile,
} from '../../src/work-continuity/local-work-state.js';

import {
  acquireProjectWorkLock,
  projectWorkLockFile,
} from '../../src/work-continuity/project-work-lock.js';

import type { WorkObservation, WorkState } from '../../src/work-continuity/types.js';

const roots: string[] = [];

function project(): ProjectManifest {
  const root = mkdtempSync(join(tmpdir(), 'toolnet-work-lock-'));

  roots.push(root);

  const projectRoot = join(root, 'project');

  mkdirSync(projectRoot, {
    recursive: true,
  });

  const now = new Date().toISOString();

  return {
    id: 'phase4-project',

    name: 'Phase 4',

    rootPath: projectRoot,

    createdAt: now,

    updatedAt: now,

    graphVersion: 1,

    memoryVersion: 1,
  };
}

function observation(projectId: string): WorkObservation {
  return {
    version: 1,

    id: 'obs-codex',

    projectId,

    kind: 'decision',

    key: 'decision-codex',

    text: 'Codex decision survives concurrent projection',

    confidence: 0.95,

    occurredAt: '2026-09-02T01:00:01.000Z',

    sequence: 2,

    agent: 'codex',

    nativeSessionId: 'codex-thread',

    sessionKey: 'codex:codex-thread',

    eventId: 'event-codex',
  };
}

function baselineState(project: ProjectManifest): WorkState {
  return {
    version: 1,

    projectId: project.id,

    projectName: project.name,

    phases: [],

    tasks: [],

    decisions: ['Agy decision survives concurrent projection'],

    blockers: [],

    warnings: [],

    nextActions: [],

    filesTouched: [],

    activeFiles: [],

    modifiedFiles: [],

    createdFiles: [],

    deletedFiles: [],

    commands: [],

    tests: [],

    checks: [],

    progress: {
      phasesTotal: 0,

      phasesCompleted: 0,

      tasksTotal: 0,

      tasksCompleted: 0,

      blocked: 0,
    },

    updatedAt: '2026-09-02T01:00:00.000Z',
  };
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, milliseconds);
  });
}

async function waitForFile(file: string): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (existsSync(file)) {
      return;
    }

    await delay(10);
  }

  throw new Error(`Timed out waiting for ${file}`);
}

function spawnWriter(project: ProjectManifest, root: string, marker: string): Promise<void> {
  const input = join(root, 'child-input.json');

  const runner = join(root, 'child-runner.mjs');

  writeFileSync(
    input,
    JSON.stringify({
      project,

      observations: [observation(project.id)],

      marker,
    })
  );

  const moduleUrl = pathToFileURL(resolve('src/work-continuity/local-work-state.ts')).href;

  writeFileSync(
    runner,
    `import { writeFileSync, readFileSync } from 'node:fs';

import {
  applyObservationsToLocalWorkState
} from ${JSON.stringify(moduleUrl)};

const payload =
  JSON.parse(
    readFileSync(
      process.argv[2],
      'utf8'
    )
  );

writeFileSync(
  payload.marker,
  'started'
);

applyObservationsToLocalWorkState(
  payload.project,
  payload.observations
);
`
  );

  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, ['--import', 'tsx', runner, input], {
      cwd: process.cwd(),

      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('error', rejectPromise);

    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise();

        return;
      }

      rejectPromise(new Error(stderr || `child exited ${code}`));
    });
  });
}

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop();

    if (!root) {
      continue;
    }

    rmSync(root, {
      recursive: true,

      force: true,
    });
  }
});

describe('Local work-state transaction lock', () => {
  it('prevents lost updates across concurrent agent processes', async () => {
    const p = project();

    const root = dirname(p.rootPath);

    const marker = join(root, 'child-started');

    /*
     * Agy owns the transaction first.
     */
    const release = acquireProjectWorkLock(p);

    const child = spawnWriter(p, root, marker);

    await waitForFile(marker);

    /*
     * Without the work lock the child would complete
     * against an empty current.json during this pause.
     */
    await delay(100);

    const file = localWorkStateFile(p);

    mkdirSync(dirname(file), {
      recursive: true,
    });

    writeFileSync(file, `${JSON.stringify(baselineState(p), null, 2)}\n`);

    release();

    await child;

    const state = loadLocalWorkState(p);

    expect(state).not.toBeNull();

    expect(state?.decisions).toContain('Agy decision survives concurrent projection');

    expect(state?.decisions).toContain('Codex decision survives concurrent projection');
  });

  it('removes its lock after the transaction releases', () => {
    const p = project();

    const release = acquireProjectWorkLock(p);

    expect(existsSync(projectWorkLockFile(p))).toBe(true);

    release();

    expect(existsSync(projectWorkLockFile(p))).toBe(false);
  });
});
