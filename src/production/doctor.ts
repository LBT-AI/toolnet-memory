import 'dotenv/config';

import { loadConfig, ProjectManager } from '../core/index.js';

import {
  createStorageProvider,
  withStorageRetry,
  ProjectScopedStorageProvider,
  PersistentCodeGraphStore,
  PersistentVectorStore,
  PersistentCodeChunkStore,
  PersistentCodeVectorStore,
} from '../storage/index.js';

import { SnapshotManager } from '../snapshot/index.js';
import { ConvergentMemoryStore } from '../multi-host/memory-projection.js';
import { inspectMemoryQuality, type MemoryQualityReport } from '../memory/quality.js';
import {
  inspectLifecycleDrift,
  type LifecycleDriftReport,
} from '../work-continuity/lifecycle-drift.js';
import { inspectActiveTaskArtifactPaths, type ArtifactPathHealth } from './artifact-path-health.js';

import { checkProductionConfig } from './config-check.js';

import { ProductionHealth } from './health.js';

import {
  inspectSessionCaptureHealth,
  type SessionCaptureHealth,
} from './session-capture-health.js';

import { inspectProductionTaskHealth, type ProductionTaskHealth } from './task-health.js';

type DoctorResult = {
  ok: boolean;
  project?: string;

  storage?: {
    ok: boolean;
    provider?: string;
  } | null;

  memory?: number;
  graphSymbols?: number;
  graphEdges?: number;
  memoryVectors?: number;
  codeChunks?: number;
  codeVectors?: number;
  snapshots?: number;
  capture?: SessionCaptureHealth;
  tasks?: ProductionTaskHealth;
  memoryQuality?: MemoryQualityReport;
  artifactPaths?: ArtifactPathHealth;
  lifecycle?: LifecycleDriftReport;
  config?: {
    ok: boolean;
    errors?: string[];
    warnings?: string[];
  };

  warnings?: string[];
};

function wantsJson(): boolean {
  return process.argv.includes('--json');
}

function printHuman(result: DoctorResult): void {
  const colorEnabled =
    process.stdout.isTTY === true &&
    process.env.TERM !== 'dumb' &&
    process.env.NO_COLOR === undefined;

  const color = (code: string, value: string): string =>
    colorEnabled ? `\x1b[${code}m${value}\x1b[0m` : value;

  const green = (value: string): string => color('38;5;82', value);
  const cyan = (value: string): string => color('38;5;51', value);
  const amber = (value: string): string => color('38;5;214', value);
  const red = (value: string): string => color('38;5;196', value);
  const white = (value: string): string => color('38;5;255', value);
  const dim = (value: string): string => color('2', value);
  const bold = (value: string): string => color('1', value);

  const pipe = dim('│');
  const branch = dim('├');

  console.log('');
  console.log(`${cyan('◇')} ${bold(white('ToolNet Memory Doctor'))}`);
  console.log('');

  if (result.project) {
    console.log(`${green('◆')} Project    ${white(result.project)}`);
  }

  console.log(pipe);

  if (result.storage) {
    const provider =
      typeof result.storage.provider === 'string' ? ` — ${result.storage.provider}` : '';

    if (result.storage.ok) {
      console.log(`${branch} ${green('◆')} Storage${provider}`);
    } else {
      console.log(`${branch} ${red('✗')} Storage${provider}`);
    }
  }

  if (
    result.memory !== undefined ||
    result.graphSymbols !== undefined ||
    result.codeChunks !== undefined
  ) {
    console.log(pipe);
    console.log(`${cyan('◇')} ${white('Project data')}`);

    if (result.memory !== undefined) {
      console.log(`${branch} ${dim('Memories')}       ${white(String(result.memory))}`);
    }

    if (result.graphSymbols !== undefined) {
      console.log(`${branch} ${dim('Graph symbols')}  ${white(String(result.graphSymbols))}`);
    }

    if (result.graphEdges !== undefined) {
      console.log(`${branch} ${dim('Graph edges')}    ${white(String(result.graphEdges))}`);
    }

    if (result.memoryVectors !== undefined) {
      console.log(`${branch} ${dim('Memory vectors')} ${white(String(result.memoryVectors))}`);
    }

    if (result.codeChunks !== undefined) {
      console.log(`${branch} ${dim('Code chunks')}    ${white(String(result.codeChunks))}`);
    }

    if (result.codeVectors !== undefined) {
      console.log(`${branch} ${dim('Code vectors')}   ${white(String(result.codeVectors))}`);
    }

    if (result.snapshots !== undefined) {
      console.log(`${branch} ${dim('Snapshots')}      ${white(String(result.snapshots))}`);
    }
  }

  if (result.capture) {
    console.log(pipe);
    console.log(`${cyan('◇')} ${white('Session continuity')}`);

    console.log(
      `${branch} ${dim('Agents')}         ${white(
        result.capture.agents.length ? result.capture.agents.join(', ') : 'none'
      )}`
    );

    if (result.capture.latestAgent) {
      console.log(
        `${branch} ${dim('Latest agent')}   ${white(String(result.capture.latestAgent))}`
      );
    }

    if (result.capture.currentTask) {
      console.log(`${branch} ${dim('Current task')}   ${white(result.capture.currentTask)}`);
    }

    if (result.capture.currentFile) {
      console.log(`${branch} ${dim('Current file')}   ${white(result.capture.currentFile)}`);
    }

    if (result.capture.lastCaptureAt) {
      console.log(`${branch} ${dim('Last capture')}  ${white(result.capture.lastCaptureAt)}`);
    }

    if (result.capture.lastFlushAt) {
      console.log(`${branch} ${dim('Last flush')}    ${white(result.capture.lastFlushAt)}`);
    }

    console.log(`${branch} ${dim('Pending WAL')}   ${white(String(result.capture.pendingWal))}`);

    const sync =
      result.capture.syncHealth === 'healthy'
        ? green(result.capture.syncHealth)
        : result.capture.syncHealth === 'degraded'
          ? red(result.capture.syncHealth)
          : amber(result.capture.syncHealth);

    console.log(`${branch} ${dim('Sync health')}   ${sync}`);
  }

  if (result.tasks) {
    console.log(pipe);
    console.log(`${cyan('◇')} ${white('Persistent Tasks')}`);
    const taskState = result.tasks.ok ? green('healthy') : red('attention');
    console.log(`${branch} ${dim('Health')}          ${taskState}`);
    console.log(`${branch} ${dim('Total')}           ${white(String(result.tasks.total))}`);
    console.log(`${branch} ${dim('Pending')}         ${white(String(result.tasks.pending))}`);
    console.log(`${branch} ${dim('Active')}          ${white(String(result.tasks.active))}`);
    console.log(`${branch} ${dim('Blocked')}         ${white(String(result.tasks.blocked))}`);
    console.log(`${branch} ${dim('Completed')}       ${white(String(result.tasks.completed))}`);
    console.log(`${branch} ${dim('Conflicts')}       ${white(String(result.tasks.conflicts))}`);
    console.log(
      `${branch} ${dim('Operations')}      ${white(String(result.tasks.operationCount))}`
    );
    if (result.tasks.error) console.log(`${branch} ${red('!')} ${result.tasks.error}`);
  }

  if (result.memoryQuality) {
    console.log(pipe);
    console.log(`${cyan('◇')} ${white('Memory Quality')}`);
    console.log(`${branch} ${dim('Long-term rules')} ${white(String(result.memoryQuality.rules))}`);
    console.log(`${branch} ${dim('Fresh')}           ${white(String(result.memoryQuality.fresh))}`);
    console.log(
      `${branch} ${dim('Need verify')}     ${white(String(result.memoryQuality.needsVerification))}`
    );
    console.log(`${branch} ${dim('Stale')}           ${white(String(result.memoryQuality.stale))}`);
    console.log(
      `${branch} ${dim('High confidence')} ${white(String(result.memoryQuality.highConfidence))}`
    );
    console.log(
      `${branch} ${dim('Verified')}        ${white(String(result.memoryQuality.verified))}`
    );
  }
  if (result.lifecycle) {
    console.log(pipe);
    console.log(`${cyan('◇')} ${white('Lifecycle & Drift')}`);
    const lifecycleState = result.lifecycle.ok ? green('healthy') : red('attention');
    console.log(`${branch} ${dim('Health')}          ${lifecycleState}`);
    console.log(
      `${branch} ${dim('Archive candidates')} ${white(String(result.lifecycle.memory.archiveCandidates))}`
    );
    console.log(
      `${branch} ${dim('Stale rules')}     ${white(String(result.lifecycle.memory.staleRules))}`
    );
    console.log(
      `${branch} ${dim('Adaptive active')} ${white(String(result.lifecycle.adaptive.effectiveRules))}`
    );
    console.log(
      `${branch} ${dim('Adaptive expired')} ${white(String(result.lifecycle.adaptive.expiredRules))}`
    );
    console.log(
      `${branch} ${dim('Telemetry invalid')} ${white(String(result.lifecycle.telemetry.invalidLines))}`
    );
    console.log(
      `${branch} ${dim('Projection drift')} ${white(`${result.lifecycle.projection.conflicts} conflicts / ${result.lifecycle.projection.invalidKeys} invalid`)}`
    );
  }

  if (result.artifactPaths) {
    console.log(pipe);
    console.log(`${cyan('◇')} ${white('Active Artifact Paths')}`);
    const artifactState = result.artifactPaths.ok ? green('healthy') : red('attention');
    console.log(`${branch} ${dim('Health')}          ${artifactState}`);
    console.log(`${branch} ${dim('Tracked')}         ${white(String(result.artifactPaths.total))}`);
    console.log(
      `${branch} ${dim('Existing')}        ${white(String(result.artifactPaths.existing))}`
    );
    console.log(
      `${branch} ${dim('Missing')}         ${white(String(result.artifactPaths.missing))}`
    );
    console.log(
      `${branch} ${dim('Remote refs')}     ${white(String(result.artifactPaths.remote))}`
    );
    if (result.artifactPaths.error) {
      console.log(`${branch} ${red('!')} ${result.artifactPaths.error}`);
    }
  }
  const errors = result.config?.errors ?? [];

  if (errors.length > 0) {
    console.log(pipe);
    console.log(`${red('✗')} ${white('Configuration required')}`);

    for (const error of errors) {
      console.log(`${branch} ${red('•')} ${error}`);
    }
  }

  const warnings = [...(result.config?.warnings ?? []), ...(result.warnings ?? [])];
  const uniqueWarnings = [...new Set(warnings)];

  if (uniqueWarnings.length > 0) {
    console.log(pipe);
    console.log(`${amber('◇')} ${white('Warnings')}`);

    for (const warning of uniqueWarnings) {
      console.log(`${branch} ${amber('!')} ${warning}`);
    }
  }

  console.log(pipe);

  if (result.ok) {
    console.log(`${green('└ ◆')} ${bold(white('ToolNet Memory is ready'))}`);
  } else {
    console.log(`${red('└ ✗')} ${bold(white('ToolNet Memory requires attention'))}`);

    if (errors.length > 0) {
      console.log(dim('    Run: toolnet-memory setup'));
    }
  }

  console.log('');
}

function output(result: DoctorResult): void {
  if (wantsJson()) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printHuman(result);
  }
}

async function main(): Promise<void> {
  const configCheck = checkProductionConfig();

  if (!configCheck.ok) {
    const result: DoctorResult = {
      ok: false,
      config: configCheck,
      warnings: configCheck.warnings,
    };

    output(result);

    process.exitCode = 1;
    return;
  }

  const config = loadConfig();

  const project = new ProjectManager().detect();

  const rawStorage = withStorageRetry(
    createStorageProvider({
      provider: config.storage.provider,
      r2: config.storage.r2,
      s3: config.storage.s3,
      huggingface: config.storage.huggingface,
      localRoot: config.storage.localRoot,
    }),
    {
      attempts: 3,
    }
  );

  const storage = new ProjectScopedStorageProvider(
    rawStorage,
    project.id,
    project.name,
    project.remote ?? project.name
  );

  const health = await new ProductionHealth(rawStorage).run();
  const memoryStore = new ConvergentMemoryStore(storage);
  const memories = await memoryStore.load(project.id);
  const memoryQuality = inspectMemoryQuality(memories);
  const lifecycle = inspectLifecycleDrift(project, memories, memoryStore.getDiagnostics());
  const artifactPaths = inspectActiveTaskArtifactPaths(project);
  const graph = await new PersistentCodeGraphStore(storage).load(project.id);

  const vectors = await new PersistentVectorStore(storage).load(project.id);

  const chunks = await new PersistentCodeChunkStore(storage).load(project.id);

  const codeVectors = await new PersistentCodeVectorStore(storage).load(project.id);

  const snapshots = await new SnapshotManager(storage).list(project.id);

  const capture = inspectSessionCaptureHealth(project);
  const taskHealth = inspectProductionTaskHealth(project);

  const captureWarnings =
    capture.syncHealth === 'degraded'
      ? [`Session capture degraded${capture.opencode?.error ? `: ${capture.opencode.error}` : ''}`]
      : [];

  const taskWarnings = !taskHealth.ok
    ? [
        taskHealth.error
          ? `Persistent Task health: ${taskHealth.error}`
          : `Persistent Tasks have ${taskHealth.conflicts} unresolved replication conflict(s)`,
      ]
    : [];

  const artifactWarnings =
    artifactPaths.missing > 0
      ? [`Active Tasks reference ${artifactPaths.missing} missing local artifact path(s)`]
      : artifactPaths.error
        ? [`Artifact path health: ${artifactPaths.error}`]
        : [];
  const lifecycleWarnings = lifecycle.warnings.map((warning) => `Lifecycle: ${warning}`);
  const result: DoctorResult = {
    ok: health.ok && capture.ok && taskHealth.ok && artifactPaths.ok && lifecycle.ok,
    project: project.name,
    storage: health.storage,
    memory: memories.length,
    graphSymbols: graph?.symbols.length ?? 0,
    graphEdges: graph?.edges.length ?? 0,
    memoryVectors: vectors?.records.length ?? 0,
    codeChunks: chunks?.chunks.length ?? 0,
    codeVectors: codeVectors?.records.length ?? 0,
    snapshots: snapshots.length,
    capture,
    tasks: taskHealth,
    memoryQuality,
    artifactPaths,
    lifecycle,
    warnings: [
      ...configCheck.warnings,
      ...captureWarnings,
      ...taskWarnings,
      ...artifactWarnings,
      ...lifecycleWarnings,
    ],
  };

  output(result);

  process.exitCode = result.ok ? 0 : 1;
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);

  if (wantsJson()) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          error: message,
        },
        null,
        2
      )
    );
  } else {
    console.error('');
    console.error('ToolNet Memory Doctor');
    console.error('=====================');
    console.error('');
    console.error(`✗ ${message}`);
    console.error('');
  }

  process.exitCode = 1;
});
