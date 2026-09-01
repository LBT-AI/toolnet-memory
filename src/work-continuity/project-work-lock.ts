import { randomUUID } from 'node:crypto';

import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';

import { dirname, join } from 'node:path';

import type { ProjectManifest } from '../core/types.js';

export interface ProjectWorkLockOptions {
  timeoutMs?: number;

  retryMs?: number;

  staleMs?: number;
}

interface WorkLockMetadata {
  version: 1;

  token: string;

  pid: number;

  acquiredAt: string;
}

const SLEEPER = new Int32Array(new SharedArrayBuffer(4));

function pause(milliseconds: number): void {
  if (milliseconds <= 0) {
    return;
  }

  Atomics.wait(SLEEPER, 0, 0, milliseconds);
}

export function projectWorkLockFile(project: ProjectManifest): string {
  return join(project.rootPath, '.toolnet', 'work', '.current.lock');
}

function processAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);

    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;

    if (code === 'ESRCH') {
      return false;
    }

    return true;
  }
}

function readLockMetadata(file: string): WorkLockMetadata | null {
  if (!existsSync(file)) {
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as Partial<WorkLockMetadata>;

    if (
      parsed.version !== 1 ||
      typeof parsed.token !== 'string' ||
      typeof parsed.pid !== 'number' ||
      typeof parsed.acquiredAt !== 'string'
    ) {
      return null;
    }

    return {
      version: 1,

      token: parsed.token,

      pid: parsed.pid,

      acquiredAt: parsed.acquiredAt,
    };
  } catch {
    return null;
  }
}

function lockAge(file: string): number {
  try {
    return Date.now() - statSync(file).mtimeMs;
  } catch {
    return 0;
  }
}

function lockIsStale(file: string, staleMs: number): boolean {
  if (!existsSync(file)) {
    return false;
  }

  if (lockAge(file) < staleMs) {
    return false;
  }

  const metadata = readLockMetadata(file);

  if (!metadata) {
    return true;
  }

  if (processAlive(metadata.pid)) {
    return false;
  }

  return true;
}

function removeStaleLock(file: string, staleMs: number): boolean {
  if (!lockIsStale(file, staleMs)) {
    return false;
  }

  try {
    unlinkSync(file);

    return true;
  } catch {
    return false;
  }
}

function createLock(file: string, token: string): void {
  const metadata: WorkLockMetadata = {
    version: 1,

    token,

    pid: process.pid,

    acquiredAt: new Date().toISOString(),
  };

  const fd = openSync(file, 'wx', 0o600);

  try {
    writeFileSync(fd, `${JSON.stringify(metadata, null, 2)}\n`, {
      encoding: 'utf8',
    });

    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

function releaseLock(file: string, token: string): void {
  const current = readLockMetadata(file);

  if (current?.token !== token) {
    return;
  }

  try {
    unlinkSync(file);
  } catch {
    // Lock may already be gone after crash cleanup.
  }
}

export function acquireProjectWorkLock(
  project: ProjectManifest,
  options: ProjectWorkLockOptions = {}
): () => void {
  const timeoutMs = Math.max(100, options.timeoutMs ?? 5_000);

  const retryMs = Math.max(5, options.retryMs ?? 20);

  const staleMs = Math.max(timeoutMs * 2, options.staleMs ?? 30_000);

  const file = projectWorkLockFile(project);

  mkdirSync(dirname(file), {
    recursive: true,
  });

  const token = randomUUID();

  const deadline = Date.now() + timeoutMs;

  while (true) {
    try {
      createLock(file, token);

      let released = false;

      return () => {
        if (released) {
          return;
        }

        released = true;

        releaseLock(file, token);
      };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException | undefined)?.code;

      if (code !== 'EEXIST') {
        throw error;
      }

      if (removeStaleLock(file, staleMs)) {
        continue;
      }

      if (Date.now() >= deadline) {
        throw new Error(`Timed out acquiring project work lock: ${file}`);
      }

      pause(retryMs);
    }
  }
}

export function withProjectWorkLock<T>(
  project: ProjectManifest,
  operation: () => T,
  options: ProjectWorkLockOptions = {}
): T {
  const release = acquireProjectWorkLock(project, options);

  try {
    return operation();
  } finally {
    release();
  }
}
