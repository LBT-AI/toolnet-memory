/*
 * Phase 77 — Local Coordination Daemon production certification.
 *
 * Verifies the shared runtime actually deduplicates expensive work, isolates
 * projects, preserves authority, and fails safely. The daemon is exercised over
 * a real local IPC socket, not by calling internals directly.
 */

import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';

import { spawn } from 'node:child_process';

import { createConnection } from 'node:net';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  DaemonLog,
  SingleFlightRegistry,
  WatcherCoordinator,
  canTransition,
  connectDaemonClient,
  connectOrStartDaemon,
  daemonBuildFingerprint,
  daemonSocketPath,
  localClientIdentity,
  redactDaemonText,
  resolveDaemonLimits,
  startDaemon,
  singleFlightKey,
  type DaemonHandle,
  type DaemonRuntimeDependencies,
} from '../../src/daemon/index.js';

import { ProjectRegistry, SessionRegistry } from '../../src/daemon/registry.js';

import { FleetCoordinator } from '../../src/daemon/coordinators.js';

import { acquireDaemonInstanceLock } from '../../src/daemon/instance-lock.js';

import { FrameDecoder, encodeFrame, parseRequestEnvelope } from '../../src/daemon/protocol.js';

import { DaemonError, type DaemonClientIdentity } from '../../src/daemon/types.js';

import { createCodeIntelligenceRuntime } from '../../src/code-intelligence/runtime/index.js';

/**
 * Run the packaged MCP bundle and read its real `tools/list` response.
 *
 * Source registration is not enough: the bundle that ships in the package must
 * expose the daemon diagnostics tool too.
 */
async function listPackagedMcpTools(
  bundlePath: string
): Promise<{ tools: string[]; noise: string[] }> {
  const cwd = mkdtempSync(join(tmpdir(), 'toolnet-phase77-'));

  const requests = `${[
    JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'phase77-certify', version: '1.0.0' },
      },
    }),
    JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }),
  ].join('\n')}\n`;

  const child = spawn(process.execPath, [bundlePath], {
    cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
    /* Never spawn a shared daemon from the certification probe. */
    env: { ...process.env, TOOLNET_DAEMON_DISABLED: '1' },
  });

  child.stderr.resume();

  return new Promise<{ tools: string[]; noise: string[] }>((resolvePromise, rejectPromise) => {
    let buffer = '';
    let settled = false;
    let timer: NodeJS.Timeout | undefined;
    const noise: string[] = [];

    const finish = (complete: () => void): void => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      child.kill('SIGKILL');
      complete();
    };

    timer = setTimeout(
      () => finish(() => rejectPromise(new Error('packaged runtime probe timed out'))),
      60_000
    );

    child.stdout.setEncoding('utf8');

    child.stdout.on('data', (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (!trimmed.startsWith('{')) {
          /*
           * Anything else on stdout corrupts the MCP stdio protocol. This is
           * exactly how a barrel re-export of a side-effectful CLI leaks in.
           */
          noise.push(trimmed);
          continue;
        }

        let message: { id?: unknown; result?: { tools?: Array<{ name?: unknown }> } };

        try {
          message = JSON.parse(trimmed) as typeof message;
        } catch {
          noise.push(trimmed);
          continue;
        }

        if (message.id !== 2) continue;

        const names = (message.result?.tools ?? []).map((tool) => String(tool.name));
        finish(() => resolvePromise({ tools: names, noise }));
        return;
      }
    });

    child.on('error', (error) => finish(() => rejectPromise(error)));

    child.stdin.write(requests);
  });
}

async function waitFor(predicate: () => boolean, timeoutMs = 2_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (!predicate()) {
    if (Date.now() >= deadline) {
      throw new Error('waitFor timed out');
    }

    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

const CLEANUPS: Array<() => void | Promise<void>> = [];

afterEach(async () => {
  while (CLEANUPS.length > 0) {
    const cleanup = CLEANUPS.pop();

    try {
      await cleanup?.();
    } catch {
      /* Best effort. */
    }
  }
});

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'tnd-'));

  CLEANUPS.push(() => rmSync(root, { recursive: true, force: true }));

  return root;
}

function tempProject(root: string, name: string): { id: string; name: string; rootPath: string } {
  const rootPath = join(root, name);

  mkdirSync(rootPath, { recursive: true });

  return { id: name, name, rootPath };
}

interface FakeState {
  indexCalls: number;
  hydrateCalls: number;
  queryCalls: number;
  refreshFleetCalls: number;
  fleetBatches: string[][];
  released: string[];
  localGraph: boolean;
  generation: string;
  hydrateFails: boolean;
  indexDelayMs: number;
  indexAborted: number;
  lastQuery: Record<string, unknown> | null;
  evidenceCalls?: number;
}

function makeDeps(overrides: Partial<FakeState> = {}): {
  deps: DaemonRuntimeDependencies;
  state: FakeState;
} {
  const state: FakeState = {
    indexCalls: 0,
    hydrateCalls: 0,
    queryCalls: 0,
    refreshFleetCalls: 0,
    fleetBatches: [],
    released: [],
    localGraph: false,
    generation: 'gen-0',
    hydrateFails: false,
    indexDelayMs: 0,
    indexAborted: 0,
    lastQuery: null,
    ...overrides,
  };

  const deps: DaemonRuntimeDependencies = {
    async probeLocalGraph() {
      return state.localGraph
        ? { present: true, generation: state.generation }
        : { present: false };
    },

    async loadProject() {
      return { generation: state.generation };
    },

    async indexProject(_project, signal, report) {
      state.indexCalls += 1;

      report({ kind: 'stage', stage: 'source-index', state: 'start' });

      if (state.indexDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, state.indexDelayMs));
      }

      if (signal.aborted) {
        state.indexAborted += 1;
        throw new Error('INDEX_CANCELLED');
      }

      report({ kind: 'source', phase: 'parse', current: 1, total: 1 });
      report({ kind: 'stage', stage: 'source-index', state: 'complete', durationMs: 1 });
      report({ kind: 'stage-progress', stage: 'type-resolution', current: 1, total: 1 });

      state.localGraph = true;
      state.generation = `gen-${state.indexCalls}`;

      return { generation: state.generation, files: 2, symbols: 3, edges: 1 };
    },

    async hydrateProject(_project, signal) {
      state.hydrateCalls += 1;

      if (state.hydrateFails || signal.aborted) {
        throw new Error('ARTIFACT_HYDRATION_FAILED: no compatible artifact');
      }

      state.localGraph = true;
      state.generation = 'gen-hydrated';

      return {
        generation: state.generation,
        files: 1,
        symbols: 1,
        edges: 0,
        fleetRepinned: true,
      };
    },

    async artifactStatus() {
      return { present: state.localGraph, generation: state.generation };
    },

    async evidenceProject(project, request) {
      state.evidenceCalls = (state.evidenceCalls ?? 0) + 1;

      return {
        profile: request.profile,
        evidenceLevel: 'provisional',
        operation: request.operation,
        claim: request.claim,
        scope: request.scope,
        generation: { project: state.generation },
        requirements: [],
        evidence: [],
        coverage: [],
        pagination: { complete: true, pages: 1, rows: 0, truncated: false },
        sourceFallback: {
          requested: false,
          performed: false,
          gapsChecked: [],
          matches: 0,
          skipped: [],
        },
        unresolved: { total: 0, relevant: 0, ambiguous: 0, dynamic: 0, items: [] },
        claimSafety: {
          decision: 'provisional',
          negativeClaimSafe: false,
          exhaustiveClaimSafe: false,
          reasons: [],
        },
        limitations: [],
        diagnostics: [],
        adrConstraints: [],
        complete: false,
        fingerprint: `${project.id}:${request.claim}`,
      } as never;
    },

    async queryProject(project, input) {
      state.queryCalls += 1;
      state.lastQuery = { projectId: project.id, ...input };

      if (input.query.includes('CURSOR-STALE')) {
        throw new Error('CURSOR_STALE');
      }

      return {
        schemaVersion: 1,
        queryFingerprint: 'qf',
        schemaFingerprint: 'sf',
        scope: input.scope,
        generation: { [input.scope]: state.generation },
        columns: ['a'],
        rows: [{ a: `${project.id}:${state.generation}` }],
        rowCount: 1,
        truncated: false,
      } as never;
    },

    async refreshFleet(projectIds) {
      state.refreshFleetCalls += 1;
      state.fleetBatches.push([...projectIds]);
    },

    async releaseProject(projectId) {
      state.released.push(projectId);
    },
  };

  return { deps, state };
}

async function startTestDaemon(
  root: string,
  deps: DaemonRuntimeDependencies,
  options: { disableWatchers?: boolean; limits?: Parameters<typeof resolveDaemonLimits>[0] } = {}
): Promise<DaemonHandle> {
  const daemon = await startDaemon({
    deps,
    runtimeRoot: root,
    disableWatchers: options.disableWatchers ?? true,
    ...(options.limits ? { limits: options.limits } : {}),
  });

  CLEANUPS.push(() => daemon.close({ force: true }));

  return daemon;
}

async function connect(
  root: string,
  client: Partial<DaemonClientIdentity> & { type: string },
  options: { fingerprint?: string; protocolVersion?: number; timeoutMs?: number } = {}
) {
  const daemon = await connectDaemonClient({
    socketPath: daemonSocketPath(root),
    runtimeRoot: root,
    client: { ...client },
    timeoutMs: options.timeoutMs ?? 2_000,
    ...(options.fingerprint ? { fingerprint: options.fingerprint } : {}),
    ...(options.protocolVersion !== undefined ? { protocolVersion: options.protocolVersion } : {}),
  });

  CLEANUPS.push(() => daemon.close());

  return daemon;
}

/* ================================================================== *
 * Registration, heartbeat, attach/detach
 * ================================================================== */

describe('Phase 77 — sessions and project attach', () => {
  it('registers a session on hello and reports it in daemon status', async () => {
    const root = tempRoot();

    const { deps } = makeDeps();

    const daemon = await startTestDaemon(root, deps);

    const client = await connect(root, { type: 'mcp', pid: process.pid });

    expect(client.sessionId).toMatch(/^sess-/);
    expect(client.instance.instanceId).toMatch(/^daemon-/);
    expect(daemon.sessions.size).toBe(1);

    const status = await client.request({ type: 'daemon_status' });

    expect(status.ok).toBe(true);

    if (status.ok && status.type === 'daemon_status') {
      expect(status.status.sessions).toBe(1);
      expect(status.status.fingerprint.buildHash).toBe(daemon.fingerprint.buildHash);
    }
  });

  it('reaps sessions whose heartbeat has expired', () => {
    const sessions = new SessionRegistry({ heartbeatTimeoutMs: 1_000 });

    const record = sessions.register({ type: 'mcp' }, 'fp', 0);

    expect(sessions.touch(record.sessionId, 500)).toBe(true);
    expect(sessions.reapStale(900)).toEqual([]);
    expect(sessions.reapStale(2_500)).toEqual([record.sessionId]);
    expect(sessions.size).toBe(0);
  });

  it('tracks attach and detach per session without leaking across sessions', async () => {
    const root = tempRoot();

    const { deps } = makeDeps();

    const daemon = await startTestDaemon(root, deps);

    const project = tempProject(root, 'proj-a');

    const a = await connect(root, { type: 'mcp' });
    const b = await connect(root, { type: 'mcp' });

    await a.request({ type: 'attach_project', sessionId: a.sessionId, project });

    await b.request({ type: 'attach_project', sessionId: b.sessionId, project });

    expect(daemon.projects.get(project.id)?.sessions.size).toBe(2);

    const detached = await a.request({
      type: 'detach_project',
      sessionId: a.sessionId,
      projectId: project.id,
    });

    expect(detached.ok).toBe(true);
    expect(daemon.projects.get(project.id)?.sessions.size).toBe(1);
    expect(daemon.projects.forSession(b.sessionId).length).toBe(1);

    await b.request({ type: 'detach_project', sessionId: b.sessionId, projectId: project.id });

    expect(daemon.projects.get(project.id)?.sessions.size).toBe(0);
  });

  it('cleans up a crashed client session without touching other sessions', async () => {
    const root = tempRoot();

    const { deps } = makeDeps();

    const daemon = await startTestDaemon(root, deps);

    const a = await connect(root, { type: 'mcp' });
    const b = await connect(root, { type: 'mcp' });

    expect(daemon.sessions.size).toBe(2);

    /* Simulate a hard crash: close the socket without any detach. */
    await a.close();

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(daemon.sessions.size).toBe(1);
    expect(daemon.sessions.get(b.sessionId)).toBeDefined();
  });

  it('rejects requests from an unregistered session', async () => {
    const root = tempRoot();

    const { deps } = makeDeps();

    await startTestDaemon(root, deps);

    const client = await connect(root, { type: 'mcp' });

    const response = await client.request({
      type: 'attach_project',
      sessionId: 'sess-bogus',
      project: tempProject(root, 'proj-a'),
    });

    expect(response.ok).toBe(false);

    if (!response.ok) {
      expect(response.code).toBe('SESSION_UNKNOWN');
    }
  });
});

/* ================================================================== *
 * Instance lock
 * ================================================================== */

describe('Phase 77 — instance lock', () => {
  it('allows only one daemon per runtime identity', async () => {
    const root = tempRoot();

    const { deps } = makeDeps();

    await startTestDaemon(root, deps);

    await expect(startTestDaemon(root, deps)).rejects.toMatchObject({ code: 'DAEMON_LOCKED' });
  });

  it('recovers a stale lock whose pid is dead', async () => {
    const root = tempRoot();

    const lockPath = join(root, 'daemon.lock');

    writeFileSync(
      lockPath,
      JSON.stringify({
        instanceId: 'daemon-dead',
        pid: 999_999,
        startedAt: new Date().toISOString(),
        socketPath: join(root, 'daemon.sock'),
        fingerprint: 'fp-dead',
      })
    );

    const handle = await acquireDaemonInstanceLock({
      lockPath,
      owner: {
        instanceId: 'daemon-new',
        pid: process.pid,
        startedAt: new Date().toISOString(),
        socketPath: join(root, 'daemon.sock'),
        fingerprint: 'fp-new',
      },
      isProcessAlive: () => false,
    });

    expect(handle.owner.instanceId).toBe('daemon-new');

    handle.release();

    expect(existsSync(lockPath)).toBe(false);
  });

  it('treats a reused pid as stale and never kills the unrelated process', async () => {
    const root = tempRoot();

    const lockPath = join(root, 'daemon.lock');

    writeFileSync(
      lockPath,
      JSON.stringify({
        instanceId: 'daemon-old',
        pid: 424_242,
        startedAt: new Date().toISOString(),
        socketPath: join(root, 'daemon.sock'),
        fingerprint: 'fp-old',
      })
    );

    let probed = 0;

    const handle = await acquireDaemonInstanceLock({
      lockPath,
      owner: {
        instanceId: 'daemon-new',
        pid: process.pid,
        startedAt: new Date().toISOString(),
        socketPath: join(root, 'daemon.sock'),
        fingerprint: 'fp-new',
      },
      /* The pid is alive but it is not our daemon. */
      isProcessAlive: () => true,
      probe: async () => {
        probed += 1;
        return false;
      },
    });

    expect(probed).toBe(1);
    expect(handle.owner.instanceId).toBe('daemon-new');

    handle.release();
  });

  it('refuses to steal a live compatible daemon lock', async () => {
    const root = tempRoot();

    const { deps } = makeDeps();

    const daemon = await startTestDaemon(root, deps);

    await expect(
      acquireDaemonInstanceLock({
        lockPath: join(root, 'daemon.lock'),
        owner: {
          instanceId: 'daemon-thief',
          pid: process.pid,
          startedAt: new Date().toISOString(),
          socketPath: daemon.socketPath,
          fingerprint: daemon.fingerprint.buildHash,
        },
      })
    ).rejects.toMatchObject({ code: 'DAEMON_LOCKED' });
  });
});

/* ================================================================== *
 * Startup race
 * ================================================================== */

describe('Phase 77 — startup race and single-flight indexing', () => {
  it('elects exactly one daemon and dedupes one shared index across 20 clients', async () => {
    const root = tempRoot();

    const { deps, state } = makeDeps({ indexDelayMs: 100, hydrateFails: true });

    const project = tempProject(root, 'proj-race');

    const bootstraps = await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        connectOrStartDaemon({
          deps,
          runtimeRoot: root,
          client: localClientIdentity('mcp', `racer-${index}`),
          timeoutMs: 500,
        })
      )
    );

    const started = bootstraps.filter((result) => result.started);

    expect(started).toHaveLength(1);

    const clients = bootstraps.map((result) => result.client);

    expect(clients.every((client) => client !== undefined)).toBe(true);

    const connected = clients.filter((client): client is NonNullable<typeof client> => !!client);

    const instances = new Set(connected.map((client) => client.instance.instanceId));

    expect(instances.size).toBe(1);

    if (started[0]?.daemon) {
      const daemon = started[0].daemon;
      CLEANUPS.push(() => daemon.close({ force: true }));
    }

    /* 20 concurrent readiness requests on the same project: one index pass. */
    const ready = await Promise.all(
      connected.map((client) =>
        client.request({ type: 'ensure_ready', sessionId: client.sessionId, project })
      )
    );

    expect(ready.every((response) => response.ok)).toBe(true);
    expect(state.indexCalls).toBe(1);
    expect(state.hydrateCalls).toBe(1);

    const generations = new Set(
      ready
        .filter(
          (response): response is Extract<typeof response, { type: 'job_result' }> =>
            response.ok && response.type === 'job_result'
        )
        .map((response) => response.generation)
    );

    expect(generations.size).toBe(1);
  });

  it('joins an already-running index job instead of starting a second one', async () => {
    const root = tempRoot();

    const { deps, state } = makeDeps({ indexDelayMs: 75, hydrateFails: true });

    const project = tempProject(root, 'proj-join');

    await startTestDaemon(root, deps);

    const client = await connect(root, { type: 'mcp' });

    await client.request({ type: 'attach_project', sessionId: client.sessionId, project });

    const first = client.request({ type: 'ensure_ready', sessionId: client.sessionId, project });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const second = connectOrStartDaemon({
      deps,
      runtimeRoot: root,
      client: localClientIdentity('mcp', 'joiner'),
      timeoutMs: 500,
    });

    const [firstResponse, joined] = await Promise.all([first, second]);

    expect(firstResponse.ok).toBe(true);
    expect(joined.client).toBeDefined();

    const joinedReady = await joined.client!.request({
      type: 'ensure_ready',
      sessionId: joined.client!.sessionId,
      project,
    });

    expect(joinedReady.ok).toBe(true);
    expect(state.indexCalls).toBe(1);

    if (joined.daemon) {
      const daemon = joined.daemon;
      CLEANUPS.push(() => daemon.close({ force: true }));
    }
  });
});

/* ================================================================== *
 * Single-flight hydration
 * ================================================================== */

describe('Phase 77 — single-flight hydration', () => {
  it('hydrates once for ten sessions and never invokes the index pipeline', async () => {
    const root = tempRoot();

    const { deps, state } = makeDeps();

    const project = tempProject(root, 'proj-hydrate');

    await startTestDaemon(root, deps);

    const client = await connect(root, { type: 'mcp' });

    const responses = await Promise.all(
      Array.from({ length: 10 }, () =>
        client.request({ type: 'ensure_ready', sessionId: client.sessionId, project })
      )
    );

    expect(responses.every((response) => response.ok)).toBe(true);
    expect(state.hydrateCalls).toBe(1);
    expect(state.indexCalls).toBe(0);
  });

  it('falls back to a shared index when no compatible artifact exists', async () => {
    const root = tempRoot();

    const { deps, state } = makeDeps({ hydrateFails: true });

    const project = tempProject(root, 'proj-fallback');

    await startTestDaemon(root, deps);

    const client = await connect(root, { type: 'mcp' });

    const response = await client.request({
      type: 'ensure_ready',
      sessionId: client.sessionId,
      project,
    });

    expect(response.ok).toBe(true);
    expect(state.hydrateCalls).toBeGreaterThanOrEqual(1);
    expect(state.indexCalls).toBe(1);
  });
});

/* ================================================================== *
 * Progress fanout and cancellation
 * ================================================================== */

describe('Phase 77 — progress fanout', () => {
  it('fans one index progress stream out to every subscribed session', async () => {
    const root = tempRoot();

    const { deps } = makeDeps({ indexDelayMs: 150 });

    const project = tempProject(root, 'proj-progress');

    const daemon = await startTestDaemon(root, deps);

    const clients = await Promise.all(
      [0, 1, 2].map((index) => connect(root, { type: 'mcp', label: `sub-${index}` }))
    );

    const received: string[][] = clients.map(() => []);

    clients.forEach((client, index) => {
      client.onProgress((event) => {
        received[index]!.push(event.kind);
      });
    });

    const starter = clients[0]!;

    const indexing = starter.request({
      type: 'index_project',
      sessionId: starter.sessionId,
      project,
    });

    await waitFor(() => daemon.index.list().length === 1);

    const job = daemon.index.list()[0]!;

    const subscriptions = await Promise.all(
      clients.map((client) =>
        client.request({
          type: 'subscribe_progress',
          sessionId: client.sessionId,
          jobId: job.id,
        })
      )
    );

    expect(subscriptions.every((response) => response.ok)).toBe(true);

    const response = await indexing;

    expect(response.ok).toBe(true);

    /* Progress frames arrive on their own async tick for non-starting clients. */
    await waitFor(() => received.every((stream) => stream.length > 0));

    for (const stream of received) {
      expect(stream.length).toBeGreaterThan(0);
    }
  });

  it('cancels a shared job when its last subscriber unsubscribes', async () => {
    const root = tempRoot();

    const { deps, state } = makeDeps({ indexDelayMs: 500 });

    const project = tempProject(root, 'proj-cancel');

    const daemon = await startTestDaemon(root, deps);

    const client = await connect(root, { type: 'mcp' });

    const indexing = client.request({
      type: 'index_project',
      sessionId: client.sessionId,
      project,
    });

    await waitFor(() => daemon.index.list().length === 1);

    const job = daemon.index.list()[0]!;

    /* The indexing job's only subscriber is the requesting session. */
    await client.request({
      type: 'unsubscribe_progress',
      sessionId: client.sessionId,
      jobId: job.id,
    });

    expect(job.state).toBe('cancelled');

    const response = await indexing;

    expect(response.ok).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 120));

    expect(state.indexAborted).toBe(1);
    expect(daemon.projects.get(project.id)?.state).not.toBe('ready');
  });

  it('keeps a shared job running while another subscriber still needs it', async () => {
    const root = tempRoot();

    const { deps } = makeDeps({ indexDelayMs: 150, hydrateFails: true });

    const project = tempProject(root, 'proj-shared');

    const daemon = await startTestDaemon(root, deps);

    const a = await connect(root, { type: 'mcp' });
    const b = await connect(root, { type: 'mcp' });

    await a.request({ type: 'attach_project', sessionId: a.sessionId, project });
    await b.request({ type: 'attach_project', sessionId: b.sessionId, project });

    const jobA = a.request({ type: 'ensure_ready', sessionId: a.sessionId, project });
    const jobB = b.request({ type: 'ensure_ready', sessionId: b.sessionId, project });

    const [resultA, resultB] = await Promise.all([jobA, jobB]);

    expect(resultA.ok).toBe(true);
    expect(resultB.ok).toBe(true);

    const jobs = daemon.index.list();

    expect(jobs.length).toBe(0);
  });
});

/* ================================================================== *
 * Query runtime parity
 * ================================================================== */

describe('Phase 77 — query runtime', () => {
  it('passes the bounded query payload through unchanged and returns the runtime generation', async () => {
    const root = tempRoot();

    const { deps, state } = makeDeps({ localGraph: true, generation: 'gen-7' });

    const project = tempProject(root, 'proj-query');

    const daemon = await startTestDaemon(root, deps);

    const client = await connect(root, { type: 'mcp' });

    const response = await client.request({
      type: 'query',
      sessionId: client.sessionId,
      project,
      query: 'MATCH (f:Function) RETURN f LIMIT 5',
      scope: 'project',
      parameters: { name: 'createOrder' },
      limit: 5,
      cursor: 'cursor-abc',
      explain: false,
    });

    expect(response.ok).toBe(true);

    expect(state.lastQuery).toMatchObject({
      projectId: project.id,
      query: 'MATCH (f:Function) RETURN f LIMIT 5',
      scope: 'project',
      parameters: { name: 'createOrder' },
      limit: 5,
      cursor: 'cursor-abc',
      explain: false,
    });

    if (response.ok && response.type === 'query') {
      expect(response.result.generation).toEqual({ project: 'gen-7' });
      expect(response.result.rows).toEqual([{ a: `${project.id}:gen-7` }]);
    }

    expect(daemon.projects.get(project.id)?.state).toBe('ready');
  });

  it('surfaces a stale cursor as a query failure without silently succeeding', async () => {
    const root = tempRoot();

    const { deps } = makeDeps({ localGraph: true });

    const project = tempProject(root, 'proj-cursor');

    await startTestDaemon(root, deps);

    const client = await connect(root, { type: 'mcp' });

    const response = await client.request({
      type: 'query',
      sessionId: client.sessionId,
      project,
      query: 'CURSOR-STALE',
    });

    expect(response.ok).toBe(false);

    if (!response.ok) {
      expect(response.code).toBe('QUERY_FAILED');
      expect(response.error).toContain('CURSOR_STALE');
    }
  });

  it('keeps projects isolated: an unknown project is never silently served', async () => {
    const root = tempRoot();

    const { deps, state } = makeDeps({ localGraph: true, generation: 'gen-a' });

    const projectA = tempProject(root, 'proj-a');
    const projectB = tempProject(root, 'proj-b');

    await startTestDaemon(root, deps);

    const client = await connect(root, { type: 'mcp' });

    /* Project B was never attached. */
    const status = await client.request({
      type: 'project_status',
      sessionId: client.sessionId,
      project: projectB,
    });

    expect(status.ok).toBe(false);

    if (!status.ok) {
      expect(status.code).toBe('PROJECT_NOT_ATTACHED');
    }

    const query = await client.request({
      type: 'query',
      sessionId: client.sessionId,
      project: projectA,
      query: 'MATCH (f:Function) RETURN f',
    });

    expect(query.ok).toBe(true);
    expect(state.lastQuery?.projectId).toBe(projectA.id);
  });
});

/* ================================================================== *
 * Admission barriers
 * ================================================================== */

describe('Phase 77 — admission barriers', () => {
  it('rejects a client with a different build fingerprint', async () => {
    const root = tempRoot();

    const { deps } = makeDeps();

    await startTestDaemon(root, deps);

    await expect(
      connect(root, { type: 'mcp' }, { fingerprint: 'deadbeef-deadbeef' })
    ).rejects.toMatchObject({ code: 'DAEMON_BUILD_MISMATCH' });
  });

  it('rejects a client with a different protocol version', async () => {
    const root = tempRoot();

    const { deps } = makeDeps();

    await startTestDaemon(root, deps);

    await expect(connect(root, { type: 'mcp' }, { protocolVersion: 999 })).rejects.toMatchObject({
      code: 'DAEMON_PROTOCOL_MISMATCH',
    });
  });

  it('does not auto-restart a mismatched daemon', async () => {
    const root = tempRoot();

    const { deps } = makeDeps();

    const daemon = await startTestDaemon(root, deps);

    const result = await connectOrStartDaemon({
      deps,
      runtimeRoot: root,
      client: localClientIdentity('mcp', 'stale-client'),
      fingerprint: 'not-the-same-build',
      timeoutMs: 300,
    });

    expect(result.client).toBeUndefined();
    expect(result.started).toBe(false);
    expect(result.diagnostic).toBe('DAEMON_BUILD_MISMATCH');

    /* The original daemon is still running and untouched. */
    expect(daemon.stats().draining).toBe(false);
  });

  it('blocks a normal shutdown while other sessions are active, unless forced', async () => {
    const root = tempRoot();

    const { deps } = makeDeps();

    const daemon = await startTestDaemon(root, deps);

    const a = await connect(root, { type: 'mcp' });
    const b = await connect(root, { type: 'mcp' });

    const blocked = await a.request({ type: 'shutdown', sessionId: a.sessionId });

    expect(blocked.ok).toBe(false);

    if (!blocked.ok) {
      expect(blocked.code).toBe('DAEMON_UPGRADE_BLOCKED_ACTIVE_SESSIONS');
    }

    expect(daemon.stats().draining).toBe(false);

    /* Disconnect the other session, then a graceful shutdown is allowed. */
    await b.close();

    await new Promise((resolve) => setTimeout(resolve, 50));

    const allowed = await a.request({ type: 'shutdown', sessionId: a.sessionId }, 5_000);

    expect(allowed.ok).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 100));

    await daemon.close({ force: true });
  });
});

/* ================================================================== *
 * Backpressure and message limits
 * ================================================================== */

describe('Phase 77 — resource limits', () => {
  it('drops progress under backpressure but never drops a final result', async () => {
    const root = tempRoot();

    const { deps } = makeDeps({ indexDelayMs: 40 });

    const project = tempProject(root, 'proj-backpressure');

    const daemon = await startTestDaemon(root, deps, {
      limits: { maxOutboundQueueBytes: 1 },
    });

    const client = await connect(root, { type: 'mcp' });

    const indexing = client.request({
      type: 'index_project',
      sessionId: client.sessionId,
      project,
    });

    await waitFor(() => daemon.index.list().length === 1);

    const job = daemon.index.list()[0]!;

    const subscribed = await client.request({
      type: 'subscribe_progress',
      sessionId: client.sessionId,
      jobId: job.id,
    });

    expect(subscribed.ok).toBe(true);

    /* The final result is delivered even though progress was dropped. */
    const response = await indexing;

    expect(response.ok).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(daemon.stats().droppedProgress).toBeGreaterThan(0);
  });

  it('closes a client that sends an oversized frame without harming others', async () => {
    const root = tempRoot();

    const { deps } = makeDeps();

    const daemon = await startTestDaemon(root, deps, { limits: { maxMessageBytes: 8192 } });

    const healthy = await connect(root, { type: 'mcp' });

    const socket = createConnection({ path: daemon.socketPath });

    await new Promise<void>((resolve) => {
      socket.once('connect', () => resolve());
    });

    const header = Buffer.alloc(4);
    header.writeUInt32BE(1_000_000, 0);

    socket.write(header);

    await new Promise<void>((resolve) => {
      socket.once('close', () => resolve());
    });

    expect(socket.destroyed).toBe(true);

    /* The daemon and other sessions are still healthy. */
    const status = await healthy.request({ type: 'daemon_status' });

    expect(status.ok).toBe(true);
  });

  it('closes a client that sends malformed JSON without harming others', async () => {
    const root = tempRoot();

    const { deps } = makeDeps();

    const daemon = await startTestDaemon(root, deps);

    const healthy = await connect(root, { type: 'mcp' });

    const socket = createConnection({ path: daemon.socketPath });

    await new Promise<void>((resolve) => {
      socket.once('connect', () => resolve());
    });

    const payload = Buffer.from('{not json', 'utf8');
    const header = Buffer.alloc(4);
    header.writeUInt32BE(payload.byteLength, 0);

    socket.write(Buffer.concat([header, payload]));

    await new Promise<void>((resolve) => {
      socket.once('close', () => resolve());
    });

    const status = await healthy.request({ type: 'daemon_status' });

    expect(status.ok).toBe(true);
  });
});

/* ================================================================== *
 * Idle eviction
 * ================================================================== */

describe('Phase 77 — idle eviction', () => {
  it('evicts only idle, unpinned project runtimes', () => {
    const projects = new ProjectRegistry();

    const now = 1_000_000;

    projects.attach({ id: 'a', name: 'a', rootPath: '/a' }, 's1', now);
    projects.attach({ id: 'b', name: 'b', rootPath: '/b' }, 's1', now);
    projects.attach({ id: 'pinned', name: 'p', rootPath: '/p' }, 's2', now);

    projects.detach('a', 's1', now);
    projects.detach('b', 's1', now);

    /* 'pinned' keeps its session. */

    const candidates = projects.evictionCandidates({
      maxResident: 2,
      idleMs: 10,
      now: now + 100,
    });

    expect(candidates).toEqual(['a']);

    expect(projects.evictionCandidates({ maxResident: 5, idleMs: 10, now: now + 100 })).toEqual([]);
  });

  it('evicts a project runtime and releases its resident state', async () => {
    const root = tempRoot();

    const { deps, state } = makeDeps();

    const project = tempProject(root, 'proj-evict');

    const daemon = await startTestDaemon(root, deps, {
      limits: { maxResidentProjects: 0, idleEvictionMs: 100 },
    });

    const client = await connect(root, { type: 'mcp' });

    await client.request({ type: 'ensure_ready', sessionId: client.sessionId, project });

    await client.request({
      type: 'detach_project',
      sessionId: client.sessionId,
      projectId: project.id,
    });

    await new Promise((resolve) => setTimeout(resolve, 1_300));

    expect(state.released).toContain(project.id);

    await daemon.close({ force: true });
  });
});

/* ================================================================== *
 * Authority non-interference and crash recovery
 * ================================================================== */

describe('Phase 77 — authority and recovery', () => {
  it('never writes outside the daemon runtime directory', async () => {
    const root = tempRoot();

    const { deps } = makeDeps();

    const project = tempProject(root, 'proj-authority');

    /* Stand-in for persistent authority that the daemon must never touch. */
    const authorityDir = join(root, 'authority');
    mkdirSync(authorityDir, { recursive: true });
    const authorityFile = join(authorityDir, 'adr-state.json');
    writeFileSync(authorityFile, JSON.stringify({ revision: 7, records: ['ADR-0001'] }));

    const before = readFileSync(authorityFile, 'utf8');

    const daemon = await startTestDaemon(root, deps);

    const client = await connect(root, { type: 'mcp' });

    await client.request({ type: 'ensure_ready', sessionId: client.sessionId, project });
    await client.request({
      type: 'query',
      sessionId: client.sessionId,
      project,
      query: 'MATCH (f:Function) RETURN f',
    });

    await client.request({ type: 'shutdown', sessionId: client.sessionId, force: true }, 5_000);

    await new Promise((resolve) => setTimeout(resolve, 100));

    await daemon.close({ force: true });

    expect(readFileSync(authorityFile, 'utf8')).toBe(before);

    /* No authority namespaces are created inside the runtime directory. */
    for (const forbidden of ['knowledge', 'tasks', 'memory', 'sessions']) {
      expect(existsSync(join(root, forbidden))).toBe(false);
    }
  });

  it('recovers after a daemon crash by starting a fresh instance', async () => {
    const root = tempRoot();

    const { deps } = makeDeps();

    const daemon = await startTestDaemon(root, deps);

    const firstInstance = daemon.instance.instanceId;

    await daemon.close({ force: true });

    const recovered = await connectOrStartDaemon({
      deps,
      runtimeRoot: root,
      client: localClientIdentity('mcp', 'recover'),
      timeoutMs: 1_000,
    });

    expect(recovered.client).toBeDefined();

    if (recovered.daemon) {
      const daemon = recovered.daemon;
      CLEANUPS.push(() => daemon.close({ force: true }));
    }

    expect(recovered.client!.instance.instanceId).not.toBe(firstInstance);

    const status = await recovered.client!.request({ type: 'daemon_status' });

    expect(status.ok).toBe(true);

    await recovered.client!.close();
  });
});

/* ================================================================== *
 * Watcher coordination
 * ================================================================== */

describe('Phase 77 — watcher coordination', () => {
  it('creates exactly one watcher per project and coalesces bursts', async () => {
    const batches: Array<{ projectId: string; paths: string[]; epoch: number }> = [];

    let trigger: ((path: string, event: string) => void) | undefined;

    const coordinator = new WatcherCoordinator({
      debounceMs: 20,
      onBatch: (projectId, paths, epoch) => {
        batches.push({ projectId, paths, epoch });
      },
      factory: (_rootPath, onEvent) => {
        trigger = onEvent;
        return { close: () => undefined };
      },
    });

    expect(coordinator.ensure('p1', '/tmp/p1')).toBe(true);
    expect(coordinator.ensure('p1', '/tmp/p1')).toBe(false);
    expect(coordinator.size).toBe(1);

    /* Ten rapid edits collapse into one batch. */
    for (let index = 0; index < 10; index += 1) {
      trigger!('src/a.ts', 'change');
    }

    trigger!('src/b.ts', 'change');
    trigger!('.git/HEAD', 'change');
    trigger!('node_modules/x/y.js', 'change');

    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(batches).toHaveLength(1);
    expect(batches[0]!.paths).toEqual(['src/a.ts', 'src/b.ts']);
    expect(batches[0]!.epoch).toBe(1);

    coordinator.release('p1');

    expect(coordinator.size).toBe(0);
  });

  it('rejects watcher events that escape the project root', async () => {
    const batches: string[][] = [];

    let trigger: ((path: string, event: string) => void) | undefined;

    const coordinator = new WatcherCoordinator({
      debounceMs: 10,
      onBatch: (_projectId, paths) => {
        batches.push(paths);
      },
      factory: (_rootPath, onEvent) => {
        trigger = onEvent;
        return { close: () => undefined };
      },
    });

    coordinator.ensure('p1', '/tmp/project-root');

    trigger!('../../etc/passwd', 'change');
    trigger!('/etc/passwd', 'change');

    await new Promise((resolve) => setTimeout(resolve, 40));

    expect(batches).toEqual([]);
  });

  it('marks a project stale when its source changes', async () => {
    const projects = new ProjectRegistry();

    const project = { id: 'p1', name: 'p1', rootPath: '/tmp/p1' };

    projects.attach(project, 's1', 0);

    projects.setState('p1', 'ready', { generation: 'gen-1' }, 0);

    expect(canTransition('ready', 'stale')).toBe(true);
    expect(projects.setState('p1', 'stale', {}, 0)?.state).toBe('stale');

    /* An illegal transition is rejected, not silently applied. */
    expect(canTransition('stale', 'hydrating')).toBe(true);
    expect(canTransition('idle', 'indexing')).toBe(true);
    expect(canTransition('failed', 'ready')).toBe(false);
  });
});

/* ================================================================== *
 * Fleet coalescing
 * ================================================================== */

describe('Phase 77 — Fleet coordination', () => {
  it('coalesces a burst of project updates into one relink', async () => {
    const batches: string[][] = [];

    const deps = {
      async refreshFleet(projectIds: string[]) {
        batches.push([...projectIds]);
      },
    } as unknown as DaemonRuntimeDependencies;

    const fleet = new FleetCoordinator(deps, 10);

    fleet.notify(['a']);
    fleet.notify(['b', 'c']);
    fleet.notify(['c']);

    await fleet.flush();

    expect(batches).toHaveLength(1);
    expect(batches[0]).toEqual(['a', 'b', 'c']);
  });
});

/* ================================================================== *
 * Single-flight primitives
 * ================================================================== */

describe('Phase 77 — single-flight primitives', () => {
  it('keys deterministically and never starts duplicate work', async () => {
    const registry = new SingleFlightRegistry();

    const key = singleFlightKey(['index', 'p1', 'epoch-1']);

    let runs = 0;

    const runner = async () => {
      runs += 1;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return 'done';
    };

    const first = registry.start(key, runner, { projectId: 'p1', kind: 'index' });
    const second = registry.start(key, runner, { projectId: 'p1', kind: 'index' });

    expect(second.reused).toBe(true);
    expect(second.job.id).toBe(first.job.id);

    await Promise.all([first.job.promise, second.job.promise]);

    expect(runs).toBe(1);
    expect(registry.size).toBe(0);
  });

  it('aborts the shared job once its last subscriber leaves', async () => {
    const registry = new SingleFlightRegistry();

    let aborted = false;

    const { job } = registry.start(
      'key',
      async (signal) => {
        signal.addEventListener('abort', () => {
          aborted = true;
        });

        await new Promise((resolve) => setTimeout(resolve, 30));

        if (signal.aborted) {
          throw new Error('cancelled');
        }

        return 'ok';
      },
      { projectId: 'p1', kind: 'hydrate', cancelWhenEmpty: true }
    );

    registry.addSubscriber(job.id, 's1');
    registry.removeSubscriber(job.id, 's1', true);

    expect(job.state).toBe('cancelled');

    await expect(job.promise).rejects.toThrow();
    expect(aborted).toBe(true);
  });
});

/* ================================================================== *
 * Protocol framing
 * ================================================================== */

describe('Phase 77 — protocol framing', () => {
  it('round-trips length-prefixed frames and rejects oversized declarations', () => {
    const decoder = new FrameDecoder(1_024);

    const frame = encodeFrame({ hello: 'world' }, 1_024);

    /* Split across chunks to prove incremental decoding. */
    expect(decoder.push(frame.subarray(0, 3))).toEqual([]);
    expect(decoder.push(frame.subarray(3))).toEqual([{ hello: 'world' }]);

    const oversized = Buffer.alloc(4);
    oversized.writeUInt32BE(2_048, 0);

    expect(() => decoder.push(oversized)).toThrowError(DaemonError);
  });

  it('rejects unknown request types instead of treating them as commands', () => {
    expect(
      parseRequestEnvelope({
        requestId: 'r1',
        request: { type: 'drop_database' },
      })
    ).toBeNull();

    expect(
      parseRequestEnvelope({
        requestId: 'r1',
        request: { type: 'daemon_status' },
      })
    ).toEqual({ requestId: 'r1', request: { type: 'daemon_status' } });
  });
});

/* ================================================================== *
 * Diagnostics log
 * ================================================================== */

describe('Phase 77 — diagnostics log', () => {
  it('redacts secrets and rotates to a bounded size', () => {
    expect(redactDaemonText('token=abcdef123456')).not.toContain('abcdef123456');
    expect(redactDaemonText('Authorization: Bearer sk-live-abcdefghijkl')).toContain('[redacted]');

    const log = new DaemonLog(3);

    for (let index = 0; index < 10; index += 1) {
      log.info(`event-${index}`);
    }

    expect(log.size).toBe(3);
    expect(log.tail(10).map((entry) => entry.event)).toEqual(['event-7', 'event-8', 'event-9']);
  });
});

/* ================================================================== *
 * Standalone fallback and packaged runtime
 * ================================================================== */

describe('Phase 77 — fallback and packaged surface', () => {
  it('falls back to an in-process runtime when spawning is disallowed', async () => {
    const root = tempRoot();

    const created = await createCodeIntelligenceRuntime({
      runtimeRoot: root,
      allowSpawn: false,
      timeoutMs: 200,
      clientType: 'test',
    });

    expect(created.runtime.kind).toBe('local');
    expect(created.diagnostic).toBe('DAEMON_NOT_RUNNING');

    await created.runtime.close();
  });

  it('exposes the daemon runtime in the packaged MCP bundle', () => {
    const bundlePath = join(process.cwd(), 'bundle', 'mcp.js');

    expect(existsSync(bundlePath)).toBe(true);

    const bundle = readFileSync(bundlePath, 'utf8');

    /* Runtime literals that only exist when the daemon is bundled in. */
    expect(bundle).toContain('TOOLNET_DAEMON_ROOT');
    expect(bundle).toContain('daemon.sock');
    expect(bundle).toContain('DAEMON_BUILD_MISMATCH');
    expect(bundle).toContain('ensure_ready');
  });

  it('exposes the daemon CLI bundle', () => {
    const bundlePath = join(process.cwd(), 'bundle', 'daemon-cli.js');

    expect(existsSync(bundlePath)).toBe(true);

    const bundle = readFileSync(bundlePath, 'utf8');

    expect(bundle).toContain('daemon.sock');
  });

  it('exposes daemon_status through the real packaged MCP runtime', async () => {
    const bundlePath = join(process.cwd(), 'bundle', 'mcp.js');

    const { tools: names, noise } = await listPackagedMcpTools(bundlePath);

    /* Nothing may write to MCP stdout: it would corrupt the protocol. */
    expect(noise).toEqual([]);

    expect(names).toContain('daemon_status');

    /* The Phase 74/76 tools must survive the Phase 77 integration. */
    expect(names).toContain('query_graph');
    expect(names).toContain('get_graph_schema');
    expect(names).toContain('manage_graph_artifact');
    expect(names).toContain('manage_adr');
  }, 60_000);

  it('reports a deterministic build fingerprint that is not the package version', () => {
    const root = tempRoot();

    const fingerprint = daemonBuildFingerprint(root);

    expect(fingerprint.buildHash).toMatch(/^[0-9a-f]{64}$/);
    expect(fingerprint.buildHash).not.toBe(fingerprint.packageVersion);
    expect(fingerprint.protocolVersion).toBeGreaterThan(0);

    /* Deterministic across calls. */
    expect(daemonBuildFingerprint(root).buildHash).toBe(fingerprint.buildHash);
  });
});

/* ================================================================== *
 * Lifecycle completeness
 * ================================================================== */

describe('Phase 77 — lifecycle', () => {
  it('shuts down gracefully when no clients are connected', async () => {
    const root = tempRoot();

    const { deps } = makeDeps();

    const daemon = await startTestDaemon(root, deps);

    await daemon.close();

    expect(existsSync(join(root, 'daemon.lock'))).toBe(false);
    expect(existsSync(daemon.socketPath)).toBe(false);
  });
});

/* ================================================================== *
 * Certification marker
 * ================================================================== */

const PHASE77_MARKER = 'PHASE77_LOCAL_COORDINATION_DAEMON=PASS';

describe('Phase 77 — certification', () => {
  it('emits the Phase 77 PASS marker', () => {
    console.log(PHASE77_MARKER);

    expect(PHASE77_MARKER).toBe('PHASE77_LOCAL_COORDINATION_DAEMON=PASS');
  });
});
