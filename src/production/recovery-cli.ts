import { loadConfig, ProjectManager } from '../core/index.js';
import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../storage/index.js';
import {
  createRecoveryBackup,
  defaultRecoveryRoot,
  inspectRecoveryHealth,
  listRecoveryBackups,
  restoreRecoveryBackup,
  verifyRecoveryBackup,
} from '../recovery/disaster-recovery.js';
interface Parsed {
  command: 'backup' | 'list' | 'verify' | 'restore' | 'health';
  backupId?: string;
  reason?: string;
  apply: boolean;
  localOnly: boolean;
  json: boolean;
  recoveryRoot?: string;
}
function parseArgs(): Parsed {
  const args = process.argv.slice(2);
  const command = args.shift();
  if (
    command !== 'backup' &&
    command !== 'list' &&
    command !== 'verify' &&
    command !== 'restore' &&
    command !== 'health'
  ) {
    throw new Error('Usage: recovery <backup|list|verify|restore|health>');
  }
  let backupId: string | undefined;
  let reason: string | undefined;
  let apply = false;
  let localOnly = false;
  let json = false;
  let recoveryRoot: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    if (arg === '--apply') {
      apply = true;
      continue;
    }
    if (arg === '--local-only') {
      localOnly = true;
      continue;
    }
    if (arg === '--json') {
      json = true;
      continue;
    }
    if (arg === '--reason') {
      reason = args[++index];
      continue;
    }
    if (arg === '--root') {
      recoveryRoot = args[++index];
      continue;
    }
    if (!backupId && (command === 'verify' || command === 'restore')) {
      backupId = arg;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  if ((command === 'verify' || command === 'restore') && !backupId) {
    throw new Error('RECOVERY_BACKUP_ID_REQUIRED');
  }
  return {
    command,
    ...(backupId
      ? {
          backupId,
        }
      : {}),
    ...(reason
      ? {
          reason,
        }
      : {}),
    apply,
    localOnly,
    json,
    ...(recoveryRoot
      ? {
          recoveryRoot,
        }
      : {}),
  };
}
function storageForProject(project: ReturnType<ProjectManager['detect']>) {
  const config = loadConfig();
  const raw = withStorageRetry(
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
  return new ProjectScopedStorageProvider(
    raw,
    project.id,
    project.name,
    project.remote ?? project.name
  );
}
function print(value: unknown, json: boolean): void {
  if (json) {
    console.log(JSON.stringify(value, null, 2));
    return;
  }
  console.log(JSON.stringify(value, null, 2));
}
async function main(): Promise<void> {
  const input = parseArgs();
  const project = new ProjectManager().detect();
  const recoveryRoot = input.recoveryRoot ?? defaultRecoveryRoot(project);
  if (input.command === 'list') {
    print(
      {
        recoveryRoot,
        backups: listRecoveryBackups(project, recoveryRoot),
      },
      input.json
    );
    return;
  }
  if (input.command === 'health') {
    print(inspectRecoveryHealth(project, recoveryRoot), input.json);
    return;
  }
  if (input.command === 'verify') {
    const result = verifyRecoveryBackup(project, input.backupId!, recoveryRoot);
    print(result, input.json);
    if (!result.ok) {
      process.exitCode = 1;
    }
    return;
  }
  /*
   * Remote storage is optional.
   *
   * If unavailable during an outage, --local-only remains usable.
   */
  const storage = input.localOnly ? undefined : storageForProject(project);
  if (input.command === 'backup') {
    const result = await createRecoveryBackup(project, {
      reason: input.reason ?? 'manual',
      recoveryRoot,
      ...(storage
        ? {
            storage,
          }
        : {}),
    });
    print(
      {
        recoveryRoot,
        backup: result,
      },
      input.json
    );
    return;
  }
  const result = await restoreRecoveryBackup(project, input.backupId!, {
    apply: input.apply,
    recoveryRoot,
    ...(storage
      ? {
          storage,
        }
      : {}),
  });
  print(
    {
      mode: input.apply ? 'APPLIED' : 'DRY_RUN',
      result,
    },
    input.json
  );
  if (!input.apply) {
    console.error('Dry-run only. Re-run with --apply to restore.');
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
