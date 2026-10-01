import { loadConfig, ProjectManager } from '../../core/index.js';

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../../storage/index.js';

import { ProjectLock } from '../../production/project-lock.js';

import { reconcileSessionMemoryJournal } from './journal.js';

import { recoverSessionMemory, RecoveryError } from './recovery.js';

function after(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);

  return index >= 0 ? args[index + 1] : undefined;
}

function has(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function printHelp(): void {
  console.log(
    `Session Memory Learner

Commands:
  reconcile [--project PATH]
      Reconcile existing learned journal batches into the canonical MemoryStore.

  backfill [--project PATH] [--dry-run] [--json]
      Safely recover ToolNet-owned session memory after an upgrade, crash or
      interrupted materialization.

      Reads only ToolNet-owned durable state:
        - local session WAL (.toolnet/runtime/sources/**, and read-only legacy
          .toolnet/sessions/**)
        - immutable learned journal
        - canonical MemoryStore
      It never imports another agent's native memory.

      --dry-run   Report the detected recovery state and pending work without
                  writing anything.
      --json      Emit a machine-readable recovery report.
`
  );
}

function openStorage(project: import('../../core/types.js').ProjectManifest) {
  const config = loadConfig();

  const raw = withStorageRetry(
    createStorageProvider({
      provider: config.storage.provider,

      huggingface: config.storage.huggingface,

      localRoot: config.storage.localRoot,
    }),
    {
      attempts: 3,
    }
  );

  return new ProjectScopedStorageProvider(
    raw,
    project.id,
    project.name,
    project.remote ?? project.name
  );
}

async function runReconcile(args: string[]): Promise<void> {
  const projectPath = after(args, '--project') ?? process.cwd();

  const project = new ProjectManager().detect(projectPath);

  const storage = openStorage(project);

  /*
   * Reconcile writes current.json.
   * Serialize against ToolNet runtime.
   */
  const lock = new ProjectLock(project.id);

  await lock.acquire();

  try {
    const result = await reconcileSessionMemoryJournal(project, storage);

    console.log(
      JSON.stringify(
        {
          project: project.name,

          ...result,
        },
        null,
        2
      )
    );
  } finally {
    await lock.release();
  }
}

function printRecoveryHuman(report: Awaited<ReturnType<typeof recoverSessionMemory>>): void {
  console.log(`Project: ${report.project}`);
  console.log(`State: ${report.detectedState}`);
  console.log(`WAL pending: ${report.walPendingBytes}B / ${report.walPendingSessions} session(s)`);
  console.log(`Journal pending: ${report.journalPendingBefore}`);
  console.log(`Memories before: ${report.memoriesBefore}`);

  if (report.dryRun) {
    console.log(`Would add (estimate): ${report.journalPendingBefore}`);
    console.log('Result: dry-run only');
    return;
  }

  console.log(`Memories added: ${report.memoriesAdded}`);
  console.log(`Journal batches added: ${report.journalBatchesAdded}`);
  console.log(`Duplicates skipped: ${report.duplicates}`);
  console.log(`Result: ${report.finalStatus}`);
}

async function runBackfill(args: string[]): Promise<void> {
  const projectPath = after(args, '--project') ?? process.cwd();

  const project = new ProjectManager().detect(projectPath);

  const storage = openStorage(project);

  const dryRun = has(args, '--dry-run');

  const json = has(args, '--json');

  /*
   * Recovery may write current.json and advance the learner cursor.
   * Serialize against the ToolNet runtime. Dry-run is observational and
   * takes no lock.
   */
  const lock = dryRun ? undefined : new ProjectLock(project.id);

  await lock?.acquire();

  try {
    const report = await recoverSessionMemory({ project, storage, dryRun });

    if (json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      printRecoveryHuman(report);
    }
  } finally {
    await lock?.release();
  }
}

async function main(): Promise<void> {
  const [command = 'help', ...args] = process.argv.slice(2);

  if (command === 'reconcile') {
    await runReconcile(args);

    return;
  }

  if (command === 'backfill') {
    await runBackfill(args);

    return;
  }

  printHelp();
}

main().catch((error) => {
  if (error instanceof RecoveryError) {
    console.error(JSON.stringify({ ok: false, errorCode: error.code, detail: error.detail }));

    process.exit(1);
  }

  console.error(error instanceof Error ? error.message : error);

  process.exit(1);
});
