/*
 * Phase 77 — shared project watcher coordinator.
 *
 * Exactly ONE watcher exists per active project root, shared by every session.
 * Filesystem events are normalized and coalesced, so saving a file ten times
 * does not trigger ten index passes.
 */

import { watch, type FSWatcher } from 'node:fs';

import { relative, resolve, sep } from 'node:path';

import { DAEMON_LIMITS } from './limits.js';

export interface WatcherHandle {
  close(): void | Promise<void>;
}

export type WatchFactory = (
  rootPath: string,
  onEvent: (path: string, eventType: string) => void,
  onError: () => void
) => WatcherHandle;

export interface WatcherCoordinatorOptions {
  debounceMs?: number;
  maxBatch?: number;
  onBatch: (projectId: string, paths: string[], epoch: number) => void;
  factory?: WatchFactory;
  isIgnored?: (relativePath: string) => boolean;
}

const DEFAULT_IGNORED_SEGMENTS = new Set([
  '.git',
  'node_modules',
  '.toolnet',
  '.toolnet-memory',
  '.cache',
  'dist',
  'bundle',
  'coverage',
]);

export function defaultIsIgnored(relativePath: string): boolean {
  const normalized = relativePath.split(sep).join('/');

  return normalized
    .split('/')
    .some((segment) => DEFAULT_IGNORED_SEGMENTS.has(segment) || segment.startsWith('.toolnet'));
}

const defaultFactory: WatchFactory = (rootPath, onEvent, onError) => {
  let watcher: FSWatcher;

  const listener = (eventType: string, filename: string | Buffer | null) => {
    onEvent(filename ? String(filename) : '', eventType);
  };

  try {
    watcher = watch(rootPath, { recursive: true }, listener);
  } catch {
    /* Recursive watch is unavailable on some platforms; degrade to root only. */
    watcher = watch(rootPath, listener);
  }

  watcher.on('error', () => {
    onError();
  });

  return {
    close: () => {
      watcher.close();
    },
  };
};

interface ActiveWatcher {
  projectId: string;
  rootPath: string;
  handle: WatcherHandle;
  pending: Set<string>;
  timer?: NodeJS.Timeout;
  epoch: number;
}

export class WatcherCoordinator {
  private readonly watchers = new Map<string, ActiveWatcher>();

  private readonly debounceMs: number;

  private readonly maxBatch: number;

  private readonly factory: WatchFactory;

  private readonly isIgnored: (relativePath: string) => boolean;

  constructor(private readonly options: WatcherCoordinatorOptions) {
    this.debounceMs = options.debounceMs ?? DAEMON_LIMITS.watcherDebounceMs;
    this.maxBatch = options.maxBatch ?? DAEMON_LIMITS.maxWatcherBatch;
    this.factory = options.factory ?? defaultFactory;
    this.isIgnored = options.isIgnored ?? defaultIsIgnored;
  }

  get size(): number {
    return this.watchers.size;
  }

  has(projectId: string): boolean {
    return this.watchers.has(projectId);
  }

  epochFor(projectId: string): number {
    return this.watchers.get(projectId)?.epoch ?? 0;
  }

  /** Create the watcher if absent. Returns true when a watcher was created. */
  ensure(projectId: string, rootPath: string): boolean {
    if (this.watchers.has(projectId)) {
      return false;
    }

    const record: ActiveWatcher = {
      projectId,
      rootPath: resolve(rootPath),
      handle: { close: () => undefined },
      pending: new Set(),
      epoch: 0,
    };

    try {
      record.handle = this.factory(
        record.rootPath,
        (path, eventType) => {
          this.record(record, path, eventType);
        },
        () => {
          /* A watcher error must never take the daemon down. */
        }
      );
    } catch {
      return false;
    }

    this.watchers.set(projectId, record);

    return true;
  }

  private record(record: ActiveWatcher, path: string, eventType: string): void {
    if (!path) {
      return;
    }

    const absolute = resolve(record.rootPath, path);

    /* Containment: never follow a watcher event outside the project root. */
    if (absolute !== record.rootPath && !absolute.startsWith(record.rootPath + sep)) {
      return;
    }

    const relativePath = relative(record.rootPath, absolute).split(sep).join('/');

    if (!relativePath || this.isIgnored(relativePath)) {
      return;
    }

    if (record.pending.size >= this.maxBatch) {
      return;
    }

    record.pending.add(relativePath);

    if (record.timer) {
      clearTimeout(record.timer);
    }

    record.timer = setTimeout(() => {
      const paths = [...record.pending].sort();

      record.pending.clear();

      delete record.timer;

      if (paths.length === 0) {
        return;
      }

      record.epoch += 1;

      this.options.onBatch(record.projectId, paths, record.epoch);
    }, this.debounceMs);

    record.timer.unref?.();
  }

  release(projectId: string): void {
    const record = this.watchers.get(projectId);

    if (!record) {
      return;
    }

    if (record.timer) {
      clearTimeout(record.timer);
    }

    void record.handle.close();

    this.watchers.delete(projectId);
  }

  releaseAll(): void {
    for (const projectId of [...this.watchers.keys()]) {
      this.release(projectId);
    }
  }
}
