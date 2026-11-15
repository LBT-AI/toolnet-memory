import { loadConfig, ProjectManager } from '../../core/index.js';

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../../storage/index.js';

import { syncGeminiSession } from './adapter.js';

import { installGeminiHooks } from './hook-installer.js';

import { findGeminiToolNetProject } from './project-resolver.js';

import { recoverGeminiProject } from './recovery.js';

import { inspectGeminiStatus } from './status.js';

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

  if (command === 'install-hooks' || command === 'install') {
    const result = installGeminiHooks({
      ...(after(args, '--settings') ? { settingsFile: after(args, '--settings') } : {}),
      ...(after(args, '--bin') ? { binary: after(args, '--bin') } : {}),
    });

    console.log(`Gemini hooks installed: ${result.settingsFile}`);
    console.log(`Events: ${result.events.join(', ')}`);

    return;
  }

  if (command === 'status') {
    const status = inspectGeminiStatus();

    console.log('Gemini CLI Integration Status');
    console.log('============================');
    console.log(`Binary detected : ${status.binaryDetected ? 'yes' : 'no'}`);
    console.log(`Settings ready  : ${status.settingsReady ? 'yes' : 'no'}`);
    console.log(`Hooks configured: ${status.hooksConfigured ? 'yes' : 'no'}`);
    console.log(`Settings file   : ${status.settingsFile}`);

    return;
  }

  const projectPath = after(args, '--project') ?? process.cwd();

  const project = after(args, '--project')
    ? new ProjectManager().detect(projectPath)
    : findGeminiToolNetProject(projectPath);

  if (!project) {
    throw new Error(`No ToolNet project found at ${projectPath}`);
  }

  const storage = storageFor(project);

  if (command === 'sync') {
    const sessionId = args[0];

    if (!sessionId) {
      throw new Error('Usage: sync <session-id> --transcript PATH');
    }

    const result = await syncGeminiSession({
      project,
      storage,
      sessionId,
      cwd: project.rootPath,
      transcriptPath: after(args, '--transcript'),
      hookEvent: 'SessionEnd',
    });

    console.log(JSON.stringify(result, null, 2));

    if (result.materialization?.status === 'failed') {
      process.exitCode = 1;
    }

    return;
  }

  if (command === 'recover') {
    const rawLimit = Number(after(args, '--limit') ?? 20);

    const results = await recoverGeminiProject(
      project,
      storage,
      Number.isFinite(rawLimit) ? rawLimit : 20
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

  console.log(`Gemini CLI Session Adapter

Commands:
  install-hooks / install
    --settings PATH                  Gemini settings.json
    --bin PATH                       ToolNet binary

  status

  sync <session-id>
    --project PATH                   Project root
    --transcript PATH                Gemini session transcript

  recover
    --project PATH                   Project root
    --limit N                        Max sessions (default: 20)
`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);

  process.exit(1);
});
