import { existsSync, readFileSync } from 'node:fs';

import { loadConfig, ProjectManager } from '../../core/index.js';

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../../storage/index.js';

import { installBobIntegration } from './installer.js';

import { inspectBobStatus } from './status.js';

import { recoverBobProject } from './recovery.js';

import { syncBobSession } from './adapter.js';

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

async function main() {
  const [command = 'help', ...args] = process.argv.slice(2);

  if (command === 'install-hooks' || command === 'install') {
    const projectRoot = after(args, '--project');

    const result = installBobIntegration({
      binary: after(args, '--bin'),

      projectRoot,
    });

    console.log(`✅ Bob hooks installed: ${result.settingsFile}`);

    return;
  }

  if (command === 'status') {
    const status = inspectBobStatus();

    console.log('IBM Bob Integration Status');
    console.log('=========================');
    console.log(`Detected     : ${status.detected ? '✓' : '✗'}`);
    console.log(`Configured   : ${status.configured ? '✓' : '✗'}`);
    console.log(`Hooks ready  : ${status.hooksReady ? '✓' : '✗'}`);

    if (status.error) {
      console.log(`Error        : ${status.error}`);
    }

    return;
  }

  const projectPath = after(args, '--project') ?? process.cwd();

  const project = new ProjectManager().detect(projectPath);

  const storage = storageFor(project);

  if (command === 'hook') {
    const { main } = await import('./hook.js');

    await main();

    return;
  }

  if (command === 'sync') {
    const sessionId = args[0];

    if (!sessionId) {
      throw new Error('Usage: sync <session-id>');
    }

    const result = await syncBobSession({
      project,

      storage,

      sessionId,

      cwd: project.rootPath,
    });

    console.log(JSON.stringify(result, null, 2));

    if (result.materialization?.status === 'failed') {
      process.exitCode = 1;
    }

    return;
  }

  if (command === 'recover') {
    const rawLimit = Number(after(args, '--limit') ?? 100);

    const results = await recoverBobProject({
      projectRoot: project.rootPath,

      sessionId: after(args, '--session-id'),

      limit: Number.isFinite(rawLimit) ? rawLimit : 100,
    });

    console.log(
      JSON.stringify(
        {
          project: project.name,

          sessions: results.sessions,

          imported: results.imported,
        },
        null,
        2
      )
    );

    return;
  }

  console.log(
    `IBM Bob Session Adapter

Commands:
  install-hooks / install
    --bin PATH                       Binary path
    --project PATH                   Project root

  status

  hook
    Reads Bob Stop/SessionStart hook event from stdin.

  sync <session-id>
    --project PATH                   Project root

  recover
    --project PATH                   Project root
    --session-id ID                  Specific session ID
    --limit N                        Max sessions (default: 100)
`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);

  process.exit(1);
});
