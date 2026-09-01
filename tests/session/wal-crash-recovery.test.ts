import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { NormalizedSessionEvent, SessionIdentity } from '../../src/session/types.js';

import { sharedProjectJournalFile } from '../../src/session/shared-project-journal.js';

import { SessionWal } from '../../src/session/wal.js';

const roots: string[] = [];

function identity(): SessionIdentity {
  const projectRoot = mkdtempSync(join(tmpdir(), 'toolnet-wal-recovery-'));

  roots.push(projectRoot);

  const localDirectory = join(projectRoot, '.toolnet', 'runtime', 'sources', 'codex', 'thread-1');

  mkdirSync(localDirectory, {
    recursive: true,
  });

  return {
    projectId: 'phase5b-project',

    projectName: 'Phase 5B',

    projectRoot,

    agent: 'codex',

    nativeSessionId: 'thread-1',

    sessionKey: 'codex:thread-1',

    remotePrefix: 'projects/phase5b-project/runtime/sources/codex/thread-1',

    localDirectory,
  };
}

function crashEvent(first: NormalizedSessionEvent): NormalizedSessionEvent {
  return {
    ...first,

    id: 'crash-event-2',

    sequence: 2,

    timestamp: '2026-09-02T03:00:02.000Z',

    sourceEventId: 'native-crash-2',

    data: {
      text: 'fsynced before state update',
    },
  };
}

function journalIds(projectRoot: string): string[] {
  const file = sharedProjectJournalFile(projectRoot);

  if (!existsSync(file)) {
    return [];
  }

  return readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => (JSON.parse(line) as NormalizedSessionEvent).id);
}

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop();

    if (!root) {
      continue;
    }

    rmSync(root, {
      recursive: true,

      force: true,
    });
  }
});

describe('Session WAL crash recovery', () => {
  it('recovers state when WAL is ahead of state.json', () => {
    const id = identity();

    const wal = new SessionWal(id);

    const [first] = wal.append([
      {
        type: 'message',

        timestamp: '2026-09-02T03:00:01.000Z',

        sourceEventId: 'native-1',

        data: {
          text: 'first',
        },
      },
    ]);

    const second = crashEvent(first);

    /*
     * Simulate:
     * WAL fsync succeeded,
     * process died before state.json save.
     */
    appendFileSync(wal.eventsFile, `${JSON.stringify(second)}\n`);

    const recovered = wal.loadState();

    expect(recovered.lastSequence).toBe(2);

    expect(recovered.recentEventIds).toContain(second.id);

    expect(recovered.lastLocalEventAt).toBe(second.timestamp);

    expect(journalIds(id.projectRoot)).toContain(second.id);
  });

  it('continues with the next sequence after recovered WAL', () => {
    const id = identity();

    const wal = new SessionWal(id);

    const [first] = wal.append([
      {
        type: 'message',

        timestamp: '2026-09-02T03:01:01.000Z',

        sourceEventId: 'native-seq-1',

        data: {
          text: 'one',
        },
      },
    ]);

    appendFileSync(wal.eventsFile, `${JSON.stringify(crashEvent(first))}\n`);

    const [third] = wal.append([
      {
        type: 'message',

        timestamp: '2026-09-02T03:01:03.000Z',

        sourceEventId: 'native-seq-3',

        data: {
          text: 'three',
        },
      },
    ]);

    expect(third.sequence).toBe(3);
  });

  it('truncates only an invalid partial JSONL tail', () => {
    const id = identity();

    const wal = new SessionWal(id);

    wal.append([
      {
        type: 'message',

        sourceEventId: 'tail-1',

        data: {
          text: 'valid',
        },
      },
    ]);

    appendFileSync(wal.eventsFile, '{"broken":');

    const pending = wal.readPending();

    expect(pending.events).toHaveLength(1);

    const content = readFileSync(wal.eventsFile, 'utf8');

    expect(content).not.toContain('{"broken":');

    expect(content.endsWith('\n')).toBe(true);
  });

  it('keeps a complete valid tail even when newline was missing', () => {
    const id = identity();

    const wal = new SessionWal(id);

    const [first] = wal.append([
      {
        type: 'message',

        sourceEventId: 'complete-1',

        data: {
          text: 'one',
        },
      },
    ]);

    const second = crashEvent(first);

    writeFileSync(wal.eventsFile, `${JSON.stringify(first)}\n${JSON.stringify(second)}`);

    const state = wal.loadState();

    expect(state.lastSequence).toBe(2);

    const content = readFileSync(wal.eventsFile, 'utf8');

    expect(content.endsWith('\n')).toBe(true);

    expect(content).toContain(second.id);
  });

  it('readPending skips corrupt complete lines instead of throwing', () => {
    const id = identity();

    const wal = new SessionWal(id);

    const [first] = wal.append([
      {
        type: 'message',

        timestamp: '2026-09-02T03:02:01.000Z',

        sourceEventId: 'pending-1',

        data: {
          text: 'one',
        },
      },
    ]);

    const second = crashEvent(first);

    appendFileSync(wal.eventsFile, `not-json\n${JSON.stringify(second)}\n`);

    const pending = wal.readPending();

    expect(pending.events.map((event) => event.id)).toEqual([first.id, second.id]);
  });
});
