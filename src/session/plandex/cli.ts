import { existsSync, readdirSync } from 'node:fs';

import { join } from 'node:path';

import { homedir } from 'node:os';

import { loadConfig, ProjectManager } from '../../core/index.js';

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../../storage/index.js';

import { syncPlandexPlan } from './adapter.js';

import { findPlandexToolNetProject } from './project-resolver.js';

import { installPlandexIntegration } from './installer.js';

import { inspectPlandexStatus } from './status.js';

import { recoverPlandexProject } from './recovery.js';

function after(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function storageFor(project: ReturnType<ProjectManager['detect']>) {
  const config = loadConfig();

  const raw = withStorageRetry(
    createStorageProvider({
      provider: config.storage.provider,
      huggingface: config.storage.huggingface,
      localRoot: config.storage.localRoot,
    }),
    { attempts: 3 }
  );

  return new ProjectScopedStorageProvider(
    raw,
    project.id,
    project.name,
    project.remote ?? project.name
  );
}

async function main() {
  const [command = 'help', ...args] = process.argv.slice(2);

  if (command === 'install') {
    const result = installPlandexIntegration();

    console.log(`✅ Plandex integration configured: ${result.configPath}`);
    return;
  }

  if (command === 'status') {
    const status = inspectPlandexStatus();

    console.log('Plandex Integration Status');
    console.log('=========================');
    console.log(`Command detected : ${status.commandDetected ? '✓' : '✗'}`);
    console.log(`Server available  : ${status.serverAvailable ? '✓' : '✗'}`);
    console.log(`Config ready     : ${status.configReady ? '✓' : '✗'}`);
    console.log(`Base dir         : ${status.baseDir}`);
    return;
  }

  const projectPath = after(args, '--project') ?? process.cwd();

  const project = new ProjectManager().detect(projectPath);

  const storage = storageFor(project);

  if (command === 'sync') {
    const orgId = after(args, '--org');
    const planId = after(args, '--plan');

    if (!orgId || !planId) {
      throw new Error('Usage: sync --org <orgId> --plan <planId>');
    }

    const result = await syncPlandexPlan({
      project,
      storage,
      plan: { orgId, planId },
      cwd: project.rootPath,
    });

    console.log(JSON.stringify(result, null, 2));

    if (result.materialization?.status === 'failed') {
      process.exitCode = 1;
    }
    return;
  }

  if (command === 'plans') {
    const baseDir = process.env.PLANDEX_BASE_DIR ?? join(homedir(), 'plandex-server');
    const orgsDir = join(baseDir, 'orgs');

    if (!existsSync(orgsDir)) {
      console.log('No plandex server data found.');
      return;
    }

    const orgs = readdirSync(orgsDir).filter((org) => !org.startsWith('.'));

    for (const orgId of orgs) {
      const plansDir = join(orgsDir, orgId, 'plans');

      if (!existsSync(plansDir)) {
        continue;
      }

      const plans = readdirSync(plansDir).filter((plan) => !plan.startsWith('.'));
      console.log(`Org: ${orgId}`);
      for (const planId of plans) {
        console.log(`  Plan: ${planId}`);
      }
    }
    return;
  }

  if (command === 'recover') {
    const rawLimit = Number(after(args, '--limit') ?? 100);
    const results = await recoverPlandexProject({
      project,
      storage,
      limit: Number.isFinite(rawLimit) ? rawLimit : 100,
    });

    console.log(
      JSON.stringify(
        {
          project: project.name,
          sessions: results.length,
          imported: results.reduce((total, item) => total + item.imported, 0),
        },
        null,
        2
      )
    );
    return;
  }

  console.log(
    `Plandex Session Adapter

Commands:
  install

  status

  sync
    --org <orgId>                      Organization ID
    --plan <planId>                    Plan ID
    --project PATH                     Project root

  plans

  recover
    --project PATH                     Project root
    --limit N                          Max plans (default: 100)
`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
