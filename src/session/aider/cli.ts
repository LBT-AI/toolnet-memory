import { existsSync, readFileSync } from 'node:fs';

import { join } from 'node:path';

import { loadConfig, ProjectManager } from '../../core/index.js';

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../../storage/index.js';

import { syncAiderSession } from './adapter.js';

import { findAiderToolNetProject } from './project-resolver.js';

import { installAiderIntegration } from './installer.js';

import { inspectAiderStatus } from './status.js';

import { recoverAiderProject } from './recovery.js';

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

  if (command === 'install' || command === 'install-wrapper') {
    const cwd = after(args, '--cwd') ?? process.cwd();
    const result = installAiderIntegration({ cwd });

    console.log(`✅ Aider wrapper installed: ${result.launcherPath}`);
    return;
  }

  if (command === 'status') {
    const status = inspectAiderStatus();

    console.log('Aider Integration Status');
    console.log('========================');
    console.log(`Binary detected : ${status.binaryDetected ? '✓' : '✗'}`);
    console.log(`Configured      : ${status.configured ? '✓' : '✗'}`);
    console.log(`Launcher ready  : ${status.launcherReady ? '✓' : '✗'}`);
    if (status.lastCapture) {
      console.log(`Last capture    : ${status.lastCapture}`);
    }
    return;
  }

  const projectPath = after(args, '--project') ?? process.cwd();

  const project = new ProjectManager().detect(projectPath);

  const storage = storageFor(project);

  if (command === 'sync') {
    const sessionId = args[0];
    if (!sessionId) {
      throw new Error('Usage: sync <session-id>');
    }

    const result = await syncAiderSession({
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
    const results = await recoverAiderProject(
      project,
      storage,
      Number.isFinite(rawLimit) ? rawLimit : 100
    );

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

  if (command === 'wrapper-info') {
    const toolnetHome = process.env.TOOLNET_HOME ?? join(project.rootPath, '.toolnet');
    const launcherPath = join(toolnetHome, 'bin', 'aider-wrapper');
    console.log(`Aider wrapper path: ${launcherPath}`);
    console.log('Add .toolnet/bin to PATH or use this as your aider binary.');
    return;
  }

  console.log(
    `Aider Session Adapter

Commands:
  install / install-wrapper
    --cwd PATH                       Project root (default: cwd)

  status

  sync <session-id>
    --project PATH                   Project root

  recover
    --project PATH                   Project root
    --limit N                        Max sessions (default: 100)

  wrapper-info
`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
