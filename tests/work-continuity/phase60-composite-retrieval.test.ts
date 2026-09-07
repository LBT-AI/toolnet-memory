import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { MemoryRecord, ProjectManifest } from '../../src/core/types.js';
import {
  planCompositeRetrieval,
  retrieveCompositeAnswer,
} from '../../src/work-continuity/composite-retrieval.js';
import { retrieveIntentAwareAnswer } from '../../src/work-continuity/intent-aware-retrieval.js';
import { TaskStateEngine } from '../../src/tasks/state-engine.js';
import { TaskStore } from '../../src/tasks/store.js';

const roots: string[] = [];

function project(): ProjectManifest {
  const root = mkdtempSync(join(tmpdir(), 'toolnet-phase60-'));
  roots.push(root);
  mkdirSync(join(root, '.toolnet'), { recursive: true });
  return {
    id: `phase60-${roots.length}`,
    name: 'phase60-test',
    rootPath: root,
    createdAt: '2026-09-08T00:00:00.000Z',
    updatedAt: '2026-09-08T00:00:00.000Z',
    graphVersion: 1,
    memoryVersion: 1,
  };
}

function memory(projectId: string, overrides: Partial<MemoryRecord>): MemoryRecord {
  return {
    id: 'phase60-memory',
    projectId,
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
    source: 'phase60-test',
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

describe('Phase 60 Composite Retrieval Planner', () => {
  it('preserves exact Phase 59 behavior for a single-intent query', async () => {
    const manifest = project();
    const store = new TaskStore(manifest);
    const state = new TaskStateEngine(store);
    const task = await store.createTask({
      kind: 'task',
      title: 'Single intent Task',
      priority: 'high',
    });
    await state.start(task.id);
    await state.setNextAction(task.id, 'Run tests');
    const direct = await retrieveIntentAwareAnswer(manifest, 'task hiện tại là gì?');
    const composite = await retrieveCompositeAnswer(manifest, 'task hiện tại là gì?');
    expect(composite.mode).toBe('single');
    expect(composite.answer).toBe(direct.answer);
    expect(composite.source).toBe(direct.source);
    expect(composite.attemptedSources).toEqual(direct.attemptedSources);
  });

  it('combines Current Work and Artifact Evidence without reading Memory or Code', async () => {
    const manifest = project();
    const store = new TaskStore(manifest);
    const state = new TaskStateEngine(store);
    const task = await store.createTask({
      id: 'phase60-current',
      kind: 'task',
      title: 'Implement Composite Planner',
      priority: 'high',
    });
    await state.start(task.id);
    await state.touchFile(task.id, 'src/work-continuity/composite-retrieval.ts');
    await state.setNextAction(task.id, 'Run Phase 60 certification');
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
    let memoryReads = 0;
    let codeReads = 0;
    const result = await retrieveCompositeAnswer(
      manifest,
      'Task hiện tại là gì, file nào đang sửa và deploy production đã verified chưa?',
      {
        loadMemories: async () => {
          memoryReads += 1;
          return [];
        },
        searchCode: async () => {
          codeReads += 1;
          return [];
        },
      }
    );
    expect(result.mode).toBe('composite');
    expect(result.plan.sources).toEqual(['persistent-tasks', 'task-artifacts']);
    expect(result.attemptedSources).toEqual(['persistent-tasks', 'task-artifacts']);
    expect(result.answer).toContain('Implement Composite Planner');
    expect(result.answer).toContain('src/work-continuity/composite-retrieval.ts');
    expect(result.answer).toContain('[executed] deploy');
    expect(result.answer).not.toContain('[verified] deploy');
    expect(result.answer).toContain('source: persistent-tasks');
    expect(result.answer).toContain('source: task-artifacts');
    expect(memoryReads).toBe(0);
    expect(codeReads).toBe(0);
  });

  it('executes three required sources but never performs full fan-out', async () => {
    const manifest = project();
    const store = new TaskStore(manifest);
    const state = new TaskStateEngine(store);
    const task = await store.createTask({
      id: 'three-source-task',
      kind: 'task',
      title: 'Three source Task',
      priority: 'high',
    });
    await state.start(task.id);
    await state.addEvidence(task.id, {
      kind: 'artifact',
      summary: 'Production deploy',
      artifact: {
        key: 'production',
        type: 'deploy',
        state: 'verified',
        path: '/tmp/deploy-report.json',
      },
    });
    let memoryReads = 0;
    let codeReads = 0;
    const result = await retrieveCompositeAnswer(
      manifest,
      'task hiện tại là gì, deploy production đã verified chưa và TaskStore class được định nghĩa ở đâu?',
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
              startLine: 40,
              endLine: 140,
              content: 'export class TaskStore { ... }',
              score: 0.99,
            },
          ];
        },
      }
    );
    expect(result.mode).toBe('composite');
    expect(result.plan.sources).toEqual([
      'persistent-tasks',
      'task-artifacts',
      'code-intelligence',
    ]);
    expect(result.attemptedSources.length).toBe(3);
    expect(new Set(result.attemptedSources).size).toBe(3);
    expect(result.answer.indexOf('## Current Work')).toBeLessThan(
      result.answer.indexOf('## Artifact Evidence')
    );
    expect(result.answer.indexOf('## Artifact Evidence')).toBeLessThan(
      result.answer.indexOf('## Code Intelligence')
    );
    expect(result.answer).toContain('src/tasks/store.ts:40-140');
    expect(memoryReads).toBe(0);
    expect(codeReads).toBe(1);
  });

  it('hard-bounds planning to three distinct sources', () => {
    const plan = planCompositeRetrieval(
      [
        'task hiện tại là gì',
        'deploy production verified chưa',
        'TaskStore class được định nghĩa ở đâu',
        'vì sao chọn append-only operation log',
      ].join(' và ')
    );
    expect(plan.mode).toBe('composite');
    expect(plan.sources.length).toBeLessThanOrEqual(3);
    expect(plan.sources).toEqual(['persistent-tasks', 'task-artifacts', 'code-intelligence']);
    expect(plan.omittedIntents).toContain('decision');
  });

  it('shares one canonical Memory load across multiple Memory intents', async () => {
    const manifest = project();
    let memoryReads = 0;
    const memories: MemoryRecord[] = [
      memory(manifest.id, {
        id: 'rule',
        type: 'rule',
        scope: 'rule',
        content: 'Production deploy must be verified after execution.',
        confidence: 0.99,
        staleAfter: undefined,
      }),
      memory(manifest.id, {
        id: 'decision',
        type: 'decision',
        scope: 'decision',
        content: 'Append-only operation logs were selected for deterministic replay.',
        confidence: 0.98,
      }),
    ];
    const result = await retrieveCompositeAnswer(
      manifest,
      'quy tắc production là gì và vì sao chọn append-only operation log?',
      {
        now: Date.parse('2026-09-08T12:00:00.000Z'),
        loadMemories: async () => {
          memoryReads += 1;
          return memories;
        },
      }
    );
    expect(result.mode).toBe('composite');
    /*
     * Two intents.
     * One physical source.
     */
    expect(result.plan.sources).toEqual(['canonical-memory']);
    expect(memoryReads).toBe(1);
    expect(result.answer).toContain('Production deploy must be verified');
    expect(result.answer).toContain('Append-only operation logs were selected');
  });

  it('detects Memory conflict but keeps Task Artifact Evidence authoritative', async () => {
    const manifest = project();
    const store = new TaskStore(manifest);
    const state = new TaskStateEngine(store);
    const task = await store.createTask({
      id: 'conflict-task',
      kind: 'task',
      title: 'Production deployment',
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
    const result = await retrieveCompositeAnswer(
      manifest,
      'deploy production đã verified chưa và trạng thái production gần đây là gì?',
      {
        now: Date.parse('2026-09-08T12:00:00.000Z'),
        loadMemories: async () => [
          memory(manifest.id, {
            id: 'wrong-state',
            scope: 'observation',
            content: 'Production deploy đã verified và hoàn tất thành công.',
            confidence: 0.98,
          }),
        ],
      }
    );
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]?.code).toBe('MEMORY_TASK_STATE_CONFLICT');
    expect(result.conflicts[0]?.authoritativeSource).toBe('task-artifacts');
    expect(result.conflicts[0]?.authoritativeState).toBe('executed');
    expect(result.conflicts[0]?.conflictingState).toBe('verified');
    expect(result.answer).toContain('[executed] deploy');
    expect(result.answer).toContain('MEMORY_TASK_STATE_CONFLICT');
    /*
     * Artifact authority must render before Memory.
     */
    expect(result.answer.indexOf('## Artifact Evidence')).toBeLessThan(
      result.answer.indexOf('## Recent State')
    );
  });

  it('keeps final composite context bounded', async () => {
    const manifest = project();
    const result = await retrieveCompositeAnswer(
      manifest,
      'quy tắc project là gì và vì sao chọn architecture hiện tại?',
      {
        maxChars: 2_500,
        loadMemories: async () => [
          memory(manifest.id, {
            id: 'large-rule',
            type: 'rule',
            scope: 'rule',
            content: `Rule ${'x'.repeat(2_000)}`,
            confidence: 0.99,
            staleAfter: undefined,
          }),
          memory(manifest.id, {
            id: 'large-decision',
            type: 'decision',
            scope: 'decision',
            content: `Decision ${'y'.repeat(2_000)}`,
            confidence: 0.98,
          }),
        ],
      }
    );
    expect(result.answer.length).toBeLessThanOrEqual(2_500);
  });
});
