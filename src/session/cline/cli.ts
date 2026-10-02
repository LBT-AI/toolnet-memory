import { loadConfig, ProjectManager } from '../../core/index.js';

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../../storage/index.js';

import { installClineIntegration } from './installer.js';

import { inspectClineStatus } from './status.js';

import { recoverClineProject } from './recovery.js';

import { syncClineSession } from './adapter.js';

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
    const result = installClineIntegration({
      binary: after(args, '--bin'),
    });

    console.log(`✅ Cline hooks installed: ${result.hooksFile}`);

    return;
  }

  if (command === 'status') {
    const status = inspectClineStatus();

    console.log('Cline CLI Integration Status');
    console.log('===========================');
    console.log(`Binary detected : ${status.binaryDetected ? '✓' : '✗'}`);
    console.log(`Hooks ready     : ${status.hooksReady ? '✓' : '✗'}`);
    console.log(`Config present  : ${status.configPresent ? '✓' : '✗'}`);

    return;
  }

  const projectPath = after(args, '--project') ?? process.cwd();

  const project = new ProjectManager().detect(projectPath);

  const storage = storageFor(project);

  if (command === 'sync') {
    const hookName = args[0] ?? 'TaskComplete';

    if (!hookName) {
      throw new Error('Usage: sync <hook-name>');
    }

    const result = await syncClineSession({
      project,
      storage,
      hookName,
      payload: { sessionId: `cli-${Date.now()}`, cwd: project.rootPath },
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

    const results = await recoverClineProject({
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

  if (command === 'hook') {
    const hookName = after(args, '--hook') ?? 'TaskComplete';

    const payload = {
      hookName,
      sessionId: `hook-${Date.now()}`,
      cwd: project.rootPath,
    };

    const result = await syncClineSession({
      project,
      storage,
      hookName,
      payload,
      cwd: project.rootPath,
    });

    console.log(JSON.stringify(result, null, 2));

    return;
  }

  console.log(
    `Cline CLI Session Adapter

Commands:
  install-hooks / install
    --bin PATH                       Binary path

  status

  sync <hook-name>
    --project PATH                   Project root

  recover
    --project PATH                   Project root
    --limit N                        Max sessions (default: 100)

  hook
    --hook HOOK_NAME                 Hook name (default: TaskComplete)
`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);

  process.exit(1);
});
