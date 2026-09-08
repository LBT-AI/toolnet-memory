import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { MemoryRecord, ProjectManifest } from '../core/types.js';
import { inspectLifecycleDrift } from '../work-continuity/lifecycle-drift.js';
import {
  adaptiveOverridesPath,
  maintainAdaptiveRetrievalOverrides,
} from '../work-continuity/retrieval-feedback.js';
import {
  inspectRetrievalTelemetryFile,
  maintainRetrievalTelemetry,
  retrievalTelemetryPath,
} from '../work-continuity/retrieval-telemetry.js';

export interface LifecycleCertificationResult {
  passed: boolean;
  staleRuleProtected: boolean;
  staleObservationArchivedCandidate: boolean;
  canonicalMemoryUntouched: boolean;
  telemetryAgeRetention: boolean;
  telemetryCorruptRepair: boolean;
  telemetryBounded: boolean;
  adaptiveExpiredRuleRemoved: boolean;
  adaptiveBenchmarkPass: boolean;
  projectionDriftDetected: boolean;
  detail?: string;
}

function project(rootPath: string): ProjectManifest {
  return {
    id: 'phase66-lifecycle',
    name: 'phase66-lifecycle',
    rootPath,
    createdAt: '2026-09-08T00:00:00.000Z',
    updatedAt: '2026-09-08T00:00:00.000Z',
    graphVersion: 1,
    memoryVersion: 1,
  };
}

function memory(
  manifest: ProjectManifest,
  options: {
    id: string;
    scope: MemoryRecord['scope'];
    type: MemoryRecord['type'];
    observedAt: string;
  }
): MemoryRecord {
  return {
    id: options.id,
    projectId: manifest.id,
    type: options.type,
    content: `phase66-${options.id}`,
    scope: options.scope,
    observedAt: options.observedAt,
    confidence: 0.95,
    importance: options.scope === 'rule' ? 'high' : 'normal',
    importanceScore: 90,
    tags: [],
    source: 'phase66-certify',
    createdAt: options.observedAt,
    updatedAt: options.observedAt,
    staleAfter: '2026-01-02T00:00:00.000Z',
    metadata: {},
  };
}

function telemetryEvent(index: number, occurredAt: string) {
  return {
    version: 1,
    eventId: `phase66-${index}`,
    occurredAt,
    surface: 'cli',
    outcome: 'success',
    durationMs: 10,
    mode: 'single',
    intents: ['current_work'],
    plannedSources: ['persistent-tasks'],
    attemptedSources: ['persistent-tasks'],
    selectedSource: 'persistent-tasks',
    omittedIntents: [],
    primaryConfidence: 1,
    resultCount: 1,
    answerChars: 10,
    estimatedTokens: 3,
    provenanceCoverage: 1,
    conflicts: [],
    sourceBudgetExceeded: false,
  };
}

export function certifyLifecycleDriftControl(): LifecycleCertificationResult {
  const root = mkdtempSync(join(tmpdir(), 'toolnet-phase66-'));
  const manifest = project(root);
  try {
    mkdirSync(join(root, '.toolnet', 'retrieval'), { recursive: true });
    const now = Date.parse('2026-09-08T12:00:00.000Z');
    const memories = [
      memory(manifest, {
        id: 'protected-rule',
        scope: 'rule',
        type: 'rule',
        observedAt: '2025-01-01T00:00:00.000Z',
      }),
      memory(manifest, {
        id: 'old-observation',
        scope: 'observation',
        type: 'activity',
        observedAt: '2025-01-01T00:00:00.000Z',
      }),
    ];
    const originalMemoryJson = JSON.stringify(memories);
    const healthy = inspectLifecycleDrift(
      manifest,
      memories,
      {
        operationCount: 10,
        conflicts: 0,
        invalidKeys: 0,
      },
      now
    );
    const staleRuleProtected =
      healthy.memory.protectedRules === 1 &&
      !healthy.memory.archiveCandidateIds.includes('protected-rule');
    const staleObservationArchivedCandidate =
      healthy.memory.archiveCandidateIds.includes('old-observation');

    // --------------------------------------------------------
    // Telemetry soak:
    // old events + recent events + malformed tail.
    // --------------------------------------------------------
    const telemetryFile = retrievalTelemetryPath(manifest);
    const telemetryLines: string[] = [];
    for (let index = 0; index < 120; index += 1) {
      telemetryLines.push(
        JSON.stringify(
          telemetryEvent(
            index,
            index < 20 ? '2026-01-01T00:00:00.000Z' : '2026-09-08T10:00:00.000Z'
          )
        )
      );
    }
    telemetryLines.push('{"partial":');
    writeFileSync(telemetryFile, `${telemetryLines.join('\n')}\n`, 'utf8');
    const beforeTelemetry = inspectRetrievalTelemetryFile(manifest, {
      now,
      maxAgeDays: 30,
      maxEvents: 50,
      maxBytes: 1024 * 1024,
    });
    const telemetryMaintenance = maintainRetrievalTelemetry(manifest, {
      now,
      maxAgeDays: 30,
      maxEvents: 50,
      maxBytes: 1024 * 1024,
    });
    const telemetryAgeRetention = telemetryMaintenance.removedExpired === 20;
    const telemetryCorruptRepair =
      beforeTelemetry.invalidLines === 1 && telemetryMaintenance.after.invalidLines === 0;
    const telemetryBounded = telemetryMaintenance.after.validEvents <= 50;

    // --------------------------------------------------------
    // Expired adaptive rule.
    // --------------------------------------------------------
    const overridesFile = adaptiveOverridesPath(manifest);
    writeFileSync(
      overridesFile,
      `${JSON.stringify(
        {
          version: 1,
          updatedAt: '2026-01-01T00:00:00.000Z',
          benchmarkVersion: 'phase62-v2',
          rules: [
            {
              ruleId: 'phase66-expired',
              routeSignature: 'summary|phase66-expired',
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
    const adaptiveMaintenance = maintainAdaptiveRetrievalOverrides(manifest, now);
    const adaptiveExpiredRuleRemoved =
      adaptiveMaintenance.expiredRuleIds.includes('phase66-expired') &&
      adaptiveMaintenance.after.effectiveRules === 0;
    const adaptiveBenchmarkPass =
      adaptiveMaintenance.benchmarkPassed && adaptiveMaintenance.after.benchmarkPassed;

    // --------------------------------------------------------
    // Projection corruption must be detected.
    // --------------------------------------------------------
    const drift = inspectLifecycleDrift(
      manifest,
      memories,
      {
        operationCount: 10,
        conflicts: 1,
        invalidKeys: 1,
      },
      now
    );
    const projectionDriftDetected =
      !drift.ok && drift.projection.conflicts === 1 && drift.projection.invalidKeys === 1;

    const canonicalMemoryUntouched = JSON.stringify(memories) === originalMemoryJson;
    const passed =
      staleRuleProtected &&
      staleObservationArchivedCandidate &&
      canonicalMemoryUntouched &&
      telemetryAgeRetention &&
      telemetryCorruptRepair &&
      telemetryBounded &&
      adaptiveExpiredRuleRemoved &&
      adaptiveBenchmarkPass &&
      projectionDriftDetected;
    return {
      passed,
      staleRuleProtected,
      staleObservationArchivedCandidate,
      canonicalMemoryUntouched,
      telemetryAgeRetention,
      telemetryCorruptRepair,
      telemetryBounded,
      adaptiveExpiredRuleRemoved,
      adaptiveBenchmarkPass,
      projectionDriftDetected,
      ...(passed
        ? {}
        : {
            detail: JSON.stringify(
              {
                healthy,
                beforeTelemetry,
                telemetryMaintenance,
                adaptiveMaintenance,
                drift,
              },
              null,
              2
            ),
          }),
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
