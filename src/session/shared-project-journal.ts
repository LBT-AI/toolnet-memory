import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeSync,
} from 'node:fs';
import { join } from 'node:path';
import type { NormalizedSessionEvent } from './types.js';
const LOCK_STALE_MS = 120_000;
const LOCK_ATTEMPTS = 80;
const DIRTY_MARKER = 'reconcile-required';
function sleepSync(milliseconds: number): void {
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
function readEvents(file: string): NormalizedSessionEvent[] {
  if (!existsSync(file)) {
    return [];
  }
  let content: string;
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
      // Ignore incomplete/corrupt WAL tail.
    }
  }
  return events;
}
function collectRuntimeEventFiles(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
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
export function markSharedProjectJournalDirty(projectRoot: string): void {
  const directory = sharedProjectJournalDirectory(projectRoot);
  mkdirSync(directory, {
    recursive: true,
    mode: 0o700,
  });
  const marker = sharedProjectJournalDirtyFile(projectRoot);
  const fd = openSync(marker, 'w', 0o600);
  try {
    writeSync(fd, `${new Date().toISOString()}\n`, null, 'utf8');
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}
export interface SharedProjectJournalReconcileResult {
  filesScanned: number;
  existingEvents: number;
  recoveredEvents: number;
  totalEvents: number;
}
/**
 * Rebuild missing shared-project projection records from the
 * authoritative per-source fsync WALs.
 *
 * This never modifies or deletes per-source runtime WAL data.
 */
export function reconcileSharedProjectJournal(
  projectRoot: string
): SharedProjectJournalReconcileResult {
  const directory = sharedProjectJournalDirectory(projectRoot);
  mkdirSync(directory, {
    recursive: true,
    mode: 0o700,
  });
  const eventsFile = sharedProjectJournalFile(projectRoot);
  const lockFile = join(directory, 'journal.lock');
  const runtimeRoot = join(projectRoot, '.toolnet', 'runtime', 'sources');
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
  const lockFd = acquireLock(lockFile);
  try {
    const fd = openSync(eventsFile, 'w', 0o600);
    try {
      const content =
        merged.length > 0 ? merged.map((event) => JSON.stringify(event)).join('\n') + '\n' : '';
      if (content) {
        writeSync(fd, content, null, 'utf8');
      }
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    rmSync(sharedProjectJournalDirtyFile(projectRoot), {
      force: true,
    });
  } finally {
    closeSync(lockFd);
    rmSync(lockFile, { force: true });
  }
  return {
    filesScanned: sourceFiles.length,
    existingEvents,
    recoveredEvents: recovered.length,
    totalEvents: merged.length,
  };
}
/**
 * One append-only journal per ToolNet project.
 *
 * agent/nativeSessionId remain provenance metadata on each event.
 * They never partition project memory.
 *
 * When a previous shared projection failed, the current per-source
 * event has already been fsync'd before this function is called.
 * Therefore reconciliation can rebuild the complete projection and
 * return without appending the current batch twice.
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
  if (existsSync(sharedProjectJournalDirtyFile(projectRoot))) {
    reconcileSharedProjectJournal(projectRoot);
    return;
  }
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
