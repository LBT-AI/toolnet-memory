import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  rmSync,
  statSync,
  truncateSync,
  writeSync,
} from 'node:fs';

import { join } from 'node:path';

import type {
  LocalSessionState,
  NormalizedSessionEvent,
  PendingSessionEvents,
  SessionEventContext,
  SessionEventInput,
  SessionIdentity,
  SessionStatus,
} from './types.js';

import { canonicalizeSessionEventInput } from './unified-event.js';

import {
  appendSharedProjectJournal,
  markSharedProjectJournalDirty,
  reconcileSharedProjectJournal,
} from './shared-project-journal.js';

import { readJsonFile, sha256, stableStringify, writeJsonAtomic } from './utils.js';

const LOCK_STALE_MS = 120_000;

const LOCK_ATTEMPTS = 80;

const RECENT_EVENT_LIMIT = 2_000;

function sleepSync(milliseconds: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function writeAllSync(fd: number, value: string | Buffer): void {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8');

  let offset = 0;

  while (offset < buffer.length) {
    const written = writeSync(fd, buffer, offset, buffer.length - offset);

    if (written <= 0) {
      throw new Error('Unable to write session WAL');
    }

    offset += written;
  }
}

function parseWalEvent(line: string): NormalizedSessionEvent | null {
  const value = line.trim();

  if (!value) {
    return null;
  }

  try {
    const event = JSON.parse(value) as Partial<NormalizedSessionEvent>;

    if (event.version !== 1) {
      return null;
    }

    if (typeof event.id !== 'string' || !event.id) {
      return null;
    }

    if (typeof event.sequence !== 'number' || !Number.isFinite(event.sequence)) {
      return null;
    }

    if (typeof event.projectId !== 'string' || !event.projectId) {
      return null;
    }

    if (typeof event.timestamp !== 'string') {
      return null;
    }

    return event as NormalizedSessionEvent;
  } catch {
    return null;
  }
}

function readWalEvents(file: string): NormalizedSessionEvent[] {
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

  for (const line of content.split(/\r?\n/)) {
    const event = parseWalEvent(line);

    if (!event) {
      continue;
    }

    events.push(event);
  }

  return events;
}

function statusFromEvent(event: NormalizedSessionEvent): SessionStatus {
  if (event.type === 'session_end' || event.type === 'session_idle') {
    return 'idle';
  }

  if (event.type === 'error') {
    return 'error';
  }

  return 'active';
}

/**
 * A process crash may leave the last JSONL record only
 * partially written.
 *
 * Complete valid JSON without a final newline is preserved
 * by appending the missing newline.
 *
 * Invalid trailing bytes are truncated only back to the
 * previous newline. Earlier fsync'd events are untouched.
 */
function repairPartialWalTail(file: string): boolean {
  if (!existsSync(file)) {
    return false;
  }

  let buffer: Buffer;

  try {
    buffer = readFileSync(file);
  } catch {
    return false;
  }

  if (buffer.length === 0) {
    return false;
  }

  if (buffer[buffer.length - 1] === 0x0a) {
    return false;
  }

  const lastNewline = buffer.lastIndexOf(0x0a);

  const tailStart = lastNewline >= 0 ? lastNewline + 1 : 0;

  const tail = buffer.subarray(tailStart).toString('utf8').trim();

  if (parseWalEvent(tail)) {
    const fd = openSync(file, 'a');

    try {
      writeAllSync(fd, '\n');

      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }

    return true;
  }

  truncateSync(file, tailStart);

  const fd = openSync(file, 'a');

  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }

  return true;
}

function sameStrings(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}

export class SessionWal {
  readonly eventsFile: string;

  readonly stateFile: string;

  readonly lockFile: string;

  constructor(
    readonly identity: SessionIdentity,
    private readonly eventContext: SessionEventContext = {}
  ) {
    mkdirSync(identity.localDirectory, {
      recursive: true,
    });

    this.eventsFile = join(identity.localDirectory, 'events.jsonl');

    this.stateFile = join(identity.localDirectory, 'state.json');

    this.lockFile = join(identity.localDirectory, 'journal.lock');
  }

  private initialState(): LocalSessionState {
    const now = new Date().toISOString();

    return {
      version: 1,

      projectId: this.identity.projectId,

      agent: this.identity.agent,

      nativeSessionId: this.identity.nativeSessionId,

      status: 'idle',

      createdAt: now,

      updatedAt: now,

      lastSequence: 0,

      lastRemoteSequence: 0,

      remoteByteOffset: 0,

      sourceCursors: {},

      recentEventIds: [],
    };
  }

  private loadStateUnsafe(): LocalSessionState {
    return readJsonFile<LocalSessionState>(this.stateFile) ?? this.initialState();
  }

  private recoverStateUnsafe(): LocalSessionState {
    repairPartialWalTail(this.eventsFile);

    const state = this.loadStateUnsafe();

    const events = readWalEvents(this.eventsFile);

    if (events.length === 0) {
      return state;
    }

    let latest = events[0];

    for (const event of events) {
      if (event.sequence <= latest.sequence) {
        continue;
      }

      latest = event;
    }

    const recentEventIds = events.slice(-RECENT_EVENT_LIMIT).map((event) => event.id);

    const fileSize = existsSync(this.eventsFile) ? statSync(this.eventsFile).size : 0;

    const recoveredSequence = Math.max(state.lastSequence, latest.sequence);

    const recoveredOffset = Math.min(state.remoteByteOffset, fileSize);

    const stateLagged = latest.sequence > state.lastSequence;

    const changed =
      stateLagged ||
      recoveredOffset !== state.remoteByteOffset ||
      !sameStrings(state.recentEventIds, recentEventIds) ||
      state.lastLocalEventAt !== latest.timestamp;

    if (!changed) {
      return state;
    }

    const recovered: LocalSessionState = {
      ...state,

      status: statusFromEvent(latest),

      updatedAt: latest.timestamp,

      lastLocalEventAt: latest.timestamp,

      lastSequence: recoveredSequence,

      remoteByteOffset: recoveredOffset,

      recentEventIds,
    };

    this.saveStateUnsafe(recovered);

    if (!stateLagged) {
      return recovered;
    }

    /*
     * WAL contains an fsync'd event that state.json did not
     * acknowledge. The process may also have crashed before
     * projecting that event into the shared journal.
     */
    try {
      markSharedProjectJournalDirty(this.identity.projectRoot);
    } catch {
      return recovered;
    }

    try {
      reconcileSharedProjectJournal(this.identity.projectRoot);
    } catch {
      /*
       * Dirty marker remains. A later append/reconcile
       * can rebuild from authoritative source WAL.
       */
    }

    return recovered;
  }

  loadState(): LocalSessionState {
    return this.withLock(() => this.recoverStateUnsafe());
  }

  private saveStateUnsafe(state: LocalSessionState): void {
    writeJsonAtomic(this.stateFile, state);
  }

  private acquireLock(): number {
    for (let attempt = 0; attempt < LOCK_ATTEMPTS; attempt += 1) {
      try {
        return openSync(this.lockFile, 'wx', 0o600);
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;

        if (code !== 'EEXIST') {
          throw error;
        }

        try {
          const lockAge = Date.now() - statSync(this.lockFile).mtimeMs;

          if (lockAge > LOCK_STALE_MS) {
            rmSync(this.lockFile, {
              force: true,
            });

            continue;
          }
        } catch {
          // Lock disappeared between checks.
        }

        sleepSync(25);
      }
    }

    throw new Error(`Session journal is locked: ${this.lockFile}`);
  }

  private withLock<T>(run: () => T): T {
    const fd = this.acquireLock();

    try {
      return run();
    } finally {
      closeSync(fd);

      rmSync(this.lockFile, {
        force: true,
      });
    }
  }

  append(inputs: SessionEventInput[]): NormalizedSessionEvent[] {
    if (inputs.length === 0) {
      return [];
    }

    return this.withLock(() => {
      const state = this.recoverStateUnsafe();

      const recent = new Set(state.recentEventIds);

      let nextSequence = state.lastSequence;

      const normalized: NormalizedSessionEvent[] = [];

      for (const rawInput of inputs) {
        const input = canonicalizeSessionEventInput(rawInput, this.eventContext);

        const timestamp = input.timestamp ?? new Date().toISOString();

        const data = input.data ?? {};

        const rawDigest = input.provenance?.rawDigest ?? sha256(stableStringify(data));

        const idSeed = input.sourceEventId
          ? [
              this.identity.projectId,

              this.identity.agent,

              this.identity.nativeSessionId,

              input.sourceEventId,
            ].join('|')
          : [
              this.identity.projectId,

              this.identity.agent,

              this.identity.nativeSessionId,

              nextSequence + 1,

              input.type,

              timestamp,

              rawDigest,
            ].join('|');

        const eventId = sha256(idSeed).slice(0, 32);

        /*
         * Fast bounded dedup.
         * Adapters will additionally use native source cursors.
         */
        if (recent.has(eventId)) {
          continue;
        }

        nextSequence += 1;

        const event: NormalizedSessionEvent = {
          version: 1,

          id: eventId,

          sequence: nextSequence,

          projectId: this.identity.projectId,

          agent: this.identity.agent,

          nativeSessionId: this.identity.nativeSessionId,

          sessionId: this.identity.nativeSessionId,

          type: input.type,

          timestamp,

          source: input.source ?? input.provenance?.source ?? this.identity.agent,

          data,

          provenance: {
            ...input.provenance,

            rawDigest,
          },
        };

        if (input.role !== undefined) {
          event.role = input.role;
        }

        if (input.turnId !== undefined) {
          event.turnId = input.turnId;
        }

        if (input.cwd !== undefined) {
          event.cwd = input.cwd;
        }

        if (input.sourceEventId !== undefined) {
          event.sourceEventId = input.sourceEventId;
        }

        if (input.sourceSequence !== undefined) {
          event.sourceSequence = input.sourceSequence;
        }

        normalized.push(event);

        recent.add(eventId);
      }

      if (normalized.length === 0) {
        return [];
      }

      const content = normalized.map((item) => JSON.stringify(item)).join('\n') + '\n';

      const fd = openSync(this.eventsFile, 'a', 0o600);

      try {
        writeAllSync(fd, content);

        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }

      /*
       * Project journal is shared across Codex / OpenCode /
       * AGY / Kiro / Kilo / ToolNet CLI / Grok.
       *
       * Per-source WAL remains only for crash recovery,
       * native cursor and dedupe.
       */
      try {
        appendSharedProjectJournal(this.identity.projectRoot, normalized);
      } catch {
        /*
         * Per-source fsync'd WAL remains authoritative.
         * Mark shared projection dirty so a later event can
         * reconstruct missing records from runtime/sources/**.
         */
        try {
          markSharedProjectJournalDirty(this.identity.projectRoot);
        } catch {
          // Local per-source WAL is still authoritative.
        }
      }

      const last = normalized[normalized.length - 1];

      const status = statusFromEvent(last);

      const recentEventIds = Array.from(recent).slice(-RECENT_EVENT_LIMIT);

      this.saveStateUnsafe({
        ...state,

        status,

        updatedAt: last.timestamp,

        lastLocalEventAt: last.timestamp,

        lastSequence: last.sequence,

        recentEventIds,
      });

      return normalized;
    });
  }

  readPending(): PendingSessionEvents {
    return this.withLock(() => {
      const state = this.recoverStateUnsafe();

      if (!existsSync(this.eventsFile)) {
        return {
          events: [],

          startOffset: state.remoteByteOffset,

          endOffset: state.remoteByteOffset,
        };
      }

      const fileSize = statSync(this.eventsFile).size;

      const startOffset = Math.min(state.remoteByteOffset, fileSize);

      if (fileSize <= startOffset) {
        return {
          events: [],

          startOffset,

          endOffset: fileSize,
        };
      }

      const length = fileSize - startOffset;

      const buffer = Buffer.alloc(length);

      const fd = openSync(this.eventsFile, 'r');

      try {
        readSync(fd, buffer, 0, length, startOffset);
      } finally {
        closeSync(fd);
      }

      const events: NormalizedSessionEvent[] = [];

      for (const line of buffer.toString('utf8').split(/\r?\n/)) {
        const event = parseWalEvent(line);

        if (!event) {
          continue;
        }

        events.push(event);
      }

      return {
        events,

        startOffset,

        endOffset: fileSize,
      };
    });
  }

  markRemote(sequence: number, byteOffset: number): void {
    this.withLock(() => {
      const state = this.recoverStateUnsafe();

      const now = new Date().toISOString();

      this.saveStateUnsafe({
        ...state,

        lastRemoteSequence: Math.max(state.lastRemoteSequence, sequence),

        remoteByteOffset: Math.max(state.remoteByteOffset, byteOffset),

        lastRemoteAt: now,

        updatedAt: now,
      });
    });
  }

  setSourceCursor(source: string, value: string | number): void {
    this.withLock(() => {
      const state = this.recoverStateUnsafe();

      this.saveStateUnsafe({
        ...state,

        sourceCursors: {
          ...state.sourceCursors,

          [source]: String(value),
        },

        updatedAt: new Date().toISOString(),
      });
    });
  }
}
