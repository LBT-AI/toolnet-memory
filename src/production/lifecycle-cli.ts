import { loadConfig, ProjectManager } from '../core/index.js';
import type { MemoryRecord } from '../core/types.js';
import type { MemoryProjectionDiagnostics } from '../multi-host/memory-projection.js';
import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../storage/index.js';
import { ConvergentMemoryStore } from '../multi-host/memory-projection.js';
import { inspectLifecycleDrift } from '../work-continuity/lifecycle-drift.js';
import { maintainRetrievalTelemetry } from '../work-continuity/retrieval-telemetry.js';
import { maintainAdaptiveRetrievalOverrides } from '../work-continuity/retrieval-feedback.js';

interface Options {
  apply: boolean;
  json: boolean;
}

function parseArgs(): Options {
  const args = new Set(process.argv.slice(2));
  return {
    apply: args.has('--apply'),
    json: args.has('--json'),
  };
}

async function main(): Promise<void> {
  const options = parseArgs();
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
  /*
   * Canonical Memory load is fail-soft.
   *
   * A drift inspector must still run when storage is unavailable
   * (e.g. remote namespace collision), reporting Memory as
   * unavailable instead of crashing. Local telemetry and adaptive
   * rule state are still inspected.
   */
  let memories: MemoryRecord[] = [];
  let projection: MemoryProjectionDiagnostics = {
    operationCount: 0,
    conflicts: 0,
    invalidKeys: 0,
  };
  let memoryError: string | undefined;
  try {
    const memoryStore = new ConvergentMemoryStore(storage);
    memories = await memoryStore.load(project.id);
    projection = memoryStore.getDiagnostics();
  } catch (error) {
    memoryError = error instanceof Error ? error.message : String(error);
  }
  const before = inspectLifecycleDrift(project, memories, projection, undefined, memoryError);
  const maintenance = options.apply
    ? {
        telemetry: maintainRetrievalTelemetry(project),
        adaptive: maintainAdaptiveRetrievalOverrides(project),
      }
    : undefined;
  /*
   * Reload only diagnostics whose local files may have changed.
   * Canonical Memory remains untouched.
   */
  const after = inspectLifecycleDrift(project, memories, projection, undefined, memoryError);
  if (options.json) {
    console.log(
      JSON.stringify(
        {
          before,
          ...(maintenance ? { maintenance } : {}),
          after,
          canonicalMemoryMutated: false,
        },
        null,
        2
      )
    );
    return;
  }
  console.log('ToolNet Lifecycle & Drift');
  console.log('=========================');
  console.log('');
  console.log(`Health: ${after.ok ? 'healthy' : 'attention'}`);
  console.log('');
  console.log(
    `Memory: fresh ${after.memory.fresh} / verify ${after.memory.needsVerification} / stale ${after.memory.stale}`
  );
  console.log(`Protected long-term rules: ${after.memory.protectedRules}`);
  console.log(`Stale rules: ${after.memory.staleRules}`);
  console.log(`Archive candidates: ${after.memory.archiveCandidates}`);
  console.log('');
  console.log(
    `Adaptive rules: ${after.adaptive.effectiveRules}/${after.adaptive.totalRules} effective`
  );
  console.log(`Expired: ${after.adaptive.expiredRules}`);
  console.log(`Re-certify due: ${after.adaptive.recertifyDue}`);
  console.log(`Benchmark: ${after.adaptive.benchmarkPassed ? 'PASS' : 'FAIL'}`);
  console.log('');
  console.log(
    `Telemetry: ${after.telemetry.validEvents} valid / ${after.telemetry.invalidLines} malformed`
  );
  console.log(`Telemetry bytes: ${after.telemetry.bytes}`);
  console.log('');
  console.log(
    `Memory projection: ${after.projection.operationCount} ops / ${after.projection.conflicts} conflicts / ${after.projection.invalidKeys} invalid keys`
  );
  if (after.warnings.length > 0) {
    console.log('');
    console.log('Warnings:');
    for (const warning of after.warnings) {
      console.log(`- ${warning}`);
    }
  }
  if (!options.apply) {
    console.log('');
    console.log(
      'Read-only inspection. Run with --apply to maintain local telemetry/adaptive state.'
    );
  } else {
    console.log('');
    console.log('Local lifecycle maintenance applied.');
    console.log('Canonical Memory was not deleted or rewritten.');
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
