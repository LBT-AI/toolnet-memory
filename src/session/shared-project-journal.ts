import { randomUUID } from 'node:crypto';

import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeSync,
} from 'node:fs';

import { join } from 'node:path';

import type { NormalizedSessionEvent } from './types.js';

const LOCK_STALE_MS = 120_000;

const LOCK_ATTEMPTS = 80;

const DIRTY_MARKER = 'reconcile-required';

interface JournalLock {
  fd: number;

  token: string;
}

interface JournalLockMetadata {
  version: 1;

  token: string;

  pid: number;

  acquiredAt: string;
}

function sleepSync(milliseconds: number): void {
  if (milliseconds <= 0) {
    return;
  }

  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

export function sharedProjectJournalDirectory(projectRoot: string): string {
  return join(projectRoot, '.toolnet', 'journal');
}

export function sharedProjectJournalFile(projectRoot: string): string {
  return join(sharedProjectJournalDirectory(projectRoot), 'events.jsonl');
}

export function sharedProjectJournalDirtyFile(projectRoot: string): string {
  return join(sharedProjectJournalDirectory(projectRoot), DIRTY_MARKER);
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

function readLockMetadata(lockFile: string): JournalLockMetadata | null {
  if (!existsSync(lockFile)) {
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(lockFile, 'utf8')) as Partial<JournalLockMetadata>;

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

function lockIsStale(lockFile: string): boolean {
  if (!existsSync(lockFile)) {
    return false;
  }

  let age = 0;

  try {
    age = Date.now() - statSync(lockFile).mtimeMs;
  } catch {
    return false;
  }

  if (age <= LOCK_STALE_MS) {
    return false;
  }

  const metadata = readLockMetadata(lockFile);

  if (!metadata) {
    return true;
  }

  return !processAlive(metadata.pid);
}

function removeStaleLock(lockFile: string): boolean {
  if (!lockIsStale(lockFile)) {
    return false;
  }

  try {
    rmSync(lockFile, {
      force: true,
    });

    return true;
  } catch {
    return false;
  }
}

function acquireLock(lockFile: string): JournalLock {
  for (let attempt = 0; attempt < LOCK_ATTEMPTS; attempt += 1) {
    const token = randomUUID();

    try {
      const fd = openSync(lockFile, 'wx', 0o600);

      const metadata: JournalLockMetadata = {
        version: 1,

        token,

        pid: process.pid,

        acquiredAt: new Date().toISOString(),
      };

      try {
        writeSync(fd, `${JSON.stringify(metadata)}\n`, null, 'utf8');

        fsyncSync(fd);

        return {
          fd,
          token,
        };
      } catch (error) {
        closeSync(fd);

        rmSync(lockFile, {
          force: true,
        });

        throw error;
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException | undefined)?.code;

      if (code !== 'EEXIST') {
        throw error;
      }

      if (removeStaleLock(lockFile)) {
        continue;
      }

      sleepSync(25);
    }
  }

  throw new Error(`Shared project journal is locked: ${lockFile}`);
}

function releaseLock(lockFile: string, lock: JournalLock): void {
  closeSync(lock.fd);

  const current = readLockMetadata(lockFile);

  if (current?.token !== lock.token) {
    return;
  }

  rmSync(lockFile, {
    force: true,
  });
}

function readEvents(file: string): NormalizedSessionEvent[] {
  if (!existsSync(file)) {
    return [];
  }

  let content = '';

  try {
    content = readFileSync(file, 'utf8');
  } catch {
    return [];
  }

  const events: NormalizedSessionEvent[] = [];

  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();

    if (!line) {
      continue;
    }

    try {
      const parsed = JSON.parse(line) as NormalizedSessionEvent;

      if (parsed.version !== 1) {
        continue;
      }

      if (typeof parsed.id !== 'string' || parsed.id.length === 0) {
        continue;
      }

      if (typeof parsed.projectId !== 'string' || parsed.projectId.length === 0) {
        continue;
      }

      events.push(parsed);
    } catch {
      /*
       * Preserve availability when a crash leaves
       * an incomplete/corrupt JSONL tail.
       */
    }
  }

  return events;
}

function collectRuntimeEventFiles(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  const files: string[] = [];

  for (const entry of readdirSync(directory, {
    withFileTypes: true,
  })) {
    const full = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectRuntimeEventFiles(full));

      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (entry.name !== 'events.jsonl') {
      continue;
    }

    files.push(full);
  }

  return files.sort();
}

function fsyncDirectory(directory: string): void {
  let fd: number | null = null;

  try {
    fd = openSync(directory, 'r');

    fsyncSync(fd);
  } catch {
    /*
     * Best effort. Some platforms/filesystems
     * do not support directory fsync.
     */
  } finally {
    if (fd === null) {
      return;
    }

    closeSync(fd);
  }
}

function dirtyToken(projectRoot: string): string | null {
  const file = sharedProjectJournalDirtyFile(projectRoot);

  if (!existsSync(file)) {
    return null;
  }

  try {
    const value = readFileSync(file, 'utf8').trim();

    return value || null;
  } catch {
    return null;
  }
}

export function markSharedProjectJournalDirty(projectRoot: string): void {
  const directory = sharedProjectJournalDirectory(projectRoot);

  mkdirSync(directory, {
    recursive: true,

    mode: 0o700,
  });

  const marker = sharedProjectJournalDirtyFile(projectRoot);

  const value = [randomUUID(), new Date().toISOString()].join('|');

  const fd = openSync(marker, 'w', 0o600);

  try {
    writeSync(fd, `${value}\n`, null, 'utf8');

    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }

  fsyncDirectory(directory);
}

export interface SharedProjectJournalReconcileResult {
  filesScanned: number;

  existingEvents: number;

  recoveredEvents: number;

  totalEvents: number;
}

function writeJournalAtomically(
  directory: string,
  eventsFile: string,
  events: NormalizedSessionEvent[]
): void {
  const temp = join(directory, `.events.jsonl.tmp-${process.pid}-${randomUUID()}`);

  const fd = openSync(temp, 'w', 0o600);

  try {
    const content =
      events.length === 0 ? '' : `${events.map((event) => JSON.stringify(event)).join('\n')}\n`;

    if (content) {
      writeSync(fd, content, null, 'utf8');
    }

    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }

  renameSync(temp, eventsFile);

  fsyncDirectory(directory);
}

function reconcileLocked(projectRoot: string): SharedProjectJournalReconcileResult {
  const directory = sharedProjectJournalDirectory(projectRoot);

  const eventsFile = sharedProjectJournalFile(projectRoot);

  const runtimeRoot = join(projectRoot, '.toolnet', 'runtime', 'sources');

  /*
   * Capture marker generation while journal.lock is held.
   * If another process marks dirty during reconciliation,
   * its newer marker must survive for another pass.
   */
  const dirtyBefore = dirtyToken(projectRoot);

  const sourceFiles = collectRuntimeEventFiles(runtimeRoot);

  const merged: NormalizedSessionEvent[] = [];

  const seen = new Set<string>();

  for (const event of readEvents(eventsFile)) {
    if (seen.has(event.id)) {
      continue;
    }

    seen.add(event.id);

    merged.push(event);
  }

  const existingEvents = merged.length;

  const recovered: NormalizedSessionEvent[] = [];

  for (const sourceFile of sourceFiles) {
    for (const event of readEvents(sourceFile)) {
      if (seen.has(event.id)) {
        continue;
      }

      seen.add(event.id);

      recovered.push(event);
    }
  }

  recovered.sort((left, right) => {
    const byTimestamp = left.timestamp.localeCompare(right.timestamp);

    if (byTimestamp !== 0) {
      return byTimestamp;
    }

    return left.id.localeCompare(right.id);
  });

  merged.push(...recovered);

  writeJournalAtomically(directory, eventsFile, merged);

  const dirtyAfter = dirtyToken(projectRoot);

  if (dirtyBefore && dirtyAfter === dirtyBefore) {
    rmSync(sharedProjectJournalDirtyFile(projectRoot), {
      force: true,
    });

    fsyncDirectory(directory);
  }

  return {
    filesScanned: sourceFiles.length,

    existingEvents,

    recoveredEvents: recovered.length,

    totalEvents: merged.length,
  };
}

/**
 * Per-source fsync WALs are authoritative.
 *
 * journal.lock is acquired BEFORE reading either the current
 * projection or runtime/sources/**, preventing reconcile from
 * overwriting a concurrent append.
 */
export function reconcileSharedProjectJournal(
  projectRoot: string
): SharedProjectJournalReconcileResult {
  const directory = sharedProjectJournalDirectory(projectRoot);

  mkdirSync(directory, {
    recursive: true,

    mode: 0o700,
  });

  const lockFile = join(directory, 'journal.lock');

  const lock = acquireLock(lockFile);

  try {
    return reconcileLocked(projectRoot);
  } finally {
    releaseLock(lockFile, lock);
  }
}

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

  const lock = acquireLock(lockFile);

  try {
    /*
     * WAL is already fsync'd before this call.
     * If projection is dirty, rebuilding from all WALs
     * also includes the current event, so do not append twice.
     */
    if (existsSync(sharedProjectJournalDirtyFile(projectRoot))) {
      reconcileLocked(projectRoot);

      return;
    }

    const content = `${events.map((event) => JSON.stringify(event)).join('\n')}\n`;

    const fd = openSync(eventsFile, 'a', 0o600);

    try {
      writeSync(fd, content, null, 'utf8');

      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }

    fsyncDirectory(directory);
  } finally {
    releaseLock(lockFile, lock);
  }
}

export function sharedProjectJournalExists(projectRoot: string): boolean {
  return existsSync(sharedProjectJournalFile(projectRoot));
}
