import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { MemoryRecord, ProjectManifest } from '../../src/core/types.js';
import { ensureProjectManual } from '../../src/project-manual/index.js';
import type { StorageObject, StorageProvider } from '../../src/storage/types.js';
import { TaskStateEngine } from '../../src/tasks/state-engine.js';
import { TaskStore } from '../../src/tasks/store.js';
import { buildCurrentWorkProjection } from '../../src/work-continuity/current-work-projection.js';
import { buildFastProjectContext } from '../../src/work-continuity/fast-context.js';
import {
  renderCompactCurrentWork,
  selectCanonicalStartupMemories,
} from '../../src/work-continuity/context-noise-filter.js';
import { buildStartupBrief } from '../../src/work-continuity/brief.js';
import { writeFastHandoff } from '../../src/work-continuity/fast-handoff.js';

const roots: string[] = [];
const NOW = Date.parse('2026-09-08T00:00:00.000Z');

class MemoryStorage implements StorageProvider {
  readonly name = 'memory';
  readonly objects = new Map<string, Uint8Array>();
  async put(key: string, data: string | Uint8Array) {
    this.objects.set(key, typeof data === 'string' ? Buffer.from(data) : data);
  }
  async get(key: string) {
    return this.objects.get(key) ?? null;
  }
  async getText(key: string) {
    const value = await this.get(key);
    return value ? Buffer.from(value).toString('utf8') : null;
  }
  async exists(key: string) {
    return this.objects.has(key);
  }
  async delete(key: string) {
    this.objects.delete(key);
  }
  async list(prefix = ''): Promise<StorageObject[]> {
    return Array.from(this.objects.entries())
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => ({
        key,
        size: value.byteLength,
      }));
  }
}

function project(id = `phase56-${roots.length + 1}`): ProjectManifest {
  const root = mkdtempSync(join(tmpdir(), 'toolnet-phase56-'));
  roots.push(root);
  mkdirSync(join(root, '.toolnet'), {
    recursive: true,
  });
  const manifest: ProjectManifest = {
    id,
    name: 'Phase56',
    remote: 'Phase56',
    rootPath: root,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-08T00:00:00.000Z',
    graphVersion: 1,
    memoryVersion: 1,
  };
  writeFileSync(
    join(root, '.toolnet', 'project.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8'
  );
  return manifest;
}

function memory(overrides: Partial<MemoryRecord>): MemoryRecord {
  return {
    id: 'memory-base',
    projectId: 'phase56',
    type: 'activity',
    content: 'base',
    scope: 'observation',
    observedAt: '2026-09-07T00:00:00.000Z',
    verifiedAt: '2026-09-07T00:00:00.000Z',
    confidence: 0.95,
    staleAfter: '2026-10-01T00:00:00.000Z',
    importance: 'normal',
    importanceScore: 80,
    tags: [],
    source: 'test',
    createdAt: '2026-09-07T00:00:00.000Z',
    updatedAt: '2026-09-07T00:00:00.000Z',
    metadata: {},
    ...overrides,
  };
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

describe('Phase 56 Context Noise Filter and Ranking', () => {
  it('keeps verified rules and fresh high-confidence observations but does not mutate history', () => {
    const memories: MemoryRecord[] = [
      memory({
        id: 'rule-old',
        type: 'rule',
        scope: 'rule',
        content: 'Keep PostgreSQL.',
        observedAt: '2025-01-01T00:00:00.000Z',
        verifiedAt: '2026-08-01T00:00:00.000Z',
        confidence: 0.98,
        staleAfter: undefined,
        metadata: {
          evidence: {
            userExplicit: true,
          },
          knowledgeClass: 'permanent',
        },
      }),
      memory({
        id: 'fresh-observation',
        content: 'Current production API uses v2.',
        scope: 'fact',
        confidence: 0.96,
        observedAt: '2026-09-07T00:00:00.000Z',
        staleAfter: '2026-09-20T00:00:00.000Z',
      }),
      memory({
        id: 'stale-observation',
        content: 'OLD API endpoint should not inject.',
        scope: 'observation',
        confidence: 0.99,
        observedAt: '2026-07-01T00:00:00.000Z',
        staleAfter: '2026-08-01T00:00:00.000Z',
      }),
      memory({
        id: 'low-confidence',
        content: 'Maybe production uses another port.',
        scope: 'fact',
        confidence: 0.42,
        verifiedAt: undefined,
      }),
      memory({
        id: 'history-only',
        content: 'Historical completed task.',
        scope: 'history',
        confidence: 1,
      }),
    ];
    const before = JSON.stringify(memories);
    const selected = selectCanonicalStartupMemories(memories, NOW);
    expect(selected.rules).toContain('Keep PostgreSQL.');
    expect(selected.observations).toContain('Current production API uses v2.');
    expect(selected.observations.join('\n')).not.toContain('OLD API endpoint');
    expect(selected.observations.join('\n')).not.toContain('Maybe production');
    expect([...selected.rules, ...selected.observations].join('\n')).not.toContain(
      'Historical completed task'
    );
    /*
     * Filtering startup context must never edit canonical
     * Memory. Full history remains searchable by ask.
     */
    expect(JSON.stringify(memories)).toBe(before);
  });

  it('does not let a stale active Task outrank a newer fresh Task', async () => {
    const manifest = project();
    const store = new TaskStore(manifest);
    const old = await store.createTask({
      id: 'stale-active',
      kind: 'task',
      title: 'Old stale production task',
      priority: 'critical',
    });
    await store.applyStateOperation(
      {
        type: 'task.lifecycle.transition',
        taskId: old.id,
        status: 'active',
      },
      undefined,
      '2026-07-01T00:00:00.000Z'
    );
    const fresh = await store.createTask({
      id: 'fresh-pending',
      kind: 'task',
      title: 'Fresh current Task',
      priority: 'normal',
    });
    const projection = buildCurrentWorkProjection(manifest, {
      now: NOW,
    });
    expect(projection.authority).toBe('persistent-tasks');
    expect(projection.task?.id).toBe(fresh.id);
    expect(
      renderCompactCurrentWork(projection, {
        now: NOW,
      })
    ).not.toContain('Old stale production task');
  });

  it('does not resurrect session fallback when Persistent Tasks exist but are stale', async () => {
    const manifest = project();
    const store = new TaskStore(manifest);
    const task = await store.createTask({
      id: 'only-stale-task',
      kind: 'task',
      title: 'Stale Task',
      priority: 'high',
    });
    await store.applyStateOperation(
      {
        type: 'task.lifecycle.transition',
        taskId: task.id,
        status: 'active',
      },
      undefined,
      '2026-07-01T00:00:00.000Z'
    );
    const projection = buildCurrentWorkProjection(manifest, {
      now: NOW,
      fallback: {
        version: 1,
        projectId: manifest.id,
        projectName: manifest.name,
        currentRequest: 'OLD SESSION REQUEST',
        phases: [],
        tasks: [],
        decisions: [],
        blockers: ['OLD SESSION BLOCKER'],
        warnings: [],
        nextActions: ['OLD SESSION NEXT'],
        filesTouched: [],
        tests: [],
        progress: {
          phasesTotal: 0,
          phasesCompleted: 0,
          tasksTotal: 0,
          tasksCompleted: 0,
          blocked: 0,
        },
        updatedAt: '2026-09-07T00:00:00.000Z',
      },
    });
    expect(projection.source).toBe('empty');
    expect(projection.authority).toBe('persistent-tasks');
    const rendered = renderCompactCurrentWork(projection, {
      now: NOW,
    });
    expect(rendered).toContain('no fresh current Task');
    expect(rendered).not.toContain('OLD SESSION');
  });

  it('fast context suppresses duplicate/stale handoff when Persistent Tasks own current work and obeys hard budget', async () => {
    const manifest = project();
    writeFileSync(
      join(manifest.rootPath, '.toolnet', 'profile.md'),
      `# Profile
TypeScript project
Production service
`,
      'utf8'
    );
    /*
     * This unmanaged/current.md text must no longer beat
     * canonical Persistent Task projection.
     */
    writeFileSync(
      join(manifest.rootPath, '.toolnet', 'current.md'),
      `OLD SESSION CURRENT TASK SHOULD NOT APPEAR
OLD SESSION BLOCKER SHOULD NOT APPEAR
`,
      'utf8'
    );
    const manual = ensureProjectManual(manifest);
    writeFileSync(
      manual,
      `# Phase56
## Critical Rules
- [enforce] Never deploy without verification.
`,
      'utf8'
    );
    const store = new TaskStore(manifest);
    const state = new TaskStateEngine(store);
    const task = await store.createTask({
      id: 'current-production',
      kind: 'task',
      title: 'Verify current production deployment',
      priority: 'high',
    });
    await state.start(task.id);
    await state.setNextAction(task.id, 'Run health verification');
    await state.touchFile(task.id, 'src/production/deploy.ts');
    await state.addEvidence(task.id, {
      kind: 'artifact',
      summary: 'Production deployment',
      artifact: {
        key: 'production',
        type: 'deploy',
        state: 'executed',
        command: 'npm run deploy',
        exitCode: 0,
      },
    });
    writeFastHandoff(manifest, 'OLD HANDOFF TASK SHOULD NOT APPEAR');
    const context = buildFastProjectContext({
      projectPath: manifest.rootPath,
      agentId: 'opencode',
      maxChars: 4_200,
      now: NOW,
    });
    expect(context).not.toBeNull();
    expect(context).toContain('Verify current production deployment');
    expect(context).toContain('Run health verification');
    expect(context).toContain('src/production/deploy.ts');
    expect(context).toContain('[executed] deploy');
    expect(context).toContain('Never deploy without verification');
    expect(context).not.toContain('OLD SESSION CURRENT TASK');
    expect(context).not.toContain('OLD SESSION BLOCKER');
    expect(context).not.toContain('OLD HANDOFF TASK');
    /*
     * Phase 56 removes duplicate Task Session Bootstrap.
     */
    expect(context).not.toContain('[TOOLNET TASK RESUME]');
    expect(context!.length).toBeLessThanOrEqual(4_200);
  });

  it('deep brief uses Persistent Task state instead of stale remote WorkState', async () => {
    const manifest = project();
    const storage = new MemoryStorage();
    const manual = ensureProjectManual(manifest);
    writeFileSync(
      manual,
      `# Phase56
## Critical Rules
- [enforce] Production changes require verification.
`,
      'utf8'
    );
    const store = new TaskStore(manifest);
    const state = new TaskStateEngine(store);
    const task = await store.createTask({
      id: 'canonical-task',
      kind: 'task',
      title: 'Canonical Persistent Task',
      priority: 'high',
    });
    await state.start(task.id);
    await state.setNextAction(task.id, 'Verify canonical implementation');
    /*
     * Remote legacy WorkState intentionally conflicts
     * with Persistent Task truth.
     */
    await storage.put(
      `projects/${manifest.id}/work/current.json`,
      JSON.stringify({
        version: 1,
        projectId: manifest.id,
        projectName: manifest.name,
        goal: 'OLD REMOTE SESSION GOAL',
        currentRequest: 'OLD REMOTE SESSION REQUEST',
        phases: [],
        tasks: [],
        decisions: ['OLD REMOTE DECISION'],
        blockers: ['OLD REMOTE BLOCKER'],
        warnings: [],
        nextActions: ['OLD REMOTE NEXT ACTION'],
        filesTouched: [],
        tests: [],
        progress: {
          phasesTotal: 0,
          phasesCompleted: 0,
          tasksTotal: 0,
          tasksCompleted: 0,
          blocked: 0,
        },
        updatedAt: '2026-08-01T00:00:00.000Z',
      })
    );
    const brief = await buildStartupBrief({
      project: manifest,
      storage,
      maxTokens: 700,
    });
    expect(brief.text).toContain('Canonical Persistent Task');
    expect(brief.text).toContain('Verify canonical implementation');
    expect(brief.text).toContain('Production changes require verification');
    expect(brief.text).not.toContain('OLD REMOTE SESSION GOAL');
    expect(brief.text).not.toContain('OLD REMOTE SESSION REQUEST');
    expect(brief.text).not.toContain('OLD REMOTE DECISION');
    expect(brief.text).not.toContain('OLD REMOTE BLOCKER');
    expect(brief.estimatedTokens).toBeLessThanOrEqual(700);
  });
});
