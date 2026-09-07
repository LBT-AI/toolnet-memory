import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { MemoryRecord, ProjectManifest } from '../../src/core/types.js';
import {
  filterMemoryQualityItems,
  inspectMemoryQuality,
  memoryConfidenceBand,
} from '../../src/memory/quality.js';
import { inspectActiveTaskArtifactPaths } from '../../src/production/artifact-path-health.js';
import { TaskStateEngine } from '../../src/tasks/state-engine.js';
import { TaskStore } from '../../src/tasks/store.js';

const roots: string[] = [];
const NOW = Date.parse('2026-09-08T00:00:00.000Z');

function memory(overrides: Partial<MemoryRecord>): MemoryRecord {
  return {
    id: 'memory',
    projectId: 'phase57',
    type: 'activity',
    content: 'Memory value',
    scope: 'observation',
    observedAt: '2026-09-07T00:00:00.000Z',
    confidence: 0.95,
    staleAfter: '2026-09-20T00:00:00.000Z',
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

function project(): ProjectManifest {
  const root = mkdtempSync(join(tmpdir(), 'toolnet-phase57-'));
  roots.push(root);
  mkdirSync(join(root, '.toolnet'), { recursive: true });
  return {
    id: `phase57-${roots.length}`,
    name: 'phase57-test',
    rootPath: root,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-08T00:00:00.000Z',
    graphVersion: 1,
    memoryVersion: 1,
  };
}

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop();
    if (!root) {
      continue;
    }
    rmSync(root, { recursive: true, force: true });
  }
});

describe('Phase 57 Memory Quality', () => {
  it('classifies fresh, verification-needed and stale without mutating canonical Memory', () => {
    const memories: MemoryRecord[] = [
      memory({
        id: 'verified-rule',
        type: 'rule',
        scope: 'rule',
        content: 'Always verify production deploys.',
        confidence: 0.99,
        verifiedAt: '2026-09-01T00:00:00.000Z',
        staleAfter: undefined,
      }),
      memory({
        id: 'fresh-fact',
        scope: 'fact',
        content: 'Current API uses v2.',
        confidence: 0.95,
        verifiedAt: '2026-09-07T00:00:00.000Z',
      }),
      memory({
        id: 'needs-check',
        scope: 'fact',
        content: 'Possible production port.',
        confidence: 0.55,
        verifiedAt: undefined,
      }),
      memory({
        id: 'stale-note',
        scope: 'observation',
        content: 'Old deployment state.',
        confidence: 0.98,
        staleAfter: '2026-08-01T00:00:00.000Z',
      }),
    ];
    const before = JSON.stringify(memories);
    const report = inspectMemoryQuality(memories, NOW);
    expect(report.total).toBe(4);
    expect(report.rules).toBe(1);
    expect(report.fresh).toBe(2);
    expect(report.needsVerification).toBe(1);
    expect(report.stale).toBe(1);
    expect(report.highConfidence).toBe(3);
    expect(report.lowConfidence).toBe(1);
    /*
     * Review must be read-only.
     */
    expect(JSON.stringify(memories)).toBe(before);
  });

  it('filters verification and stale entries deterministically', () => {
    const report = inspectMemoryQuality(
      [
        memory({
          id: 'fresh',
          confidence: 0.95,
          verifiedAt: '2026-09-07T00:00:00.000Z',
        }),
        memory({
          id: 'verify',
          confidence: 0.4,
          verifiedAt: undefined,
        }),
        memory({
          id: 'stale',
          confidence: 1,
          staleAfter: '2026-08-01T00:00:00.000Z',
        }),
      ],
      NOW
    );
    expect(
      filterMemoryQualityItems(report, { freshness: ['needs_verification'] }).map((item) => item.id)
    ).toEqual(['verify']);
    expect(
      filterMemoryQualityItems(report, { freshness: ['stale'] }).map((item) => item.id)
    ).toEqual(['stale']);
  });

  it('uses stable confidence bands', () => {
    expect(memoryConfidenceBand(0.95)).toBe('high');
    expect(memoryConfidenceBand(0.75)).toBe('medium');
    expect(memoryConfidenceBand(0.2)).toBe('low');
  });

  it('reports missing local Artifact paths for active Tasks only', async () => {
    const manifest = project();
    const store = new TaskStore(manifest);
    const state = new TaskStateEngine(store);
    const task = await store.createTask({
      id: 'active-artifacts',
      kind: 'task',
      title: 'Production artifact test',
      priority: 'high',
    });
    await state.start(task.id);
    const existing = join(manifest.rootPath, 'reports', 'seo.json');
    mkdirSync(join(manifest.rootPath, 'reports'), { recursive: true });
    writeFileSync(existing, '{}\n', 'utf8');
    await state.addEvidence(task.id, {
      kind: 'artifact',
      summary: 'SEO report',
      artifact: {
        key: 'seo-report',
        type: 'seo-audit',
        state: 'verified',
        path: 'reports/seo.json',
      },
    });
    await state.addEvidence(task.id, {
      kind: 'artifact',
      summary: 'Missing backup',
      artifact: {
        key: 'backup',
        type: 'backup',
        state: 'executed',
        path: '/tmp/toolnet-phase57-does-not-exist',
        exitCode: 0,
      },
    });
    await state.addEvidence(task.id, {
      kind: 'artifact',
      summary: 'Remote report',
      artifact: {
        key: 'remote',
        type: 'report',
        state: 'verified',
        path: 'https://example.test/report.json',
      },
    });
    const health = inspectActiveTaskArtifactPaths(manifest);
    expect(health.total).toBe(3);
    expect(health.local).toBe(2);
    expect(health.remote).toBe(1);
    expect(health.existing).toBe(1);
    expect(health.missing).toBe(1);
    expect(health.ok).toBe(false);
    /*
     * Completed historical artifacts should not
     * keep doctor red forever.
     */
    await store.setTaskStatus(task.id, 'completed');
    const after = inspectActiveTaskArtifactPaths(manifest);
    expect(after.total).toBe(0);
    expect(after.missing).toBe(0);
    expect(after.ok).toBe(true);
  });
});
