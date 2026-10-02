import { loadConfig, ProjectManager } from '../../core/index.js';

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../../storage/index.js';

import { installRovoIntegration } from './installer.js';

import { inspectRovoStatus } from './status.js';

import { recoverRovoProject } from './recovery.js';

import { syncRovoSession } from './adapter.js';

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
    const result = installRovoIntegration({
      binary: after(args, '--bin'),
    });

    console.log(`✅ Rovo hooks installed: ${result.configFile}`);

    return;
  }

  if (command === 'status') {
    const status = inspectRovoStatus();

    console.log('Rovo Dev CLI Integration Status');
    console.log('================================');
    console.log(`Binary detected  : ${status.binaryDetected ? '✓' : '✗'}`);
    console.log(`Config ready     : ${status.configReady ? '✓' : '✗'}`);
    console.log(`Hooks available  : ${status.hooksAvailable ? '✓' : '✗'}`);

    if (status.configPath) {
      console.log(`Config path      : ${status.configPath}`);
    }

    return;
  }

  const projectPath = after(args, '--project') ?? process.cwd();

  const project = new ProjectManager().detect(projectPath);

  const storage = storageFor(project);

  if (command === 'sync') {
    const eventType = args[0] ?? 'on_tool_permission';

    if (!eventType) {
      throw new Error('Usage: sync <event-type>');
    }

    const result = await syncRovoSession({
      project,
      storage,
      eventType,
      payload: { session_id: `cli-${Date.now()}`, cwd: project.rootPath },
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

    const results = await recoverRovoProject({
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
    const eventType = after(args, '--event') ?? 'on_tool_permission';

    const payload = {
      event_type: eventType,
      session_id: `hook-${Date.now()}`,
      cwd: project.rootPath,
    };

    const result = await syncRovoSession({
      project,
      storage,
      eventType,
      payload,
      cwd: project.rootPath,
    });

    console.log(JSON.stringify(result, null, 2));

    return;
  }

  console.log(
    `Rovo Dev CLI Session Adapter

Commands:
  install-hooks / install
    --bin PATH                       Binary path

  status

  sync <event-type>
    --project PATH                   Project root

  recover
    --project PATH                   Project root
    --limit N                        Max sessions (default: 100)

  hook
    --event EVENT_TYPE               Event type (default: on_tool_permission)
`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);

  process.exit(1);
});
