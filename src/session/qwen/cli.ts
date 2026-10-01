import { existsSync, readFileSync } from 'node:fs';

import { loadConfig, ProjectManager } from '../../core/index.js';

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../../storage/index.js';

import { syncQwenSession } from './adapter.js';

import { findQwenToolNetProject } from './project-resolver.js';

import { installQwenIntegration } from './installer.js';

import { inspectQwenStatus } from './status.js';

import { recoverQwenProject } from './recovery.js';

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

    const result = installQwenIntegration({
      binary: after(args, '--bin'),

      projectRoot,
    });

    console.log(`✅ Qwen hooks installed: ${result.hooksFile}`);

    return;
  }

  if (command === 'status') {
    const status = inspectQwenStatus();

    console.log('Qwen Integration Status');
    console.log('=======================');
    console.log(`Binary detected: ${status.binaryDetected ? '✓' : '✗'}`);
    console.log(`Hooks ready     : ${status.hooksReady ? '✓' : '✗'}`);

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

    const result = await syncQwenSession({
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

    const results = await recoverQwenProject(
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

  console.log(
    `Qwen Session Adapter

Commands:
  install-hooks / install
    --bin PATH                       Binary path
    --project PATH                   Project root

  status

  sync <session-id>
    --project PATH                   Project root

  recover
    --project PATH                   Project root
    --limit N                        Max sessions (default: 100)
`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);

  process.exit(1);
});
