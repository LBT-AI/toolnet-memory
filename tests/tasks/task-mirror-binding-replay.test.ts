import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProjectManifest } from '../../src/core/types.js';
import { extractCodexPlanSnapshots } from '../../src/session/codex/plan-adapter.js';
import { readCodexRollout } from '../../src/session/codex/rollout.js';
import { extractOpenCodePlanSnapshots } from '../../src/session/opencode/plan-adapter.js';
import type { NormalizedSessionEvent } from '../../src/session/types.js';
import {
  mirrorBindingLogPath,
  TaskMirrorBindingStore,
} from '../../src/tasks/mirror-binding-store.js';
import { taskMirrorTaskId } from '../../src/tasks/mirror-identity.js';
import type { AgentPlanSnapshot } from '../../src/tasks/mirror-types.js';

const roots: string[] = [];

function project(): ProjectManifest {
  const rootPath = mkdtempSync(join(tmpdir(), 'toolnet-binding-replay-'));
  roots.push(rootPath);
  const now = '2026-09-05T00:00:00.000Z';
  return {
    id: 'binding-replay-project',
    name: 'binding-replay-project',
    remote: 'binding-replay-project',
    rootPath,
    createdAt: now,
    updatedAt: now,
    graphVersion: 0,
    memoryVersion: 0,
  };
}

function lineCount(file: string): number {
  return readFileSync(file, 'utf8').split('\n').filter(Boolean).length;
}

function codexEvents(): NormalizedSessionEvent[] {
  const rollout = readCodexRollout('tests/fixtures/native-plan/codex/replay.jsonl', 0);
  return rollout.events.map((input, index) => ({
    version: 1 as const,
    id: `codex-normalized-${index}`,
    sequence: index + 1,
    projectId: 'binding-replay-project',
    agent: 'codex',
    nativeSessionId: 'codex-replay-thread',
    sessionId: 'codex-replay-thread',
    type: input.type,
    timestamp: input.timestamp ?? '2026-09-05T00:00:00.000Z',
    sourceEventId: input.sourceEventId,
    sourceSequence: input.sourceSequence,
    data: input.data ?? {},
    provenance: input.provenance ?? {},
  }));
}

function openCodeEvents(): NormalizedSessionEvent[] {
  const fixture = JSON.parse(
    readFileSync('tests/fixtures/native-plan/opencode/replay.json', 'utf8')
  ) as Array<{ id: string; sequence: number; timestamp: string; data: Record<string, unknown> }>;
  return fixture.map((row) => ({
    version: 1 as const,
    id: row.id,
    sequence: row.sequence,
    projectId: 'binding-replay-project',
    agent: 'opencode',
    nativeSessionId: 'opencode-replay-session',
    sessionId: 'opencode-replay-session',
    type: 'tool_call' as const,
    timestamp: row.timestamp,
    sourceEventId: row.id,
    sourceSequence: row.sequence,
    data: row.data,
    provenance: { source: 'opencode-fixture' },
  }));
}

function rawCodexSnapshots(): AgentPlanSnapshot[] {
  return extractCodexPlanSnapshots(codexEvents()).snapshots;
}

function rawOpenCodeSnapshots(): AgentPlanSnapshot[] {
  return extractOpenCodePlanSnapshots(openCodeEvents()).snapshots;
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('Phase 42C persisted mirror source bindings', () => {
  it('replays the real Codex rollout corpus through the structured adapter', () => {
    const snapshots = rawCodexSnapshots();
    expect(snapshots).toHaveLength(3);
    expect(snapshots[2]?.items[2]?.title).toBe('Run full certification');
  });

  it('preserves Codex persistent Task identity when the active native step is renamed', async () => {
    const p = project();
    const store = new TaskMirrorBindingStore(p);
    const snapshots = rawCodexSnapshots();
    const second = await store.correlate(snapshots[1]!);
    const oldActive = second.snapshot!.items.find((item) => item.title === 'Run tests')!;
    const oldTaskId = taskMirrorTaskId(second.snapshot!, oldActive);
    const third = await store.correlate(snapshots[2]!);
    const renamedActive = third.snapshot!.items.find(
      (item) => item.title === 'Run full certification'
    )!;
    expect(renamedActive.sourceKey).toBe(oldActive.sourceKey);
    expect(taskMirrorTaskId(third.snapshot!, renamedActive)).toBe(oldTaskId);
  });

  it('does the same for OpenCode todowrite active-item rename', async () => {
    const p = project();
    const store = new TaskMirrorBindingStore(p);
    const snapshots = rawOpenCodeSnapshots();
    await store.correlate(snapshots[0]!);
    const before = await store.correlate(snapshots[1]!);
    const oldActive = before.snapshot!.items.find((item) => item.title === 'Run regression')!;
    const after = await store.correlate(snapshots[2]!);
    const renamed = after.snapshot!.items.find(
      (item) => item.title === 'Run final regression suite'
    )!;
    expect(renamed.sourceKey).toBe(oldActive.sourceKey);
  });

  it('does not append another binding event for an exact provider replay', async () => {
    const p = project();
    const store = new TaskMirrorBindingStore(p);
    const snapshot = rawCodexSnapshots()[0]!;
    const first = await store.correlate(snapshot);
    expect(first.persisted).toBe(true);
    const file = mirrorBindingLogPath(p);
    const before = lineCount(file);
    const replay = await store.correlate(snapshot);
    expect(replay.replay).toBe(true);
    expect(replay.persisted).toBe(false);
    expect(lineCount(file)).toBe(before);
  });

  it('survives process/store restart with the same canonical binding identity', async () => {
    const p = project();
    const snapshot = rawOpenCodeSnapshots()[0]!;
    const first = await new TaskMirrorBindingStore(p).correlate(snapshot);
    const firstKey = first.snapshot!.items[1]!.sourceKey;
    const replay = await new TaskMirrorBindingStore(p).correlate(snapshot);
    expect(replay.snapshot!.items[1]!.sourceKey).toBe(firstKey);
    expect(replay.replay).toBe(true);
  });

  it('rejects a mutated payload that reuses an existing native sourceEventId', async () => {
    const p = project();
    const store = new TaskMirrorBindingStore(p);
    const original = rawOpenCodeSnapshots()[0]!;
    await store.correlate(original);
    const mutated: AgentPlanSnapshot = {
      ...original,
      items: original.items.map((item, index) =>
        index === 0 ? { ...item, title: 'Mutated native event payload' } : item
      ),
    };
    const result = await store.correlate(mutated);
    expect(result.snapshot).toBeUndefined();
    expect(result.ignored).toBe(true);
    expect(result.diagnostics[0]?.code).toBe('TASK_MIRROR_BINDING_SOURCE_EVENT_COLLISION');
  });

  it('rejects a new stale numeric native sequence', async () => {
    const p = project();
    const store = new TaskMirrorBindingStore(p);
    const snapshots = rawOpenCodeSnapshots();
    await store.correlate(snapshots[0]!);
    await store.correlate(snapshots[1]!);
    const stale: AgentPlanSnapshot = {
      ...snapshots[1]!,
      sourceEventId: 'new-but-stale-event',
      sourceSequence: 150,
      observedAt: '2026-09-05T01:01:30.000Z',
    };
    const result = await store.correlate(stale);
    expect(result.ignored).toBe(true);
    expect(result.diagnostics[0]?.code).toBe('TASK_MIRROR_BINDING_STALE_SOURCE_SEQUENCE');
  });

  it('does not infer pending-to-pending title replacement as a rename', async () => {
    const p = project();
    const store = new TaskMirrorBindingStore(p);
    const first: AgentPlanSnapshot = {
      version: 1,
      projectId: p.id,
      provider: 'codex',
      agentId: 'codex',
      nativeSessionId: 'pending-rename',
      planId: 'codex:update_plan',
      mode: 'full',
      sourceEventId: 'pending-1',
      sourceSequence: 1,
      observedAt: '2026-09-05T02:00:00.000Z',
      items: [{ sourceKey: 'raw:old', title: 'Old pending task', status: 'pending', order: 0 }],
    };
    const second: AgentPlanSnapshot = {
      ...first,
      sourceEventId: 'pending-2',
      sourceSequence: 2,
      observedAt: '2026-09-05T02:01:00.000Z',
      items: [
        {
          sourceKey: 'raw:new',
          title: 'Completely different pending task',
          status: 'pending',
          order: 0,
        },
      ],
    };
    const before = await store.correlate(first);
    const after = await store.correlate(second);
    expect(after.snapshot!.items[0]!.sourceKey).not.toBe(before.snapshot!.items[0]!.sourceKey);
  });

  it('keeps omitted bindings and reconnects a later exact historical alias', async () => {
    const p = project();
    const store = new TaskMirrorBindingStore(p);
    const base: AgentPlanSnapshot = {
      version: 1,
      projectId: p.id,
      provider: 'opencode',
      agentId: 'opencode',
      nativeSessionId: 'omission-session',
      planId: 'opencode:todowrite',
      mode: 'full',
      sourceEventId: 'omit-1',
      sourceSequence: 1,
      observedAt: '2026-09-05T03:00:00.000Z',
      items: [
        { sourceKey: 'raw:a', title: 'Task A', status: 'pending', order: 0 },
        { sourceKey: 'raw:b', title: 'Task B', status: 'pending', order: 1 },
      ],
    };
    const first = await store.correlate(base);
    const originalB = first.snapshot!.items[1]!.sourceKey;
    await store.correlate({
      ...base,
      sourceEventId: 'omit-2',
      sourceSequence: 2,
      observedAt: '2026-09-05T03:01:00.000Z',
      items: [base.items[0]!],
    });
    const reappeared = await store.correlate({
      ...base,
      sourceEventId: 'omit-3',
      sourceSequence: 3,
      observedAt: '2026-09-05T03:02:00.000Z',
    });
    expect(reappeared.snapshot!.items[1]!.sourceKey).toBe(originalB);
  });

  it('fails closed when several unmatched active items make rename correlation ambiguous', async () => {
    const p = project();
    const store = new TaskMirrorBindingStore(p);
    const first: AgentPlanSnapshot = {
      version: 1,
      projectId: p.id,
      provider: 'opencode',
      agentId: 'opencode',
      nativeSessionId: 'ambiguous-session',
      planId: 'opencode:todowrite',
      mode: 'full',
      sourceEventId: 'ambiguous-1',
      sourceSequence: 1,
      observedAt: '2026-09-05T04:00:00.000Z',
      items: [
        { sourceKey: 'raw:a', title: 'Active A', status: 'in_progress', order: 0 },
        { sourceKey: 'raw:b', title: 'Active B', status: 'in_progress', order: 1 },
      ],
    };
    const second: AgentPlanSnapshot = {
      ...first,
      sourceEventId: 'ambiguous-2',
      sourceSequence: 2,
      observedAt: '2026-09-05T04:01:00.000Z',
      items: [
        { sourceKey: 'raw:x', title: 'Renamed X', status: 'in_progress', order: 0 },
        { sourceKey: 'raw:y', title: 'Renamed Y', status: 'in_progress', order: 1 },
      ],
    };
    const before = await store.correlate(first);
    const after = await store.correlate(second);
    expect(
      after.diagnostics.some((item) => item.code === 'TASK_MIRROR_BINDING_RENAME_AMBIGUOUS')
    ).toBe(true);
    expect(after.snapshot!.items[0]!.sourceKey).not.toBe(before.snapshot!.items[0]!.sourceKey);
  });

  it('isolates identical native titles across different sessions', async () => {
    const p = project();
    const store = new TaskMirrorBindingStore(p);
    const base: AgentPlanSnapshot = {
      version: 1,
      projectId: p.id,
      provider: 'codex',
      agentId: 'codex',
      nativeSessionId: 'session-a',
      planId: 'codex:update_plan',
      mode: 'full',
      sourceEventId: 'session-a-event',
      sourceSequence: 1,
      observedAt: '2026-09-05T05:00:00.000Z',
      items: [
        { sourceKey: 'same-native-key', title: 'Same task title', status: 'in_progress', order: 0 },
      ],
      currentSourceKey: 'same-native-key',
    };
    const a = await store.correlate(base);
    const b = await store.correlate({
      ...base,
      nativeSessionId: 'session-b',
      sourceEventId: 'session-b-event',
    });
    expect(a.snapshot!.items[0]!.sourceKey).not.toBe(b.snapshot!.items[0]!.sourceKey);
  });
});
