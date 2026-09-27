/*
 * Phase 77 — daemon client.
 *
 * A client connects over the local socket, performs the build/protocol
 * admission handshake and then multiplexes typed requests with request ids.
 */

import { randomBytes } from 'node:crypto';

import { createConnection, type Socket } from 'node:net';

import { daemonBuildFingerprint } from './fingerprint.js';

import { FrameDecoder, encodeFrame, parseServerMessage } from './protocol.js';

import { daemonRuntimeRoot } from './paths.js';

import {
  DAEMON_PROTOCOL_VERSION,
  DaemonError,
  type DaemonBuildFingerprint,
  type DaemonClientIdentity,
  type DaemonInstanceInfo,
  type DaemonProgressEvent,
  type DaemonRequest,
  type DaemonResponse,
  type DaemonStatusResponse,
} from './types.js';

export interface DaemonClientOptions {
  socketPath: string;
  runtimeRoot?: string;
  client: DaemonClientIdentity;
  /** Explicit fingerprint override (used to prove the admission barrier). */
  fingerprint?: string;
  protocolVersion?: number;
  timeoutMs?: number;
  /** Disable the automatic heartbeat (tests / short-lived clients). */
  heartbeat?: boolean;
}

export type ProgressListener = (event: DaemonProgressEvent) => void;

interface Pending {
  resolve: (response: DaemonResponse) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

let requestCounter = 0;

function nextRequestId(): string {
  requestCounter += 1;
  return `req-${requestCounter.toString(36)}-${randomBytes(4).toString('hex')}`;
}

export class DaemonClient {
  readonly sessionId: string;
  readonly instance: DaemonInstanceInfo;
  readonly fingerprint: DaemonBuildFingerprint;
  readonly heartbeatIntervalMs: number;

  private readonly pending = new Map<string, Pending>();

  private readonly progressListeners = new Set<ProgressListener>();

  private heartbeatTimer?: NodeJS.Timeout;

  private closed = false;

  constructor(
    private readonly socket: Socket,
    private readonly decoder: FrameDecoder,
    handshake: {
      sessionId: string;
      instance: DaemonInstanceInfo;
      fingerprint: DaemonBuildFingerprint;
      heartbeatIntervalMs: number;
    },
    private readonly options: DaemonClientOptions
  ) {
    this.sessionId = handshake.sessionId;
    this.instance = handshake.instance;
    this.fingerprint = handshake.fingerprint;
    this.heartbeatIntervalMs = handshake.heartbeatIntervalMs;

    socket.on('data', (chunk: Buffer) => {
      this.onData(chunk);
    });

    socket.on('close', () => {
      this.onClosed(new Error('Daemon connection closed.'));
    });

    socket.on('error', (error) => {
      this.onClosed(error);
    });
  }

  get isClosed(): boolean {
    return this.closed;
  }

  onProgress(listener: ProgressListener): () => void {
    this.progressListeners.add(listener);
    return () => {
      this.progressListeners.delete(listener);
    };
  }

  private onData(chunk: Buffer): void {
    let messages: unknown[];

    try {
      messages = this.decoder.push(chunk);
    } catch {
      this.onClosed(new Error('Daemon sent a malformed frame.'));
      return;
    }

    for (const raw of messages) {
      const message = parseServerMessage(raw);

      if (!message) {
        continue;
      }

      if ('kind' in message && message.kind === 'progress') {
        for (const listener of this.progressListeners) {
          listener(message.event);
        }
        continue;
      }

      const envelope = message as { requestId: string; response: DaemonResponse };

      const pending = this.pending.get(envelope.requestId);

      if (!pending) {
        continue;
      }

      this.pending.delete(envelope.requestId);

      clearTimeout(pending.timer);

      pending.resolve(envelope.response);
    }
  }

  private onClosed(error: Error): void {
    if (this.closed) {
      return;
    }

    this.closed = true;

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      delete this.heartbeatTimer;
    }

    for (const [requestId, pending] of this.pending) {
      this.pending.delete(requestId);
      clearTimeout(pending.timer);
      pending.reject(error);
    }

    if (!this.socket.destroyed) {
      this.socket.destroy();
    }
  }

  /** Send a request and await its typed response. */
  async request(
    request: DaemonRequest,
    timeoutMs = this.options.timeoutMs ?? 30_000
  ): Promise<DaemonResponse> {
    if (this.closed) {
      throw new DaemonError('DAEMON_NOT_RUNNING', 'Daemon client is closed.');
    }

    const requestId = nextRequestId();

    return new Promise<DaemonResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new DaemonError('DAEMON_NOT_RUNNING', `Daemon request timed out: ${request.type}`));
      }, timeoutMs);

      timer.unref?.();

      this.pending.set(requestId, { resolve, reject, timer });

      try {
        this.socket.write(encodeFrame({ requestId, request }, 8 * 1024 * 1024));
      } catch (error) {
        this.pending.delete(requestId);
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /** Start the heartbeat loop. */
  startHeartbeat(): void {
    if (this.options.heartbeat === false || this.heartbeatTimer) {
      return;
    }

    this.heartbeatTimer = setInterval(() => {
      void this.request({ type: 'heartbeat', sessionId: this.sessionId }, 5_000).catch(
        () => undefined
      );
    }, this.heartbeatIntervalMs);

    this.heartbeatTimer.unref?.();
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }

    this.onClosed(new Error('Client closed.'));
  }
}

function openSocket(socketPath: string, timeoutMs: number): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ path: socketPath });

    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        socket.destroy();
        reject(new DaemonError('DAEMON_NOT_RUNNING', `No ToolNet daemon at ${socketPath}.`));
      }
    }, timeoutMs);

    timer.unref?.();

    socket.once('connect', () => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      resolve(socket);
    });

    socket.once('error', (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      socket.destroy();
      reject(error);
    });
  });
}

/** Send a single request on a raw socket before a client object exists. */
function rawRequest(
  socket: Socket,
  decoder: FrameDecoder,
  requestId: string,
  request: DaemonRequest,
  timeoutMs: number
): Promise<DaemonResponse> {
  return new Promise<DaemonResponse>((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new DaemonError('DAEMON_NOT_RUNNING', `Daemon handshake timed out: ${request.type}`));
    }, timeoutMs);

    timer.unref?.();

    const onData = (chunk: Buffer) => {
      let messages: unknown[];

      try {
        messages = decoder.push(chunk);
      } catch (error) {
        cleanup();
        reject(error instanceof Error ? error : new Error(String(error)));
        return;
      }

      for (const raw of messages) {
        const message = parseServerMessage(raw);

        if (!message || !('requestId' in message)) {
          continue;
        }

        if ((message as { requestId: string }).requestId !== requestId) {
          continue;
        }

        cleanup();
        resolve((message as { response: DaemonResponse }).response);
        return;
      }
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const cleanup = () => {
      clearTimeout(timer);
      socket.off('data', onData);
      socket.off('error', onError);
    };

    socket.on('data', onData);
    socket.once('error', onError);

    socket.write(encodeFrame({ requestId, request }, 1024 * 1024));
  });
}

/** Perform the admission handshake and return a ready client. */
export async function connectDaemonClient(options: DaemonClientOptions): Promise<DaemonClient> {
  const timeoutMs = options.timeoutMs ?? 5_000;

  const runtimeRoot = options.runtimeRoot ?? daemonRuntimeRoot();

  const build = daemonBuildFingerprint(runtimeRoot);

  const socket = await openSocket(options.socketPath, timeoutMs);

  const decoder = new FrameDecoder(8 * 1024 * 1024);

  let response: DaemonResponse;

  try {
    response = await rawRequest(
      socket,
      decoder,
      nextRequestId(),
      {
        type: 'hello',
        protocolVersion: options.protocolVersion ?? DAEMON_PROTOCOL_VERSION,
        fingerprint: options.fingerprint ?? build.buildHash,
        client: options.client,
      },
      timeoutMs
    );
  } catch (error) {
    socket.destroy();
    throw error;
  }

  if (!response.ok) {
    socket.destroy();
    throw new DaemonError(response.code, response.error);
  }

  if (response.type !== 'hello') {
    socket.destroy();
    throw new DaemonError('PROTOCOL_MALFORMED', 'Unexpected daemon handshake response.');
  }

  const client = new DaemonClient(
    socket,
    decoder,
    {
      sessionId: response.sessionId,
      instance: response.instance,
      fingerprint: response.fingerprint,
      heartbeatIntervalMs: response.heartbeatIntervalMs,
    },
    options
  );

  client.startHeartbeat();

  return client;
}

/**
 * Cheap liveness + identity probe used by the instance lock.
 *
 * Uses `daemon_status`, which needs no session, and compares the reported build
 * hash so a recycled pid can never be mistaken for our daemon.
 */
export async function probeDaemon(options: {
  socketPath: string;
  fingerprint?: string;
  timeoutMs?: number;
}): Promise<boolean> {
  let socket: Socket | undefined;

  try {
    socket = await openSocket(options.socketPath, options.timeoutMs ?? 500);

    const decoded: DaemonResponse = await new Promise<DaemonResponse>((resolve, reject) => {
      const decoder = new FrameDecoder(8 * 1024 * 1024);

      const timer = setTimeout(() => {
        reject(new Error('probe timeout'));
      }, options.timeoutMs ?? 500);

      timer.unref?.();

      socket!.on('data', (chunk: Buffer) => {
        try {
          const messages = decoder.push(chunk);

          for (const raw of messages) {
            const message = parseServerMessage(raw);

            if (message && 'requestId' in message) {
              clearTimeout(timer);
              resolve((message as { response: DaemonResponse }).response);
              return;
            }
          }
        } catch (error) {
          clearTimeout(timer);
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      });

      socket!.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });

      socket!.write(
        encodeFrame({ requestId: 'probe', request: { type: 'daemon_status' } }, 1024 * 1024)
      );
    });

    if (!decoded.ok || decoded.type !== 'daemon_status') {
      return false;
    }

    if (
      options.fingerprint &&
      (decoded as DaemonStatusResponse).status.instance.buildHash !== options.fingerprint
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  } finally {
    socket?.destroy();
  }
}
