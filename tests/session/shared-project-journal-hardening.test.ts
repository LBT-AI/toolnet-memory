import {
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';

import { tmpdir } from 'node:os';

import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { NormalizedSessionEvent } from '../../src/session/types.js';

import {
  appendSharedProjectJournal,
  markSharedProjectJournalDirty,
  reconcileSharedProjectJournal,
  sharedProjectJournalDirtyFile,
  sharedProjectJournalFile,
} from '../../src/session/shared-project-journal.js';

const roots: string[] = [];

function root(): string {
  const value = mkdtempSync(join(tmpdir(), 'toolnet-journal-v2-'));

  roots.push(value);

  return value;
}

function event(id: string, sequence: number, agent = 'codex'): NormalizedSessionEvent {
  return {
    version: 1,

    id,

    sequence,

    projectId: 'phase5-project',

    agent,

    nativeSessionId: `${agent}-session`,

    sessionId: `${agent}-session`,

    type: 'message',

    timestamp: `2026-09-02T02:00:${String(sequence).padStart(2, '0')}.000Z`,

    source: agent,

    data: {
      id,
    },

    provenance: {},
  };
}

function sourceWal(projectRoot: string, agent: string): string {
  return join(
    projectRoot,
    '.toolnet',
    'runtime',
    'sources',
    agent,
    `${agent}-session`,
    'events.jsonl'
  );
}

function writeWal(file: string, events: NormalizedSessionEvent[]): void {
  mkdirSync(dirname(file), {
    recursive: true,
  });

  writeFileSync(file, `${events.map((item) => JSON.stringify(item)).join('\n')}\n`);
}

function journalEvents(projectRoot: string): NormalizedSessionEvent[] {
  const file = sharedProjectJournalFile(projectRoot);

  return readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as NormalizedSessionEvent);
}

afterEach(() => {
  while (roots.length > 0) {
    const value = roots.pop();

    if (!value) {
      continue;
    }

    rmSync(value, {
      recursive: true,

      force: true,
    });
  }
});

describe('Shared project journal hardening', () => {
  it('recovers missing events from authoritative source WAL and deduplicates IDs', () => {
    const projectRoot = root();

    const first = event('event-1', 1);

    const second = event('event-2', 2, 'agy');

    writeWal(sourceWal(projectRoot, 'codex'), [first]);

    writeWal(sourceWal(projectRoot, 'agy'), [first, second]);

    mkdirSync(dirname(sharedProjectJournalFile(projectRoot)), {
      recursive: true,
    });

    writeFileSync(sharedProjectJournalFile(projectRoot), `${JSON.stringify(first)}\n`);

    markSharedProjectJournalDirty(projectRoot);

    const result = reconcileSharedProjectJournal(projectRoot);

    expect(result.existingEvents).toBe(1);

    expect(result.recoveredEvents).toBe(1);

    expect(result.totalEvents).toBe(2);

    expect(journalEvents(projectRoot).map((item) => item.id)).toEqual(['event-1', 'event-2']);
  });

  it('ignores a corrupt journal tail and rebuilds the missing event', () => {
    const projectRoot = root();

    const first = event('event-a', 1);

    const second = event('event-b', 2);

    writeWal(sourceWal(projectRoot, 'codex'), [first, second]);

    mkdirSync(dirname(sharedProjectJournalFile(projectRoot)), {
      recursive: true,
    });

    writeFileSync(sharedProjectJournalFile(projectRoot), `${JSON.stringify(first)}\n{"broken":`);

    markSharedProjectJournalDirty(projectRoot);

    const result = reconcileSharedProjectJournal(projectRoot);

    expect(result.totalEvents).toBe(2);

    expect(journalEvents(projectRoot)).toHaveLength(2);
  });

  it('reconciles instead of double-appending when dirty', () => {
    const projectRoot = root();

    const item = event('event-dirty', 1);

    writeWal(sourceWal(projectRoot, 'codex'), [item]);

    markSharedProjectJournalDirty(projectRoot);

    appendSharedProjectJournal(projectRoot, [item]);

    expect(journalEvents(projectRoot)).toHaveLength(1);

    expect(journalEvents(projectRoot)[0].id).toBe('event-dirty');
  });

  it('serializes many append calls without corrupting JSONL', () => {
    const projectRoot = root();

    for (let index = 1; index <= 150; index += 1) {
      appendSharedProjectJournal(projectRoot, [
        event(`stress-${index}`, index, index % 2 === 0 ? 'codex' : 'agy'),
      ]);
    }

    const events = journalEvents(projectRoot);

    expect(events).toHaveLength(150);

    expect(new Set(events.map((item) => item.id)).size).toBe(150);
  });

  it('preserves a newer dirty marker created after an earlier marker', () => {
    const projectRoot = root();

    markSharedProjectJournalDirty(projectRoot);

    const marker = sharedProjectJournalDirtyFile(projectRoot);

    const first = readFileSync(marker, 'utf8');

    appendFileSync(marker, '');

    markSharedProjectJournalDirty(projectRoot);

    const second = readFileSync(marker, 'utf8');

    expect(second).not.toBe(first);
  });
});
