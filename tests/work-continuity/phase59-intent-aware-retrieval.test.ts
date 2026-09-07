import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { MemoryRecord, ProjectManifest } from '../../src/core/types.js';
import { TaskStateEngine } from '../../src/tasks/state-engine.js';
import { TaskStore } from '../../src/tasks/store.js';
import {
  retrieveIntentAwareAnswer,
  routeRetrievalIntent,
} from '../../src/work-continuity/intent-aware-retrieval.js';

const roots: string[] = [];

function project(): ProjectManifest {
  const root = mkdtempSync(join(tmpdir(), 'toolnet-phase59-'));
  roots.push(root);
  mkdirSync(join(root, '.toolnet'), { recursive: true });
  return {
    id: `phase59-${roots.length}`,
    name: 'phase59-test',
    rootPath: root,
    createdAt: '2026-09-08T00:00:00.000Z',
    updatedAt: '2026-09-08T00:00:00.000Z',
    graphVersion: 1,
    memoryVersion: 1,
  };
}

function memory(overrides: Partial<MemoryRecord>): MemoryRecord {
  return {
    id: 'memory',
    projectId: 'phase59',
    type: 'activity',
    content: 'memory',
    scope: 'observation',
    observedAt: '2026-09-08T00:00:00.000Z',
    verifiedAt: '2026-09-08T00:00:00.000Z',
    staleAfter: '2026-10-08T00:00:00.000Z',
    confidence: 0.95,
    importance: 'normal',
    importanceScore: 80,
    tags: [],
    source: 'phase59-test',
    createdAt: '2026-09-08T00:00:00.000Z',
    updatedAt: '2026-09-08T00:00:00.000Z',
    metadata: {},
    ...overrides,
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('Phase 59 Intent-Aware Retrieval Router', () => {
  it('classifies the major source intents deterministically', () => {
    expect(routeRetrievalIntent('task hiện tại là gì?').intent).toBe('current_work');
    expect(routeRetrievalIntent('deploy production đã verified chưa?').intent).toBe('artifact');
    expect(routeRetrievalIntent('quy tắc production là gì?').intent).toBe('rules');
    expect(routeRetrievalIntent('vì sao chọn append-only operation log?').intent).toBe('decision');
    expect(routeRetrievalIntent('TaskStore class được định nghĩa ở đâu?').intent).toBe('code');
    expect(routeRetrievalIntent('lịch sử replication trước đây thế nào?').intent).toBe('history');
    expect(routeRetrievalIntent('agent trước là ai?').intent).toBe('continuity');
  });

  it('answers current work from Persistent Tasks without loading Memory or Code', async () => {
    const manifest = project();
    const store = new TaskStore(manifest);
    const state = new TaskStateEngine(store);
    const task = await store.createTask({
      id: 'current-task',
      kind: 'task',
      title: 'Implement Phase 59 router',
      priority: 'high',
    });
    await state.start(task.id);
    await state.setNextAction(task.id, 'Run Phase 59 tests');
    let memoryReads = 0;
    let codeReads = 0;
    const result = await retrieveIntentAwareAnswer(manifest, 'task hiện tại là gì?', {
      loadMemories: async () => {
        memoryReads += 1;
        return [];
      },
      searchCode: async () => {
        codeReads += 1;
        return [];
      },
    });
    expect(result.source).toBe('persistent-tasks');
    expect(result.answer).toContain('Implement Phase 59 router');
    expect(result.answer).toContain('Run Phase 59 tests');
    expect(memoryReads).toBe(0);
    expect(codeReads).toBe(0);
    expect(result.attemptedSources).toEqual(['persistent-tasks']);
  });

  it('routes Artifact state to Task evidence and never interprets executed as verified', async () => {
    const manifest = project();
    const store = new TaskStore(manifest);
    const state = new TaskStateEngine(store);
    const task = await store.createTask({
      id: 'deploy-task',
      kind: 'task',
      title: 'Production deploy',
      priority: 'high',
    });
    await state.start(task.id);
    await state.addEvidence(task.id, {
      kind: 'artifact',
      summary: 'Production deploy',
      artifact: {
        key: 'production',
        type: 'deploy',
        state: 'executed',
        command: 'npm run deploy',
        exitCode: 0,
      },
    });
    const result = await retrieveIntentAwareAnswer(manifest, 'deploy production đã verified chưa?');
    expect(result.source).toBe('task-artifacts');
    expect(result.answer).toContain('[executed] deploy');
    expect(result.answer).not.toContain('[verified] deploy');
  });

  it('loads only canonical Memory for a rule query and excludes stale rules', async () => {
    const manifest = project();
    let memoryReads = 0;
    let codeReads = 0;
    const result = await retrieveIntentAwareAnswer(manifest, 'quy tắc deploy production là gì?', {
      now: Date.parse('2026-09-08T12:00:00.000Z'),
      loadMemories: async () => {
        memoryReads += 1;
        return [
          memory({
            id: 'fresh-rule',
            projectId: manifest.id,
            type: 'rule',
            scope: 'rule',
            content: 'Production deploy must be verified after execution.',
            confidence: 0.99,
            verifiedAt: '2026-09-08T00:00:00.000Z',
            staleAfter: undefined,
          }),
          memory({
            id: 'stale-rule',
            projectId: manifest.id,
            type: 'rule',
            scope: 'rule',
            content: 'OLD production deploy rule.',
            confidence: 0.99,
            verifiedAt: '2026-01-01T00:00:00.000Z',
            staleAfter: '2026-02-01T00:00:00.000Z',
          }),
        ];
      },
      searchCode: async () => {
        codeReads += 1;
        return [];
      },
    });
    expect(result.source).toBe('canonical-memory');
    expect(result.answer).toContain('Production deploy must be verified');
    expect(result.answer).not.toContain('OLD production deploy rule');
    expect(memoryReads).toBe(1);
    expect(codeReads).toBe(0);
  });

  it('uses Code Intelligence only for code questions', async () => {
    const manifest = project();
    let memoryReads = 0;
    let codeReads = 0;
    const result = await retrieveIntentAwareAnswer(
      manifest,
      'TaskStore class được định nghĩa ở đâu?',
      {
        loadMemories: async () => {
          memoryReads += 1;
          return [];
        },
        searchCode: async () => {
          codeReads += 1;
          return [
            {
              filePath: 'src/tasks/store.ts',
              symbolName: 'TaskStore',
              startLine: 30,
              endLine: 120,
              content: 'export class TaskStore { ... }',
              score: 0.99,
            },
          ];
        },
      }
    );
    expect(result.source).toBe('code-intelligence');
    expect(result.answer).toContain('src/tasks/store.ts:30-120');
    expect(result.answer).toContain('[TaskStore]');
    expect(codeReads).toBe(1);
    expect(memoryReads).toBe(0);
    expect(result.attemptedSources).toEqual(['code-intelligence']);
  });

  it('allows stale Memory only for explicit historical queries', async () => {
    const manifest = project();
    const memories = [
      memory({
        id: 'old-history',
        projectId: manifest.id,
        type: 'activity',
        scope: 'history',
        content: 'Replication originally used a legacy synchronization path.',
        observedAt: '2026-01-01T00:00:00.000Z',
        verifiedAt: undefined,
        staleAfter: '2026-02-01T00:00:00.000Z',
        confidence: 0.91,
      }),
    ];
    const historical = await retrieveIntentAwareAnswer(
      manifest,
      'lịch sử replication trước đây thế nào?',
      {
        now: Date.parse('2026-09-08T00:00:00.000Z'),
        loadMemories: async () => memories,
      }
    );
    expect(historical.source).toBe('canonical-memory');
    expect(historical.answer).toContain('legacy synchronization path');
    expect(historical.answer).toContain('[stale]');
  });

  it('does not fan out when the first selected source succeeds', async () => {
    const manifest = project();
    let memoryReads = 0;
    let codeReads = 0;
    const store = new TaskStore(manifest);
    const state = new TaskStateEngine(store);
    const task = await store.createTask({
      kind: 'task',
      title: 'Canonical current Task',
      priority: 'normal',
    });
    await state.start(task.id);
    const result = await retrieveIntentAwareAnswer(manifest, 'tóm tắt tình hình hiện tại', {
      loadMemories: async () => {
        memoryReads += 1;
        return [];
      },
      searchCode: async () => {
        codeReads += 1;
        return [];
      },
    });
    expect(result.source).toBe('persistent-tasks');
    expect(memoryReads).toBe(0);
    expect(codeReads).toBe(0);
    expect(result.stats.attempted).toBe(1);
  });
});
