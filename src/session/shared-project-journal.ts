import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  rmSync,
  statSync,
  writeSync,
} from 'node:fs';

import { join } from 'node:path';

import type { NormalizedSessionEvent } from './types.js';

const LOCK_STALE_MS = 120_000;
const LOCK_ATTEMPTS = 80;

function sleepSync(milliseconds: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

export function sharedProjectJournalDirectory(projectRoot: string): string {
  return join(projectRoot, '.toolnet', 'journal');
}

export function sharedProjectJournalFile(projectRoot: string): string {
  return join(sharedProjectJournalDirectory(projectRoot), 'events.jsonl');
}

function acquireLock(lockFile: string): number {
  for (let attempt = 0; attempt < LOCK_ATTEMPTS; attempt += 1) {
    try {
      return openSync(lockFile, 'wx', 0o600);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;

      if (code !== 'EEXIST') {
        throw error;
      }

      try {
        const age = Date.now() - statSync(lockFile).mtimeMs;

        if (age > LOCK_STALE_MS) {
          rmSync(lockFile, { force: true });
          continue;
        }
      } catch {
        // Lock disappeared between checks.
      }

      sleepSync(25);
    }
  }

  throw new Error(`Shared project journal is locked: ${lockFile}`);
}

/**
 * One append-only journal per ToolNet project.
 *
 * agent/nativeSessionId remain provenance metadata on each event.
 * They never partition project memory.
 */
export function appendSharedProjectJournal(
  projectRoot: string,
  events: NormalizedSessionEvent[]
): void {
  if (events.length === 0) {
    return;
  }

  const directory = sharedProjectJournalDirectory(projectRoot);

  mkdirSync(directory, {
    recursive: true,
    mode: 0o700,
  });

  const eventsFile = sharedProjectJournalFile(projectRoot);
  const lockFile = join(directory, 'journal.lock');

  const lockFd = acquireLock(lockFile);

  try {
    const content = events.map((event) => JSON.stringify(event)).join('\n') + '\n';

    const fd = openSync(eventsFile, 'a', 0o600);

    try {
      writeSync(fd, content, null, 'utf8');
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
  } finally {
    closeSync(lockFd);
    rmSync(lockFile, { force: true });
  }
}

export function sharedProjectJournalExists(projectRoot: string): boolean {
  return existsSync(sharedProjectJournalFile(projectRoot));
}
