import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ProjectManifest } from '../core/types.js';
import { memoryAgentAsk } from '../mcp/tools/memory-agent-ask.js';
import { certifyAdaptiveRetrieval } from './retrieval-adaptive-certify.js';
import { certifyPhase62Benchmark } from './retrieval-production-certify.js';
import { TaskStateEngine } from '../tasks/state-engine.js';
import { TaskStore } from '../tasks/store.js';
import {
  readRetrievalTelemetry,
  retrievalTelemetryPath,
} from '../work-continuity/retrieval-telemetry.js';

export interface RetrievalGaCertification {
  passed: boolean;
  benchmark65: boolean;
  adaptiveRouting: boolean;
  mcpSingle: boolean;
  mcpComposite: boolean;
  mcpNoAi: boolean;
  mcpTelemetry: boolean;
  telemetryPrivacy: boolean;
  taskAuthority: boolean;
  artifactAuthority: boolean;
  detail?: string;
}

function project(rootPath: string): ProjectManifest {
  return {
    id: 'phase65-retrieval-ga',
    name: 'phase65-retrieval-ga',
    rootPath,
    createdAt: '2026-09-08T00:00:00.000Z',
    updatedAt: '2026-09-08T00:00:00.000Z',
    graphVersion: 1,
    memoryVersion: 1,
  };
}

function recordValue(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
}

/**
 * Phase 65 final Retrieval GA certification.
 *
 * This is intentionally local-only:
 * no network, no LLM, no embeddings.
 */
export async function certifyRetrievalGa(): Promise<RetrievalGaCertification> {
  const root = mkdtempSync(join(tmpdir(), 'toolnet-phase65-ga-'));
  const manifest = project(root);
  try {
    mkdirSync(join(root, '.toolnet'), { recursive: true });

    const store = new TaskStore(manifest);
    const state = new TaskStateEngine(store);
    const task = await store.createTask({
      id: 'phase65-current-task',
      kind: 'task',
      title: 'Certify Retrieval GA',
      priority: 'high',
    });
    await state.start(task.id);
    await state.setNextAction(task.id, 'Publish ToolNet Memory v0.5.2');
    await state.touchFile(task.id, 'src/production/retrieval-ga-certify.ts');

    /*
     * Artifact lifecycle:
     * executed -> verified
     */
    await state.addEvidence(task.id, {
      kind: 'artifact',
      summary: 'Production release certification',
      artifact: {
        key: 'production-release',
        type: 'deploy',
        state: 'executed',
        command: 'node bundle/production-certify.js',
        exitCode: 0,
      },
    });
    await state.addEvidence(task.id, {
      kind: 'artifact',
      summary: 'Production release verified',
      artifact: {
        key: 'production-release',
        type: 'deploy',
        state: 'verified',
        path: '/tmp/toolnet-phase65-production-certification',
      },
    });

    /*
     * Real MCP single-intent path.
     */
    const single = await memoryAgentAsk(
      {
        project: manifest,
      },
      {
        question: 'task hiện tại là gì?',
      }
    );
    const singleRecord = recordValue(single);

    /*
     * Real MCP composite path.
     */
    const composite = await memoryAgentAsk(
      {
        project: manifest,
      },
      {
        question: 'task hiện tại là gì và deploy production verified chưa?',
      }
    );
    const compositeRecord = recordValue(composite);

    const singleAttempted = stringArray(singleRecord.attemptedSources);
    const compositeAttempted = stringArray(compositeRecord.attemptedSources);

    const mcpSingle =
      singleRecord.intent === 'current_work' &&
      singleRecord.source === 'persistent-tasks' &&
      singleRecord.usedAi === false &&
      singleAttempted.includes('persistent-tasks');

    const mcpComposite =
      compositeRecord.source === 'composite' &&
      compositeRecord.routing === 'composite-intent-aware' &&
      compositeRecord.usedAi === false &&
      compositeAttempted.includes('persistent-tasks') &&
      compositeAttempted.includes('task-artifacts');

    const mcpNoAi = singleRecord.usedAi === false && compositeRecord.usedAi === false;

    /*
     * MCP telemetry must be emitted through the same
     * Phase 63 local telemetry store.
     */
    const telemetry = readRetrievalTelemetry(manifest);
    const mcpTelemetryEvents = telemetry.filter((event) => event.surface === 'mcp');
    const mcpTelemetry =
      mcpTelemetryEvents.length >= 2 &&
      mcpTelemetryEvents.some((event) => event.mode === 'single') &&
      mcpTelemetryEvents.some((event) => event.mode === 'composite');

    const telemetryFile = retrievalTelemetryPath(manifest);
    let telemetryRaw = '';
    try {
      telemetryRaw = readFileSync(telemetryFile, 'utf8');
    } catch {
      telemetryRaw = '';
    }
    const telemetryPrivacy =
      !telemetryRaw.includes('task hiện tại là gì?') &&
      !telemetryRaw.includes('deploy production verified chưa?') &&
      !/"question"\s*:/u.test(telemetryRaw) &&
      !/"answer"\s*:/u.test(telemetryRaw) &&
      !/"queryHash"\s*:/u.test(telemetryRaw) &&
      !/"taskId"\s*:/u.test(telemetryRaw) &&
      !/"filePath"\s*:/u.test(telemetryRaw);

    /*
     * Re-run the release-blocking deterministic benchmark.
     */
    const benchmark = certifyPhase62Benchmark();
    const benchmark65 =
      benchmark.gate.passed &&
      benchmark.report.totalCases === 65 &&
      benchmark.report.passedCases === 65 &&
      benchmark.report.intentMicro.f1 === 1 &&
      benchmark.report.sourceMicro.f1 === 1 &&
      benchmark.report.unnecessarySourceReads === 0 &&
      benchmark.report.missingSourceReads === 0 &&
      benchmark.report.sourceBudgetViolations === 0;

    /*
     * Re-run guarded adaptive-routing certification.
     */
    const adaptive = certifyAdaptiveRetrieval();
    const adaptiveRouting = adaptive.passed;

    const taskAuthority = singleRecord.source === 'persistent-tasks';

    /*
     * Composite production-state answer must contain the
     * canonical Task Artifact source.
     */
    const artifactAuthority = compositeAttempted.includes('task-artifacts');

    const passed =
      benchmark65 &&
      adaptiveRouting &&
      mcpSingle &&
      mcpComposite &&
      mcpNoAi &&
      mcpTelemetry &&
      telemetryPrivacy &&
      taskAuthority &&
      artifactAuthority;

    return {
      passed,
      benchmark65,
      adaptiveRouting,
      mcpSingle,
      mcpComposite,
      mcpNoAi,
      mcpTelemetry,
      telemetryPrivacy,
      taskAuthority,
      artifactAuthority,
      ...(passed
        ? {}
        : {
            detail: JSON.stringify(
              {
                single: singleRecord,
                composite: compositeRecord,
                telemetryEvents: mcpTelemetryEvents.length,
                benchmark: {
                  passed: benchmark.report.passedCases,
                  total: benchmark.report.totalCases,
                  gate: benchmark.gate.passed,
                },
                adaptive,
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
