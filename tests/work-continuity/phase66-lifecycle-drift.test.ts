import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { MemoryRecord, ProjectManifest } from '../../src/core/types.js';
import {
  inspectLifecycleDrift,
  inspectMemoryLifecycle,
} from '../../src/work-continuity/lifecycle-drift.js';
import {
  maintainRetrievalTelemetry,
  retrievalTelemetryPath,
} from '../../src/work-continuity/retrieval-telemetry.js';
import {
  adaptiveOverridesPath,
  maintainAdaptiveRetrievalOverrides,
} from '../../src/work-continuity/retrieval-feedback.js';

const roots: string[] = [];

function project(): ProjectManifest {
  const root = mkdtempSync(join(tmpdir(), 'toolnet-phase66-test-'));
  roots.push(root);
  mkdirSync(join(root, '.toolnet', 'retrieval'), { recursive: true });
  return {
    id: `phase66-${roots.length}`,
    name: 'phase66-test',
    rootPath: root,
    createdAt: '2026-09-08T00:00:00.000Z',
    updatedAt: '2026-09-08T00:00:00.000Z',
    graphVersion: 1,
    memoryVersion: 1,
  };
}

function oldMemory(
  manifest: ProjectManifest,
  id: string,
  scope: MemoryRecord['scope'],
  type: MemoryRecord['type']
): MemoryRecord {
  return {
    id,
    projectId: manifest.id,
    type,
    content: id,
    scope,
    observedAt: '2025-01-01T00:00:00.000Z',
    staleAfter: '2025-02-01T00:00:00.000Z',
    confidence: 0.95,
    importance: scope === 'rule' ? 'high' : 'normal',
    importanceScore: 90,
    tags: [],
    source: 'phase66-test',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    metadata: {},
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('Phase 66 lifecycle and drift control', () => {
  it('protects stale long-term rules while identifying old non-rule archive candidates', () => {
    const manifest = project();
    const report = inspectMemoryLifecycle(
      [
        oldMemory(manifest, 'rule', 'rule', 'rule'),
        oldMemory(manifest, 'history', 'history', 'activity'),
      ],
      Date.parse('2026-09-08T00:00:00.000Z')
    );
    expect(report.protectedRules).toBe(1);
    expect(report.staleRules).toBe(1);
    expect(report.archiveCandidateIds).not.toContain('rule');
    expect(report.archiveCandidateIds).toContain('history');
  });

  it('detects Memory projection conflicts and invalid keys as hard drift', () => {
    const manifest = project();
    const report = inspectLifecycleDrift(manifest, [], {
      operationCount: 5,
      conflicts: 1,
      invalidKeys: 2,
    });
    expect(report.ok).toBe(false);
    expect(report.projection.conflicts).toBe(1);
    expect(report.projection.invalidKeys).toBe(2);
  });

  it('repairs malformed telemetry and removes records outside lifecycle window', () => {
    const manifest = project();
    const file = retrievalTelemetryPath(manifest);
    const valid = {
      version: 1,
      eventId: 'recent',
      occurredAt: '2026-09-08T00:00:00.000Z',
      surface: 'cli',
      outcome: 'success',
      durationMs: 1,
      mode: 'single',
      intents: [],
      plannedSources: [],
      attemptedSources: [],
      selectedSource: 'none',
      omittedIntents: [],
      primaryConfidence: 1,
      resultCount: 0,
      answerChars: 0,
      estimatedTokens: 0,
      provenanceCoverage: 1,
      conflicts: [],
      sourceBudgetExceeded: false,
    };
    const old = {
      ...valid,
      eventId: 'old',
      occurredAt: '2026-01-01T00:00:00.000Z',
    };
    writeFileSync(
      file,
      [JSON.stringify(old), JSON.stringify(valid), '{"broken":', ''].join('\n'),
      'utf8'
    );
    const result = maintainRetrievalTelemetry(manifest, {
      now: Date.parse('2026-09-08T12:00:00.000Z'),
      maxAgeDays: 30,
    });
    expect(result.removedExpired).toBe(1);
    expect(result.removedMalformed).toBe(1);
    expect(result.after.invalidLines).toBe(0);
    const raw = readFileSync(file, 'utf8');
    expect(raw).toContain('"recent"');
    expect(raw).not.toContain('"old"');
  });

  it('expires stale adaptive rules and preserves the 65-case benchmark', () => {
    const manifest = project();
    writeFileSync(
      adaptiveOverridesPath(manifest),
      `${JSON.stringify(
        {
          version: 1,
          updatedAt: '2026-01-01T00:00:00.000Z',
          benchmarkVersion: 'phase62-v2',
          rules: [
            {
              ruleId: 'expired',
              routeSignature: 'summary|phase66-old',
              fromIntent: 'summary',
              toIntent: 'code',
              fromSource: 'persistent-tasks',
              toSource: 'code-intelligence',
              support: 3,
              totalFeedback: 3,
              confidence: 1,
              activatedAt: '2026-01-01T00:00:00.000Z',
              lastConfirmedAt: '2026-01-01T00:00:00.000Z',
              benchmarkVersion: 'phase62-v2',
            },
          ],
        },
        null,
        2
      )}\n`,
      'utf8'
    );
    const result = maintainAdaptiveRetrievalOverrides(
      manifest,
      Date.parse('2026-09-08T00:00:00.000Z')
    );
    expect(result.expiredRuleIds).toContain('expired');
    expect(result.after.effectiveRules).toBe(0);
    expect(result.benchmarkPassed).toBe(true);
    expect(result.after.benchmarkCases).toBe(65);
  });
});
