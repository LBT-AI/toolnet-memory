import {
  appendFileSync,
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  rmSync,
  statSync,
  writeSync,
} from 'node:fs';

import { join } from 'node:path';

import type {
  LocalSessionState,
  NormalizedSessionEvent,
  PendingSessionEvents,
  SessionEventInput,
  SessionIdentity,
  SessionStatus,
} from './types.js';

import { readJsonFile, sha256, stableStringify, writeJsonAtomic } from './utils.js';

const LOCK_STALE_MS = 120_000;

const LOCK_ATTEMPTS = 80;

const RECENT_EVENT_LIMIT = 2_000;

function sleepSync(milliseconds: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

export class SessionWal {
  readonly eventsFile: string;

  readonly stateFile: string;

  readonly lockFile: string;

  constructor(readonly identity: SessionIdentity) {
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

  loadState(): LocalSessionState {
    return this.withLock(() => this.loadStateUnsafe());
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
      const state = this.loadStateUnsafe();

      const recent = new Set(state.recentEventIds);

      let nextSequence = state.lastSequence;

      const normalized: NormalizedSessionEvent[] = [];

      for (const input of inputs) {
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

          type: input.type,

          timestamp,

          data,

          provenance: {
            ...input.provenance,

            rawDigest,
          },
        };

        if (input.role !== undefined) {
          event.role = input.role;
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
        writeSync(fd, content, null, 'utf8');

        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }

      const last = normalized[normalized.length - 1];

      let status: SessionStatus = 'active';

      if (last.type === 'session_end' || last.type === 'session_idle') {
        status = 'idle';
      } else if (last.type === 'error') {
        status = 'error';
      }

      const recentEventIds = Array.from(recent).slice(-RECENT_EVENT_LIMIT);

      this.saveStateUnsafe({
        ...state,

        status,

        updatedAt: last.timestamp,

        lastSequence: last.sequence,

        recentEventIds,
      });

      return normalized;
    });
  }

  readPending(): PendingSessionEvents {
    return this.withLock(() => {
      const state = this.loadStateUnsafe();

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

      const text = buffer.toString('utf8');

      const events = text
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as NormalizedSessionEvent);

      return {
        events,
        startOffset,
        endOffset: fileSize,
      };
    });
  }

  markRemote(sequence: number, byteOffset: number): void {
    this.withLock(() => {
      const state = this.loadStateUnsafe();

      this.saveStateUnsafe({
        ...state,

        lastRemoteSequence: Math.max(state.lastRemoteSequence, sequence),

        remoteByteOffset: Math.max(state.remoteByteOffset, byteOffset),

        updatedAt: new Date().toISOString(),
      });
    });
  }

  setSourceCursor(source: string, value: string | number): void {
    this.withLock(() => {
      const state = this.loadStateUnsafe();

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
