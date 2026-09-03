import 'dotenv/config';

import { loadConfig } from '../core/config.js';

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../storage/index.js';

import { retentionPolicy } from './policy.js';

import { requireInitializedProject } from './project.js';

import { GarbageCollector } from './service.js';

import type { GcPlan, RetentionPolicy } from './types.js';
import { safeAppendAuditEvent } from '../audit/log.js';

interface CliOptions {
  apply: boolean;
  includeRemote: boolean;
  json: boolean;
  project?: string;
  keepSnapshots?: number;
  snapshotMaxAgeDays?: number;
  runtimeDays?: number;
  staleLockMinutes?: number;
}

function numberFlag(args: string[], name: string): number | undefined {
  const prefix = `${name}=`;

  const inline = args.find((arg) => arg.startsWith(prefix));

  let value: string | undefined;

  if (inline) {
    value = inline.slice(prefix.length);
  } else {
    const index = args.indexOf(name);

    if (index >= 0) {
      value = args[index + 1];
    }
  }

  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`Invalid ${name}: ${value}`);
  }

  return parsed;
}

function textFlag(args: string[], name: string): string | undefined {
  const prefix = `${name}=`;

  const inline = args.find((arg) => arg.startsWith(prefix));

  if (inline) {
    const value = inline.slice(prefix.length);

    return value.trim() || undefined;
  }

  const index = args.indexOf(name);

  if (index < 0) {
    return undefined;
  }

  const value = args[index + 1];

  if (!value || value.startsWith('--')) {
    return undefined;
  }

  return value;
}

function parseOptions(args: string[]): CliOptions {
  const apply = args.includes('--apply');

  const dryRun = args.includes('--dry-run');

  if (apply && dryRun) {
    throw new Error('Choose only one of --apply or --dry-run');
  }

  return {
    /*
     * Safe default:
     * no --apply == dry-run.
     */
    apply,
    includeRemote: args.includes('--remote'),
    json: args.includes('--json'),
    project: textFlag(args, '--project'),
    keepSnapshots: numberFlag(args, '--keep-snapshots'),
    snapshotMaxAgeDays: numberFlag(args, '--snapshot-days'),
    runtimeDays: numberFlag(args, '--runtime-days'),
    staleLockMinutes: numberFlag(args, '--stale-lock-minutes'),
  };
}

function buildPolicy(options: CliOptions): RetentionPolicy {
  return retentionPolicy({
    ...(options.keepSnapshots !== undefined
      ? {
          keepSnapshots: options.keepSnapshots,
        }
      : {}),
    ...(options.snapshotMaxAgeDays !== undefined
      ? {
          snapshotMaxAgeDays: options.snapshotMaxAgeDays,
        }
      : {}),
    ...(options.runtimeDays !== undefined
      ? {
          runtimeDays: options.runtimeDays,
        }
      : {}),
    ...(options.staleLockMinutes !== undefined
      ? {
          staleLockMinutes: options.staleLockMinutes,
        }
      : {}),
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KiB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
}

function printPlan(plan: GcPlan, apply: boolean, includeRemote: boolean): void {
  console.log(`ToolNet Memory GC`);
  console.log(`Project: ${plan.projectRoot}`);
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`Remote snapshots: ${includeRemote ? 'included' : 'not requested'}`);
  console.log(`Candidates: ${plan.candidates.length}`);
  console.log(`Estimated local bytes: ${formatBytes(plan.estimatedBytes)}`);

  if (plan.candidates.length === 0) {
    console.log('Nothing eligible for garbage collection.');
    return;
  }

  console.log('');

  for (const candidate of plan.candidates) {
    const ageDays =
      candidate.ageMs === undefined ? '' : ` age=${(candidate.ageMs / 86_400_000).toFixed(1)}d`;

    console.log(`[${candidate.scope}] ${candidate.category} ${candidate.target}${ageDays}`);
    console.log(`  ${candidate.reason}`);
  }
}

async function remoteStorage(project: ReturnType<typeof requireInitializedProject>) {
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

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));

  const project = requireInitializedProject(options.project ?? process.cwd());

  const policy = buildPolicy(options);

  const storage = options.includeRemote ? await remoteStorage(project) : undefined;

  const collector = new GarbageCollector(project, policy, {
    ...(storage
      ? {
          remoteStorage: storage,
        }
      : {}),
  });

  const plan = await collector.plan(options.includeRemote);

  if (options.json) {
    if (!options.apply) {
      console.log(
        JSON.stringify(
          {
            mode: 'dry-run',
            plan,
          },
          null,
          2
        )
      );
      return;
    }

    const result = await collector.execute(plan, false);

    await safeAppendAuditEvent(project, {
      action: 'gc.manual',
      outcome: result.failed > 0 ? 'failed' : 'success',
      actor: {
        kind: 'user',
        id: process.env.TOOLNET_AGENT_ID?.trim() || 'cli',
      },
      details: {
        includeRemote: options.includeRemote,
        deleted: result.deleted,
        skipped: result.skipped,
        failed: result.failed,
        bytesFreed: result.bytesFreed,
      },
    });

    console.log(
      JSON.stringify(
        {
          mode: 'apply',
          plan,
          result,
        },
        null,
        2
      )
    );

    if (result.failed > 0) {
      process.exitCode = 1;
    }

    return;
  }

  printPlan(plan, options.apply, options.includeRemote);

  if (!options.apply) {
    console.log('');
    console.log(
      'No data changed. Use --apply to execute this exact policy against a freshly re-planned state.'
    );
    return;
  }

  const result = await collector.execute(plan, false);

  await safeAppendAuditEvent(project, {
    action: 'gc.manual',
    outcome: result.failed > 0 ? 'failed' : 'success',
    actor: {
      kind: 'user',
      id: process.env.TOOLNET_AGENT_ID?.trim() || 'cli',
    },
    details: {
      includeRemote: options.includeRemote,
      deleted: result.deleted,
      skipped: result.skipped,
      failed: result.failed,
      bytesFreed: result.bytesFreed,
    },
  });

  console.log('');
  console.log(`Deleted: ${result.deleted}`);
  console.log(`Skipped: ${result.skipped}`);
  console.log(`Failed: ${result.failed}`);
  console.log(`Local bytes freed: ${formatBytes(result.bytesFreed)}`);

  if (result.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
