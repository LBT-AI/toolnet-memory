import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';

import { tmpdir } from 'node:os';

import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { planLocalGc } from '../../src/retention/local-planner.js';

import { retentionPolicy } from '../../src/retention/policy.js';

const roots: string[] = [];

function project(rootPath: string) {
  return {
    id: 'p1',
    name: 'project',
    remote: 'project',
    rootPath,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    graphVersion: 0,
    memoryVersion: 0,
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, {
      recursive: true,
      force: true,
    });
  }
});

describe('local retention planner', () => {
  it('never selects WAL or state files', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-gc-'));
    roots.push(root);

    const session = join(root, '.toolnet', 'runtime', 'sources', 'codex', 's1');
    mkdirSync(session, {
      recursive: true,
    });

    writeFileSync(join(session, 'events.jsonl'), '{}\n');

    writeFileSync(join(session, 'state.json'), '{}\n');

    const plan = planLocalGc(
      project(root),
      retentionPolicy(),
      Date.parse('2026-08-01T00:00:00.000Z')
    );

    expect(
      plan.candidates.some(
        (item) => item.target.endsWith('events.jsonl') || item.target.endsWith('state.json')
      )
    ).toBe(false);
  });

  it('selects only old runtime temp files', () => {
    const root = mkdtempSync(join(tmpdir(), 'toolnet-gc-'));
    roots.push(root);

    const runtime = join(root, '.toolnet', 'runtime', 'sources', 'codex', 's1');
    mkdirSync(runtime, {
      recursive: true,
    });

    const old = join(runtime, '.tmp-old');
    writeFileSync(old, 'temporary');

    const timestamp = new Date('2026-01-01T00:00:00.000Z');
    utimesSync(old, timestamp, timestamp);

    const plan = planLocalGc(
      project(root),
      retentionPolicy({
        runtimeDays: 30,
      }),
      Date.parse('2026-03-01T00:00:00.000Z')
    );

    expect(plan.candidates.map((item) => item.target)).toContain(old);
  });
});
