import { chmodSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';

import { createConnection, createServer, type Server, type Socket } from 'node:net';

import { dirname, resolve } from 'node:path';

import { pathToFileURL } from 'node:url';

import { loadConfig } from '../core/config.js';

import {
  createStorageProvider,
  MemoryStore,
  PersistentCodeGraphStore,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../storage/index.js';

import type {
  ToolNetServiceProject,
  ToolNetServiceProjectData,
  ToolNetServiceRequest,
  ToolNetServiceResponse,
  ToolNetServiceStats,
} from './protocol.js';

import { toolNetServiceSocketPath } from './socket-path.js';
import { createAutoGcScheduler } from '../retention/scheduler.js';
import { ProjectManager } from '../core/project-manager.js';

export type ToolNetServiceProjectLoader = (
  project: ToolNetServiceProject
) => Promise<ToolNetServiceProjectData>;

export interface StartToolNetServiceOptions {
  socketPath?: string;
  cacheTtlMs?: number;
  loader?: ToolNetServiceProjectLoader;
}

export interface ToolNetServiceHandle {
  socketPath: string;
  close(): Promise<void>;
  stats(): ToolNetServiceStats;
}

interface CacheEntry {
  expiresAt: number;
  loadedAt: string;
  data: ToolNetServiceProjectData;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function projectKey(project: ToolNetServiceProject): string {
  return `${project.id}:${project.remote ?? project.name}`;
}

export async function loadProjectForService(
  project: ToolNetServiceProject
): Promise<ToolNetServiceProjectData> {
  const config = loadConfig();

  const rawStorage = createStorageProvider({
    provider: config.storage.provider,
    r2: config.storage.r2,
    s3: config.storage.s3,
    huggingface: config.storage.huggingface,
    localRoot: config.storage.localRoot,
  });

  const retryStorage = withStorageRetry(rawStorage, {
    attempts: Number(process.env.TOOLNET_STORAGE_RETRIES ?? 3),
  });

  const storage = new ProjectScopedStorageProvider(
    retryStorage,
    project.id,
    project.name,
    project.remote ?? project.name
  );

  const [memory, graph] = await Promise.all([
    new MemoryStore(storage).load(project.id),

    new PersistentCodeGraphStore(storage).load(project.id),
  ]);

  return {
    memory,
    graph,
  };
}

function socketIsActive(socketPath: string, timeoutMs = 200): Promise<boolean> {
  return new Promise((resolveActive) => {
    const socket = createConnection({
      path: socketPath,
    });

    let settled = false;

    const finish = (value: boolean) => {
      if (settled) {
        return;
      }

      settled = true;

      clearTimeout(timer);

      socket.destroy();

      resolveActive(value);
    };

    const timer = setTimeout(() => {
      finish(false);
    }, timeoutMs);

    socket.once('connect', () => {
      finish(true);
    });

    socket.once('error', () => {
      finish(false);
    });
  });
}

export async function startToolNetService(
  options: StartToolNetServiceOptions = {}
): Promise<ToolNetServiceHandle> {
  const socketPath = options.socketPath ?? toolNetServiceSocketPath();

  const cacheTtlMs = Math.max(
    1_000,
    options.cacheTtlMs ?? Number(process.env.TOOLNET_SERVICE_CACHE_TTL_MS ?? 30_000)
  );

  const loader = options.loader ?? loadProjectForService;
  const autoGc = createAutoGcScheduler();
  if (autoGc.enabled) {
    const current = new ProjectManager().findExisting(process.cwd());
    if (current) {
      autoGc.observeRoot(current.rootPath);
    }
    console.log('[toolnet-memory] auto-GC scheduler enabled');
  }
  const cache = new Map<string, CacheEntry>();

  const startedAt = new Date().toISOString();

  const counters = {
    requests: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };

  const stats = (): ToolNetServiceStats => ({
    pid: process.pid,

    startedAt,

    requests: counters.requests,

    cacheHits: counters.cacheHits,

    cacheMisses: counters.cacheMisses,

    cacheEntries: cache.size,
  });

  const handleRequest = async (request: ToolNetServiceRequest): Promise<ToolNetServiceResponse> => {
    counters.requests += 1;

    if (request.type === 'ping') {
      return {
        ok: true,
        type: 'ping',
        stats: stats(),
      };
    }

    const key = projectKey(request.project);
    autoGc.observeRoot(request.project.rootPath);

    if (request.type === 'invalidate') {
      return {
        ok: true,
        type: 'invalidate',
        removed: cache.delete(key),
      };
    }

    const current = cache.get(key);

    if (current && current.expiresAt > Date.now()) {
      counters.cacheHits += 1;

      return {
        ok: true,
        type: 'hydrate',
        cacheHit: true,
        loadedAt: current.loadedAt,
        memory: current.data.memory,
        graph: current.data.graph,
      };
    }

    counters.cacheMisses += 1;

    try {
      const data = await loader(request.project);

      const loadedAt = new Date().toISOString();

      cache.set(key, {
        expiresAt: Date.now() + cacheTtlMs,

        loadedAt,

        data,
      });

      return {
        ok: true,
        type: 'hydrate',
        cacheHit: false,
        loadedAt,
        memory: data.memory,
        graph: data.graph,
      };
    } catch (error) {
      return {
        ok: false,
        error: errorMessage(error),
      };
    }
  };

  mkdirSync(dirname(socketPath), {
    recursive: true,
    mode: 0o700,
  });

  if (existsSync(socketPath)) {
    if (await socketIsActive(socketPath)) {
      throw new Error(`ToolNet service already running at ${socketPath}`);
    }

    unlinkSync(socketPath);
  }

  const server: Server = createServer((socket: Socket) => {
    socket.setEncoding('utf8');

    let buffer = '';

    socket.on('data', (chunk) => {
      buffer += chunk;

      const newline = buffer.indexOf('\n');

      if (newline === -1) {
        return;
      }

      const line = buffer.slice(0, newline).trim();

      buffer = buffer.slice(newline + 1);

      void (async () => {
        try {
          const request = JSON.parse(line) as ToolNetServiceRequest;

          const response = await handleRequest(request);

          socket.end(`${JSON.stringify(response)}\n`);
        } catch (error) {
          const response: ToolNetServiceResponse = {
            ok: false,
            error: errorMessage(error),
          };

          socket.end(`${JSON.stringify(response)}\n`);
        }
      })();
    });
  });

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

  chmodSync(socketPath, 0o600);

  return {
    socketPath,

    stats,

    close: async () => {
      autoGc.close();
      await new Promise<void>((resolveClose) => {
        server.close(() => {
          resolveClose();
        });
      });

      if (existsSync(socketPath)) {
        unlinkSync(socketPath);
      }
    },
  };
}

async function main(): Promise<void> {
  const handle = await startToolNetService();

  console.log(`[toolnet-memory] service ready: ${handle.socketPath}`);

  const shutdown = () => {
    void handle.close().finally(() => process.exit(0));
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

const entry = process.argv[1];

if (entry && import.meta.url === pathToFileURL(resolve(entry)).href) {
  void main().catch((error) => {
    console.error(`[toolnet-memory] service failed: ${errorMessage(error)}`);

    process.exit(1);
  });
}
