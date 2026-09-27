/*
 * Phase 77 — local coordination daemon server.
 *
 * Local IPC only (Unix domain socket / Windows named pipe). There is no TCP
 * listener, no HTTP surface and no remote protocol.
 */

import { randomBytes } from 'node:crypto';

import { existsSync, unlinkSync, writeFileSync } from 'node:fs';

import { createServer, type Server, type Socket } from 'node:net';

import {
  ArtifactCoordinator,
  FleetCoordinator,
  IndexCoordinator,
  ProjectRuntimeCoordinator,
} from './coordinators.js';

import { resolveDaemonLimits, type DaemonLimits } from './limits.js';

import { daemonBuildFingerprint } from './fingerprint.js';

import {
  acquireDaemonInstanceLock,
  readDaemonLockOwner,
  type InstanceLockHandle,
} from './instance-lock.js';

import { DaemonLog } from './log.js';

import {
  daemonLockPath,
  daemonRuntimeRoot,
  daemonSocketPath,
  daemonStatePath,
  ensureSecureRuntimeDirectory,
} from './paths.js';

import { FrameDecoder, encodeFrame, parseRequestEnvelope } from './protocol.js';

import { ProjectRegistry, SessionRegistry } from './registry.js';

import { singleFlightKey, type SingleFlightJob } from './single-flight.js';

import {
  DAEMON_PROTOCOL_VERSION,
  DaemonError,
  type DaemonBuildFingerprint,
  type DaemonDiagnosticCode,
  type DaemonInstanceInfo,
  type DaemonProjectRef,
  type DaemonProjectStatus,
  type DaemonRequest,
  type DaemonResponse,
  type DaemonRuntimeDependencies,
  type DaemonServerMessage,
  type DaemonStatusReport,
  type ProjectRuntimeState,
} from './types.js';

import { WatcherCoordinator } from './watcher-coordinator.js';

export interface StartDaemonOptions {
  deps: DaemonRuntimeDependencies;
  runtimeRoot?: string;
  socketPath?: string;
  limits?: Partial<DaemonLimits>;
  fingerprint?: DaemonBuildFingerprint;
  instanceId?: string;
  /** Test seam: caller already holds the lock. */
  skipLock?: boolean;
  /** Skip creating the shared watcher coordinator (tests without real fs events). */
  disableWatchers?: boolean;
  now?: () => number;
}

export interface DaemonCloseOptions {
  force?: boolean;
}

export interface DaemonHandle {
  instance: DaemonInstanceInfo;
  fingerprint: DaemonBuildFingerprint;
  socketPath: string;
  runtimeRoot: string;

  limits: DaemonLimits;

  sessions: SessionRegistry;
  projects: ProjectRegistry;
  watchers: WatcherCoordinator;
  index: IndexCoordinator;
  artifact: ArtifactCoordinator;
  fleet: FleetCoordinator;
  runtime: ProjectRuntimeCoordinator;
  log: DaemonLog;

  stats(): DaemonStatusReport;
  close(options?: DaemonCloseOptions): Promise<void>;
  /** Wait for the server to accept no further work (draining). */
  isDraining(): boolean;
}

interface ConnectionState {
  id: string;
  socket: Socket;
  decoder: FrameDecoder;
  sessionId?: string;
  outstanding: number;
  subscriptions: Set<string>;
  queue: Buffer[];
  queueBytes: number;
  droppedProgress: number;
  closed: boolean;
}

const MAX_DIAGNOSTICS = 32;

export async function startDaemon(options: StartDaemonOptions): Promise<DaemonHandle> {
  const limits = resolveDaemonLimits(options.limits);

  const runtimeRoot = options.runtimeRoot ?? daemonRuntimeRoot();

  ensureSecureRuntimeDirectory(runtimeRoot);

  const socketPath = options.socketPath ?? daemonSocketPath(runtimeRoot);

  const fingerprint = options.fingerprint ?? daemonBuildFingerprint(runtimeRoot);

  const now = options.now ?? (() => Date.now());

  const instanceId = options.instanceId ?? `daemon-${randomBytes(8).toString('hex')}`;

  const startedAt = new Date(now()).toISOString();

  const log = new DaemonLog(limits.maxLogLines);

  const sessions = new SessionRegistry({
    heartbeatTimeoutMs: limits.heartbeatTimeoutMs,
    maxClients: limits.maxClients,
  });

  const projects = new ProjectRegistry();

  const connections = new Map<string, ConnectionState>();

  const connectionsBySession = new Map<string, ConnectionState>();

  const diagnostics = new Set<DaemonDiagnosticCode>();

  let draining = false;

  let droppedProgressTotal = 0;

  let lock: InstanceLockHandle | undefined;

  /* ---------------------------------------------------------------- *
   * Outbound
   * ---------------------------------------------------------------- */

  const flush = (connection: ConnectionState): void => {
    if (connection.closed || connection.queueBytes === 0) {
      return;
    }

    const payload = Buffer.concat(connection.queue);

    connection.queue = [];
    connection.queueBytes = 0;

    connection.socket.write(payload);
  };

  const send = (connection: ConnectionState, message: DaemonServerMessage): void => {
    if (connection.closed) {
      return;
    }

    let frame: Buffer;

    try {
      frame = encodeFrame(message, limits.maxMessageBytes);
    } catch {
      return;
    }

    /**
     * Backpressure: a slow client must never block the daemon or other
     * sessions. Progress events are coalesced/dropped; responses and final job
     * states are never dropped.
     */
    const isProgress = 'kind' in message && message.kind === 'progress';

    if (isProgress && connection.queueBytes + frame.byteLength > limits.maxOutboundQueueBytes) {
      connection.droppedProgress += 1;
      droppedProgressTotal += 1;
      return;
    }

    connection.queue.push(frame);
    connection.queueBytes += frame.byteLength;

    flush(connection);
  };

  const reply = (
    connection: ConnectionState,
    requestId: string,
    response: DaemonResponse
  ): void => {
    send(connection, { requestId, response });
  };

  const fail = (
    connection: ConnectionState,
    requestId: string,
    code: DaemonDiagnosticCode,
    error: string,
    extra: Partial<{ daemonBuildHash: string; clientBuildHash: string }> = {}
  ): void => {
    diagnostics.add(code);
    reply(connection, requestId, { ok: false, code, error, ...extra });
  };

  /* ---------------------------------------------------------------- *
   * Coordination
   * ---------------------------------------------------------------- */

  const onCoordinatorEvent = (
    job: SingleFlightJob,
    event: import('./types.js').DaemonProgressEvent
  ): void => {
    for (const sessionId of job.subscribers) {
      const connection = connectionsBySession.get(sessionId);

      if (!connection || !connection.subscriptions.has(job.id)) {
        continue;
      }

      send(connection, { kind: 'progress', event });
    }
  };

  const index = new IndexCoordinator(options.deps, projects, { onEvent: onCoordinatorEvent });

  const artifact = new ArtifactCoordinator(options.deps, projects, { onEvent: onCoordinatorEvent });

  const fleet = new FleetCoordinator(options.deps);

  const runtime = new ProjectRuntimeCoordinator(options.deps, projects, index, artifact);

  const watchers = new WatcherCoordinator({
    debounceMs: limits.watcherDebounceMs,
    maxBatch: limits.maxWatcherBatch,
    onBatch: (projectId, paths) => {
      const record = projects.get(projectId);

      if (!record) {
        return;
      }

      /* A new source epoch invalidates the current generation. */
      projects.setState(projectId, 'stale');

      log.info('watcher.batch', `${projectId} (${paths.length} paths)`);

      /* Indexing is intentionally NOT auto-started unless a session asks. */
    },
  });

  /* ---------------------------------------------------------------- *
   * Session lifecycle
   * ---------------------------------------------------------------- */

  const detachSession = (sessionId: string): void => {
    for (const record of projects.forSession(sessionId)) {
      projects.detach(record.projectId, sessionId);

      if (projects.get(record.projectId)?.sessions.size === 0) {
        watchers.release(record.projectId);
      }
    }

    connectionsBySession.delete(sessionId);
  };

  const reaper = setInterval(
    () => {
      const removed = sessions.reapStale(now());

      for (const sessionId of removed) {
        log.warn('session.reaped', sessionId);
        detachSession(sessionId);
      }
    },
    Math.max(1_000, Math.floor(limits.heartbeatTimeoutMs / 4))
  );

  reaper.unref?.();

  const evictor = setInterval(
    () => {
      const candidates = projects.evictionCandidates({
        maxResident: limits.maxResidentProjects,
        idleMs: limits.idleEvictionMs,
        now: now(),
      });

      for (const projectId of candidates) {
        const record = projects.get(projectId);

        if (!record) {
          continue;
        }

        watchers.release(projectId);

        void Promise.resolve(options.deps.releaseProject(projectId)).catch(() => undefined);

        projects.markResident(projectId, false);

        projects.removeIfUnused(projectId);

        fleet.notify([projectId]);

        log.info('project.evicted', projectId);
      }
    },
    Math.max(1_000, Math.floor(limits.idleEvictionMs / 2))
  );

  evictor.unref?.();

  /* ---------------------------------------------------------------- *
   * Request dispatch
   * ---------------------------------------------------------------- */

  const respondStatus = (connection: ConnectionState, requestId: string): void => {
    reply(connection, requestId, { ok: true, type: 'daemon_status', status: buildStats() });
  };

  const buildStats = (): DaemonStatusReport => {
    const memory = process.memoryUsage();

    return {
      instance: {
        instanceId,
        pid: process.pid,
        startedAt,
        socketPath,
        runtimeRoot,
        protocolVersion: DAEMON_PROTOCOL_VERSION,
        buildHash: fingerprint.buildHash,
      },
      uptimeMs: Math.max(0, now() - Date.parse(startedAt)),
      fingerprint,
      sessions: sessions.size,
      projects: projects.size,
      activeJobs: index.activeCount + artifact.activeCount,
      residentProjects: projects
        .list()
        .filter((record) => record.resident)
        .map((record) => record.projectId),
      watchers: watchers.size,
      draining,
      droppedProgress: droppedProgressTotal,
      memory: {
        rssBytes: memory.rss,
        heapUsedBytes: memory.heapUsed,
      },
      diagnostics: [...diagnostics].slice(0, MAX_DIAGNOSTICS),
    };
  };

  const projectStatus = (projectId: string): DaemonProjectStatus | undefined => {
    const record = projects.get(projectId);

    if (!record) {
      return undefined;
    }

    return {
      projectId: record.projectId,
      state: record.state,
      ...(record.generation ? { generation: record.generation } : {}),
      ...(record.sourceManifestHash ? { sourceManifestHash: record.sourceManifestHash } : {}),
      sessions: [...record.sessions].sort(),
      watcherActive: record.watcherActive,
      ...(record.activeJobId ? { activeJobId: record.activeJobId } : {}),
      resident: record.resident,
      updatedAt: record.updatedAt,
      diagnostics: [...record.diagnostics],
    };
  };

  const attachWatcher = (project: DaemonProjectRef): void => {
    if (options.disableWatchers) {
      const record = projects.get(project.id);
      if (record) {
        record.watcherActive = true;
      }
      return;
    }

    const created = watchers.ensure(project.id, project.rootPath);

    const record = projects.get(project.id);

    if (record) {
      record.watcherActive = true;
      if (created) {
        log.info('watcher.start', project.id);
      }
    }
  };

  const requireSession = (connection: ConnectionState, requestId: string): string | undefined => {
    const sessionId = connection.sessionId;

    if (!sessionId || !sessions.get(sessionId)) {
      fail(connection, requestId, 'SESSION_UNKNOWN', 'No registered session for this connection.');
      return undefined;
    }

    return sessionId;
  };

  const handleJobStart = (
    connection: ConnectionState,
    requestId: string,
    project: DaemonProjectRef,
    sessionId: string,
    kind: 'index' | 'hydrate'
  ): void => {
    const started =
      kind === 'index' ? index.start(project, sessionId) : artifact.start(project, sessionId);

    const job = started.job;

    /* Progress is only forwarded to sessions that asked for it. */

    void job.promise.then(
      (result: unknown) => {
        /* Index/hydration always changes the Fleet pin. */
        fleet.notify([project.id]);

        reply(connection, requestId, {
          ok: true,
          type: 'job_result',
          jobId: job.id,
          jobKind: kind,
          projectId: project.id,
          state: 'complete',
          generation: (result as { generation?: string }).generation,
          ...(kind === 'index'
            ? {
                files: (result as { files?: number }).files,
                symbols: (result as { symbols?: number }).symbols,
                edges: (result as { edges?: number }).edges,
              }
            : {
                hidrated: true,
                fleetRepinned: (result as { fleetRepinned?: boolean }).fleetRepinned,
              }),
        });
      },
      (error: unknown) => {
        fail(
          connection,
          requestId,
          kind === 'index' ? 'PROJECT_RUNTIME_FAILED' : 'ARTIFACT_HYDRATION_FAILED',
          error instanceof Error ? error.message : String(error)
        );
      }
    );
  };

  const dispatch = async (
    connection: ConnectionState,
    requestId: string,
    request: DaemonRequest
  ): Promise<void> => {
    if (draining && request.type !== 'daemon_status' && request.type !== 'shutdown') {
      fail(connection, requestId, 'DAEMON_SHUTTING_DOWN', 'The daemon is shutting down.');
      return;
    }

    switch (request.type) {
      case 'hello': {
        if (request.protocolVersion !== DAEMON_PROTOCOL_VERSION) {
          fail(
            connection,
            requestId,
            'DAEMON_PROTOCOL_MISMATCH',
            `Daemon protocol v${DAEMON_PROTOCOL_VERSION} cannot serve protocol v${request.protocolVersion}.`
          );
          return;
        }

        if (request.fingerprint !== fingerprint.buildHash) {
          fail(
            connection,
            requestId,
            'DAEMON_BUILD_MISMATCH',
            'Client build fingerprint does not match the running daemon.',
            {
              daemonBuildHash: fingerprint.buildHash,
              clientBuildHash: request.fingerprint,
            }
          );
          return;
        }

        if (connection.sessionId) {
          /* Idempotent re-hello on an already-registered connection. */
          reply(connection, requestId, {
            ok: true,
            type: 'hello',
            sessionId: connection.sessionId,
            instance: buildStats().instance,
            fingerprint,
            heartbeatIntervalMs: limits.heartbeatIntervalMs,
          });
          return;
        }

        let session;

        try {
          session = sessions.register(request.client, request.fingerprint, now());
        } catch {
          fail(connection, requestId, 'CLIENT_LIMIT_EXCEEDED', 'Maximum daemon clients reached.');
          return;
        }

        connection.sessionId = session.sessionId;

        connectionsBySession.set(session.sessionId, connection);

        log.info('session.register', `${session.sessionId} (${request.client.type})`);

        reply(connection, requestId, {
          ok: true,
          type: 'hello',
          sessionId: session.sessionId,
          instance: buildStats().instance,
          fingerprint,
          heartbeatIntervalMs: limits.heartbeatIntervalMs,
        });
        return;
      }

      case 'daemon_status': {
        respondStatus(connection, requestId);
        return;
      }

      case 'heartbeat': {
        if (!sessions.touch(request.sessionId, now())) {
          fail(connection, requestId, 'SESSION_UNKNOWN', 'Unknown session.');
          return;
        }

        reply(connection, requestId, { ok: true, type: 'ack' });
        return;
      }

      case 'attach_project': {
        const sessionId = requireSession(connection, requestId);

        if (!sessionId || sessionId !== request.sessionId) {
          if (sessionId) {
            fail(connection, requestId, 'SESSION_UNKNOWN', 'Session does not match connection.');
          }
          return;
        }

        const { record, attached } = projects.attach(request.project, sessionId, now());

        if (!record.sessions.has(sessionId)) {
          record.sessions.add(sessionId);
        }

        attachWatcher(request.project);

        if (attached) {
          log.info('project.attach', request.project.id);
        }

        reply(connection, requestId, {
          ok: true,
          type: 'project_status',
          status: projectStatus(request.project.id)!,
        });
        return;
      }

      case 'detach_project': {
        const sessionId = requireSession(connection, requestId);

        if (!sessionId) {
          return;
        }

        projects.detach(request.projectId, sessionId, now());

        if (projects.get(request.projectId)?.sessions.size === 0) {
          watchers.release(request.projectId);
        }

        reply(connection, requestId, { ok: true, type: 'ack' });
        return;
      }

      case 'project_status': {
        const sessionId = requireSession(connection, requestId);

        if (!sessionId) {
          return;
        }

        const status = projectStatus(request.project.id);

        if (!status) {
          fail(connection, requestId, 'PROJECT_NOT_ATTACHED', 'Project is not attached.');
          return;
        }

        reply(connection, requestId, { ok: true, type: 'project_status', status });
        return;
      }

      case 'ensure_ready': {
        const sessionId = requireSession(connection, requestId);

        if (!sessionId) {
          return;
        }

        const { record } = projects.attach(request.project, sessionId, now());

        if (!record.sessions.has(sessionId)) {
          record.sessions.add(sessionId);
        }

        attachWatcher(request.project);

        try {
          const ready = await runtime.ensureReady(request.project, sessionId);

          reply(connection, requestId, {
            ok: true,
            type: 'job_result',
            jobId: ready.jobId ?? 'inline',
            jobKind: ready.via === 'hydrated' ? 'hydrate' : 'index',
            projectId: request.project.id,
            state: 'complete',
            ...(ready.generation ? { generation: ready.generation } : {}),
          });
        } catch (error) {
          fail(
            connection,
            requestId,
            'PROJECT_RUNTIME_FAILED',
            error instanceof Error ? error.message : String(error)
          );
        }
        return;
      }

      case 'index_project': {
        const sessionId = requireSession(connection, requestId);

        if (!sessionId) {
          return;
        }

        projects.attach(request.project, sessionId, now());

        attachWatcher(request.project);

        handleJobStart(connection, requestId, request.project, sessionId, 'index');
        return;
      }

      case 'hydrate_artifact': {
        const sessionId = requireSession(connection, requestId);

        if (!sessionId) {
          return;
        }

        projects.attach(request.project, sessionId, now());

        handleJobStart(connection, requestId, request.project, sessionId, 'hydrate');
        return;
      }

      case 'artifact_status': {
        const sessionId = requireSession(connection, requestId);

        if (!sessionId) {
          return;
        }

        try {
          const status = await options.deps.artifactStatus(request.project);

          reply(connection, requestId, { ok: true, type: 'artifact_status', status });
        } catch (error) {
          fail(
            connection,
            requestId,
            'ARTIFACT_HYDRATION_FAILED',
            error instanceof Error ? error.message : String(error)
          );
        }
        return;
      }

      case 'query': {
        const sessionId = requireSession(connection, requestId);

        if (!sessionId) {
          return;
        }

        projects.attach(request.project, sessionId, now());

        try {
          const result = await runtime.query(request.project, sessionId, {
            query: request.query,
            ...(request.scope ? { scope: request.scope } : {}),
            ...(request.parameters ? { parameters: request.parameters } : {}),
            ...(request.limit !== undefined ? { limit: request.limit } : {}),
            ...(request.cursor ? { cursor: request.cursor } : {}),
            ...(request.explain !== undefined ? { explain: request.explain } : {}),
          });

          reply(connection, requestId, { ok: true, type: 'query', result });
        } catch (error) {
          fail(
            connection,
            requestId,
            'QUERY_FAILED',
            error instanceof Error ? error.message : String(error)
          );
        }
        return;
      }

      case 'evidence': {
        const sessionId = requireSession(connection, requestId);

        if (!sessionId) {
          return;
        }

        projects.attach(request.project, sessionId, now());

        try {
          const bundle = await runtime.evidence(request.project, sessionId, request.evidence);

          reply(connection, requestId, { ok: true, type: 'evidence', bundle });
        } catch (error) {
          fail(
            connection,
            requestId,
            'PROJECT_RUNTIME_FAILED',
            error instanceof Error ? error.message : String(error)
          );
        }
        return;
      }

      case 'ingest_traces': {
        const sessionId = requireSession(connection, requestId);

        if (!sessionId) {
          return;
        }

        projects.attach(request.project, sessionId, now());

        try {
          const result = await runtime.ingestTraces(request.project, sessionId, request.ingest);

          reply(connection, requestId, { ok: true, type: 'ingest_traces', result });
        } catch (error) {
          fail(
            connection,
            requestId,
            'PROJECT_RUNTIME_FAILED',
            error instanceof Error ? error.message : String(error)
          );
        }
        return;
      }

      case 'change': {
        const sessionId = requireSession(connection, requestId);

        if (!sessionId) {
          return;
        }

        projects.attach(request.project, sessionId, now());

        try {
          const report = await runtime.change(request.project, sessionId, request.change);

          reply(connection, requestId, { ok: true, type: 'change', report });
        } catch (error) {
          fail(
            connection,
            requestId,
            'PROJECT_RUNTIME_FAILED',
            error instanceof Error ? error.message : String(error)
          );
        }
        return;
      }

      case 'contract': {
        const sessionId = requireSession(connection, requestId);

        if (!sessionId) {
          return;
        }

        projects.attach(request.project, sessionId, now());

        try {
          const report = await runtime.contract(request.project, sessionId, request.contract);

          reply(connection, requestId, { ok: true, type: 'contract', report });
        } catch (error) {
          fail(
            connection,
            requestId,
            'PROJECT_RUNTIME_FAILED',
            error instanceof Error ? error.message : String(error)
          );
        }
        return;
      }

      case 'test_selection': {
        const sessionId = requireSession(connection, requestId);

        if (!sessionId) {
          return;
        }

        projects.attach(request.project, sessionId, now());

        try {
          const selection = await runtime.testSelection(
            request.project,
            sessionId,
            request.selection
          );

          reply(connection, requestId, { ok: true, type: 'test_selection', selection });
        } catch (error) {
          fail(
            connection,
            requestId,
            'PROJECT_RUNTIME_FAILED',
            error instanceof Error ? error.message : String(error)
          );
        }
        return;
      }

      case 'run_tests': {
        const sessionId = requireSession(connection, requestId);

        if (!sessionId) {
          return;
        }

        projects.attach(request.project, sessionId, now());

        try {
          const verification = await runtime.runTests(request.project, sessionId, request.run);

          reply(connection, requestId, { ok: true, type: 'run_tests', verification });
        } catch (error) {
          fail(
            connection,
            requestId,
            'PROJECT_RUNTIME_FAILED',
            error instanceof Error ? error.message : String(error)
          );
        }
        return;
      }

      case 'test_status': {
        const sessionId = requireSession(connection, requestId);

        if (!sessionId) {
          return;
        }

        projects.attach(request.project, sessionId, now());

        try {
          const status = await runtime.testStatus(request.project, sessionId, request.limit);

          reply(connection, requestId, { ok: true, type: 'test_status', status });
        } catch (error) {
          fail(
            connection,
            requestId,
            'PROJECT_RUNTIME_FAILED',
            error instanceof Error ? error.message : String(error)
          );
        }
        return;
      }

      case 'subscribe_progress': {
        const sessionId = requireSession(connection, requestId);

        if (!sessionId) {
          return;
        }

        if (connection.subscriptions.size >= limits.maxSubscriptionsPerClient) {
          fail(connection, requestId, 'REQUEST_LIMIT_EXCEEDED', 'Subscription limit reached.');
          return;
        }

        const job = index.get(request.jobId) ?? artifact.get(request.jobId);

        if (!job) {
          fail(connection, requestId, 'INVALID_REQUEST', 'Unknown job id.');
          return;
        }

        index.addSubscriber(request.jobId, sessionId);
        artifact.addSubscriber(request.jobId, sessionId);

        connection.subscriptions.add(request.jobId);

        reply(connection, requestId, { ok: true, type: 'ack' });
        return;
      }

      case 'unsubscribe_progress': {
        const sessionId = requireSession(connection, requestId);

        if (!sessionId) {
          return;
        }

        connection.subscriptions.delete(request.jobId);

        index.removeSubscriber(request.jobId, sessionId);
        artifact.removeSubscriber(request.jobId, sessionId);

        reply(connection, requestId, { ok: true, type: 'ack' });
        return;
      }

      case 'cancel_job': {
        const sessionId = requireSession(connection, requestId);

        if (!sessionId) {
          return;
        }

        const cancelled = index.cancel(request.jobId) || artifact.cancel(request.jobId);

        reply(connection, requestId, { ok: true, type: 'ack' });

        if (!cancelled) {
          diagnostics.add('INVALID_REQUEST');
        }
        return;
      }

      case 'shutdown': {
        const requester = connection.sessionId;

        const others = sessions.list().filter((session) => session.sessionId !== requester);

        if (!request.force && others.length > 0) {
          fail(
            connection,
            requestId,
            'DAEMON_UPGRADE_BLOCKED_ACTIVE_SESSIONS',
            'Other sessions are active; a forced shutdown is required.'
          );
          return;
        }

        reply(connection, requestId, { ok: true, type: 'shutdown', accepted: true });

        log.info('daemon.shutdown', request.force ? 'forced' : 'graceful');

        void closeDaemon({ force: request.force });
        return;
      }

      default: {
        fail(connection, requestId, 'INVALID_REQUEST', 'Unsupported daemon request.');
      }
    }
  };

  /* ---------------------------------------------------------------- *
   * Server
   * ---------------------------------------------------------------- */

  const server: Server = createServer((socket: Socket) => {
    const connection: ConnectionState = {
      id: `conn-${randomBytes(4).toString('hex')}`,
      socket,
      decoder: new FrameDecoder(limits.maxMessageBytes),
      outstanding: 0,
      subscriptions: new Set(),
      queue: [],
      queueBytes: 0,
      droppedProgress: 0,
      closed: false,
    };

    connections.set(connection.id, connection);

    socket.on('data', (chunk: Buffer) => {
      let messages: unknown[];

      try {
        messages = connection.decoder.push(chunk);
      } catch (error) {
        const code = error instanceof DaemonError ? error.code : ('PROTOCOL_MALFORMED' as const);

        diagnostics.add(code);

        socket.destroy();

        return;
      }

      for (const message of messages) {
        const envelope = parseRequestEnvelope(message);

        if (!envelope) {
          diagnostics.add('PROTOCOL_MALFORMED');

          socket.destroy();

          return;
        }

        if (connection.outstanding >= limits.maxOutstandingRequests) {
          fail(
            connection,
            envelope.requestId,
            'REQUEST_LIMIT_EXCEEDED',
            'Too many outstanding requests.'
          );
          continue;
        }

        connection.outstanding += 1;

        void dispatch(connection, envelope.requestId, envelope.request)
          .catch(() => undefined)
          .finally(() => {
            connection.outstanding -= 1;
          });
      }
    });

    const cleanup = (): void => {
      if (connection.closed) {
        return;
      }

      connection.closed = true;

      connections.delete(connection.id);

      if (connection.sessionId) {
        const sessionId = connection.sessionId;

        sessions.remove(sessionId);

        detachSession(sessionId);

        log.info('session.disconnect', sessionId);
      }
    };

    socket.on('close', cleanup);
    socket.on('error', cleanup);
  });

  if (!options.skipLock) {
    const lockPath = daemonLockPath(runtimeRoot);

    lock = await acquireDaemonInstanceLock({
      lockPath,
      owner: {
        instanceId,
        pid: process.pid,
        startedAt,
        socketPath,
        fingerprint: fingerprint.buildHash,
      },
      probe: async (owner) => {
        const existing = readDaemonLockOwner(lockPath);

        if (!existing || existing.instanceId !== owner.instanceId) {
          return false;
        }

        /* A socket that answers daemon_status proves this instance is alive. */
        const { probeDaemon } = await import('./client.js');

        return probeDaemon({
          socketPath: owner.socketPath,
          fingerprint: owner.fingerprint,
          timeoutMs: 500,
        });
      },
    });
  }

  if (existsSync(socketPath)) {
    /* Only unlink when no live daemon answered; the lock already proved that. */
    try {
      unlinkSync(socketPath);
    } catch {
      /* Ignore. */
    }
  }

  await new Promise<void>((resolveListen, rejectListen) => {
    const onError = (error: Error) => {
      rejectListen(error);
    };

    server.once('error', onError);

    server.listen(socketPath, () => {
      server.off('error', onError);

      resolveListen();
    });
  });

  try {
    writeFileSync(daemonStatePath(runtimeRoot), JSON.stringify(buildStats(), null, 2));
  } catch {
    /* Diagnostics only. */
  }

  log.info('daemon.start', `${instanceId} at ${socketPath}`);

  let closed = false;

  async function closeDaemon(closeOptions: DaemonCloseOptions = {}): Promise<void> {
    if (closed) {
      return;
    }

    closed = true;
    draining = true;

    clearInterval(reaper);
    clearInterval(evictor);
    fleet.close();

    /* Stop accepting new connections. */
    const listeners: ConnectionState[] = [...connections.values()];

    for (const connection of listeners) {
      if (!closeOptions.force) {
        /* Let in-flight responses flush before the socket closes. */
        continue;
      }

      connection.socket.destroy();
    }

    const pendingJobs = [...index.list(), ...artifact.list()];

    if (!closeOptions.force) {
      const deadline = Date.now() + limits.gracefulShutdownMs;

      while (pendingJobs.some((job) => job.state === 'running') && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    }

    for (const job of [...index.list(), ...artifact.list()]) {
      index.cancel(job.id);
      artifact.cancel(job.id);
    }

    await new Promise<void>((resolveClose) => {
      server.close(() => {
        resolveClose();
      });
    });

    watchers.releaseAll();

    if (!closeOptions.force) {
      /* Give already-queued responses a chance to reach the kernel buffer. */
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    for (const connection of connections.values()) {
      connection.closed = true;
      connection.socket.destroy();
    }

    connections.clear();

    if (existsSync(socketPath)) {
      try {
        unlinkSync(socketPath);
      } catch {
        /* Ignore. */
      }
    }

    lock?.release();

    log.info('daemon.stop', instanceId);
  }

  return {
    instance: {
      instanceId,
      pid: process.pid,
      startedAt,
      socketPath,
      runtimeRoot,
      protocolVersion: DAEMON_PROTOCOL_VERSION,
      buildHash: fingerprint.buildHash,
    },
    fingerprint,
    socketPath,
    runtimeRoot,
    limits,
    sessions,
    projects,
    watchers,
    index,
    artifact,
    fleet,
    runtime,
    log,
    stats: buildStats,
    close: closeDaemon,
    isDraining: () => draining,
  };
}

export type { ProjectRuntimeState };

export { singleFlightKey };
