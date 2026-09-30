/**
 * ToolNet Memory Status CLI
 *
 * Compact system status overview.
 */

import { ProjectManager, loadConfig } from '../core/index.js';
import {
  createStorageProvider,
  withStorageRetry,
  ProjectScopedStorageProvider,
} from '../storage/index.js';
import { inspectSessionCaptureHealth } from './session-capture-health.js';
import { detectAgentIntegrations } from './integration-detection.js';
import { inspectMemoryPipeline } from './memory-pipeline-status.js';
import { inspectKiroIntegrationStatus } from '../session/kiro/status.js';
import { TaskReplicationService } from '../tasks/replication/service.js';
import { ConvergentMemoryStore } from '../multi-host/memory-projection.js';
import { inspectMemoryQuality } from '../memory/quality.js';
import { summarizeRetrievalTelemetry } from '../work-continuity/retrieval-telemetry.js';
import { summarizeRetrievalFeedback } from '../work-continuity/retrieval-feedback.js';
import {
  inspectLifecycleDrift,
  type LifecycleDriftReport,
} from '../work-continuity/lifecycle-drift.js';
import {
  renderHeader,
  renderSectionTitle,
  renderKeyValue,
  renderSuccess,
  renderError,
  renderWarning,
  dim,
  type CliUiOptions,
} from './ui/cli-ui.js';

interface StatusCliOptions {
  tty?: boolean;
  noColor?: boolean;
}

function toCliUiOptions(options: StatusCliOptions): CliUiOptions {
  return {
    tty: options.tty,
    noColor: options.noColor,
  };
}

async function showStatus(options: StatusCliOptions): Promise<void> {
  const uiOpts = toCliUiOptions(options);

  console.log('');
  console.log(renderHeader('ToolNet Status', undefined, uiOpts));
  console.log('');

  try {
    const project = new ProjectManager().detect();
    const config = loadConfig();

    // Project status
    console.log(renderSectionTitle('PROJECT', uiOpts));
    console.log(renderKeyValue('Name', project.name, 8, uiOpts));

    // Check if memory/index exists
    const rawStorage = withStorageRetry(
      createStorageProvider({
        provider: config.storage.provider,
        r2: config.storage.r2,
        s3: config.storage.s3,
        huggingface: config.storage.huggingface,
        localRoot: config.storage.localRoot,
      }),
      { attempts: 3 }
    );

    const storage = new ProjectScopedStorageProvider(
      rawStorage,
      project.id,
      project.name,
      project.remote ?? project.name
    );
    let memoryStatus = 'unknown';
    let memoryQuality: ReturnType<typeof inspectMemoryQuality> | null = null;
    let lifecycle: LifecycleDriftReport | null = null;
    let indexStatus = 'unknown';
    try {
      const memoryStore = new ConvergentMemoryStore(storage);
      const memories = await memoryStore.load(project.id);
      memoryStatus = memories.length > 0 ? `ready (${memories.length})` : 'not initialized';
      memoryQuality = inspectMemoryQuality(memories);
      lifecycle = inspectLifecycleDrift(project, memories, memoryStore.getDiagnostics());
    } catch {
      memoryStatus = 'error';
    }

    try {
      const graphExists = await storage.exists(`${project.id}/code-graph.json`);
      indexStatus = graphExists ? 'ready' : 'not built';
    } catch {
      indexStatus = 'error';
    }

    console.log(renderKeyValue('Memory', memoryStatus, 8, uiOpts));
    if (memoryQuality) {
      console.log(
        renderKeyValue(
          'Quality',
          `fresh ${memoryQuality.fresh} / verify ${memoryQuality.needsVerification} / stale ${memoryQuality.stale}`,
          8,
          uiOpts
        )
      );
    }
    console.log(renderKeyValue('Index', indexStatus, 8, uiOpts));

    const replication = new TaskReplicationService(project, storage);
    const replicationStatus = replication.status();
    console.log(
      renderKeyValue('Task sync', replicationStatus.enabled ? 'enabled' : 'disabled', 8, uiOpts)
    );
    console.log(renderKeyValue('Task conflicts', String(replicationStatus.conflicts), 8, uiOpts));
    const retrievalTelemetry = summarizeRetrievalTelemetry(project, {
      windowHours: 24 * 7,
    });
    console.log(
      renderKeyValue(
        'Retrieval 7d',
        retrievalTelemetry.eventsInWindow > 0
          ? `${retrievalTelemetry.eventsInWindow} queries / ${retrievalTelemetry.averageDurationMs}ms avg / ${retrievalTelemetry.averageEstimatedTokens} tok`
          : 'no local samples',
        8,
        uiOpts
      )
    );
    console.log(
      renderKeyValue(
        'Retrieval health',
        retrievalTelemetry.eventsInWindow > 0
          ? `errors ${retrievalTelemetry.errors} / conflicts ${retrievalTelemetry.conflictEvents} / budget ${retrievalTelemetry.sourceBudgetViolations}`
          : 'n/a',
        8,
        uiOpts
      )
    );
    const retrievalFeedback = summarizeRetrievalFeedback(project);
    console.log(
      renderKeyValue(
        'Routing feedback',
        `${retrievalFeedback.feedbackEvents} events / ${retrievalFeedback.activeRules} active rules`,
        8,
        uiOpts
      )
    );
    if (lifecycle) {
      console.log(renderKeyValue('Lifecycle', lifecycle.ok ? 'healthy' : 'attention', 8, uiOpts));
      console.log(
        renderKeyValue(
          'Drift',
          `memory ${lifecycle.memory.archiveCandidates} archive / rules ${lifecycle.adaptive.expiredRules} expired / telemetry ${lifecycle.telemetry.invalidLines} invalid`,
          8,
          uiOpts
        )
      );
    }
    console.log('');

    const integrations = detectAgentIntegrations();

    const detectedAgents = integrations.filter((item) => item.detected).map((item) => item.agent);

    if (detectedAgents.length > 0) {
      console.log(renderSectionTitle('INTEGRATIONS', uiOpts));
      console.log(renderKeyValue('Detected', detectedAgents.join(', '), 8, uiOpts));

      const kiro = integrations.find((item) => item.agent === 'kiro');

      if (kiro?.detected) {
        const kiroStatus = inspectKiroIntegrationStatus();

        console.log(
          renderKeyValue('Kiro', kiroStatus.installed ? 'ready' : kiroStatus.state, 8, uiOpts)
        );
      }

      console.log('');
    }

    // Memory pipeline health (read-only; configuration is not runtime proof).
    const pipeline = await inspectMemoryPipeline({ project, storage });
    console.log(renderSectionTitle('MEMORY PIPELINE', uiOpts));
    console.log(renderKeyValue('Overall', pipeline.overall, 16, uiOpts));
    console.log(renderKeyValue('Integration', pipeline.configuration, 16, uiOpts));
    console.log(
      renderKeyValue(
        'Capture',
        `${pipeline.capture.status} (${pipeline.capture.sessions} session(s))`,
        16,
        uiOpts
      )
    );
    console.log(
      renderKeyValue(
        'WAL',
        `${pipeline.wal.state} — ${pipeline.wal.pendingLearnerBytes}B learner / ${pipeline.wal.pendingRemoteEvents} remote`,
        16,
        uiOpts
      )
    );
    console.log(
      renderKeyValue(
        'Journal',
        `${pipeline.journal.state} (${pipeline.journal.batches} batch(es))`,
        16,
        uiOpts
      )
    );
    console.log(
      renderKeyValue(
        'MemoryStore',
        `${pipeline.memoryStore.state} (${pipeline.memoryStore.count})`,
        16,
        uiOpts
      )
    );
    console.log(
      renderKeyValue(
        'Materialization',
        pipeline.materialization.pending > 0
          ? `${pipeline.materialization.state} (${pipeline.materialization.pending} pending)`
          : pipeline.materialization.state,
        16,
        uiOpts
      )
    );
    console.log(renderKeyValue('Last capture', pipeline.lastCaptureAt ?? 'never', 16, uiOpts));
    console.log(
      renderKeyValue('Last materialize', pipeline.lastMaterializationAt ?? 'never', 16, uiOpts)
    );
    console.log('');

    console.log(renderSectionTitle('AGENT INTEGRATIONS', uiOpts));
    for (const integration of pipeline.integrations) {
      console.log(
        renderKeyValue(
          integration.label,
          `${integration.captureMode} · capture ${integration.captureStatus} · materialization ${integration.materializationStatus}`,
          18,
          uiOpts
        )
      );
    }
    console.log('');

    // Service status (optional)
    const capture = inspectSessionCaptureHealth(project);
    if (capture.agents.length > 0) {
      console.log(renderSectionTitle('SERVICE', uiOpts));
      console.log(
        renderKeyValue(
          'Capture sync',
          capture.syncHealth === 'healthy'
            ? 'healthy'
            : capture.syncHealth === 'degraded'
              ? 'degraded'
              : 'pending',
          16,
          uiOpts
        )
      );
      console.log(renderKeyValue('Daemon required', 'no', 16, uiOpts));
      console.log('');
    }
  } catch (error) {
    console.log(renderError(uiOpts) + ' Failed to get status');
    console.log('');
    console.log(dim(`  ${error instanceof Error ? error.message : String(error)}`, uiOpts));
    console.log('');
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const options: StatusCliOptions = {
    tty: process.stdout.isTTY,
    noColor: process.env.NO_COLOR !== undefined || args.includes('--no-color'),
  };

  await showStatus(options);
}

main().catch((error) => {
  console.error('');
  console.error(error instanceof Error ? error.message : String(error));
  console.error('');
  process.exitCode = 1;
});
