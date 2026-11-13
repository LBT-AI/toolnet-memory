import { loadConfig, ProjectManager } from '../../core/index.js';

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../../storage/index.js';

import { syncContinueSession } from './adapter.js';

import { recoverContinueProject } from './recovery.js';

import { inspectContinueStatus } from './status.js';

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

  if (command === 'status') {
    const status = inspectContinueStatus();

    console.log('Continue CLI Integration Status');
    console.log('===============================');
    console.log(`Binary detected  : ${status.binaryDetected ? 'yes' : 'no'}`);
    console.log(`Config ready     : ${status.configReady ? 'yes' : 'no'}`);
    console.log(`Sessions ready   : ${status.sessionsReady ? 'yes' : 'no'}`);
    console.log(`Sessions dir     : ${status.sessionsDirectory}`);
    console.log('Capture mode     : manual sync from native session files');

    return;
  }

  if (command !== 'sync' && command !== 'recover') {
    console.log(`Continue CLI Session Adapter

Commands:
  status

  sync <session-file>
    --project PATH                   Project root

  recover
    --project PATH                   Project root
    --limit N                        Max sessions (default: 20)

Continue exposes no lifecycle hooks; sessions are imported manually from
~/.continue/sessions/*.json.
`);
    return;
  }

  const projectPath = after(args, '--project') ?? process.cwd();

  const project = new ProjectManager().detect(projectPath);
  const storage = storageFor(project);

  if (command === 'sync') {
    const sessionFile = args[0];

    if (!sessionFile) {
      throw new Error('Usage: sync <session-file> --project PATH');
    }

    const result = await syncContinueSession({
      project,
      storage,
      sessionFile,
      cwd: project.rootPath,
    });

    console.log(JSON.stringify(result, null, 2));

    if (result.materialization?.status === 'failed') {
      process.exitCode = 1;
    }

    return;
  }

  const rawLimit = Number(after(args, '--limit') ?? 20);

  const results = await recoverContinueProject(
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
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);

  process.exit(1);
});
