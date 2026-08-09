import { loadConfig, ProjectManager } from '../../core/index.js';

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../../storage/index.js';

import { recoverOpenCodeProject, syncOpenCodeSession } from './adapter.js';

import { installOpenCodePlugin } from './plugin-installer.js';

import { refreshStartupBriefCache } from '../../work-continuity/brief-cache.js';

function valueAfter(
  args: string[],

  flag: string
): string | undefined {
  const index = args.indexOf(flag);

  if (index < 0) {
    return undefined;
  }

  return args[index + 1];
}

function has(
  args: string[],

  flag: string
): boolean {
  return args.includes(flag);
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

  if (command === 'install-plugin') {
    const target = installOpenCodePlugin({
      binary: valueAfter(args, '--bin'),
    });

    console.log(`✅ OpenCode plugin installed: ${target}`);

    console.log('OpenCode will load it automatically on next start.');

    return;
  }

  const projectPath = valueAfter(args, '--project') ?? process.cwd();

  const project = new ProjectManager().detect(projectPath);

  const storage = storageFor(project);

  const dbPath = valueAfter(args, '--db');

  if (command === 'sync') {
    const nativeSessionId = args.find(
      (value) => !value.startsWith('--') && value !== projectPath && value !== dbPath
    );

    if (!nativeSessionId) {
      throw new Error('Usage: session:opencode-sync <session-id>');
    }

    const idle = has(args, '--idle');

    const error = has(args, '--error');

    const compacted = has(args, '--compacted');

    const result = await syncOpenCodeSession({
      project,
      storage,

      nativeSessionId,
      dbPath,
      idle,
      error,
      compacted,
    });

    if (idle || compacted || error) {
      try {
        await refreshStartupBriefCache(project, storage, 900);
      } catch {
        // Derived cache must never break session capture.
      }
    }

    console.log(JSON.stringify(result, null, 2));

    return;
  }

  if (command === 'recover') {
    const limitValue = valueAfter(args, '--limit');

    const limit = limitValue ? Number(limitValue) : 100;

    const results = await recoverOpenCodeProject({
      project,
      storage,
      dbPath,
      limit: Number.isFinite(limit) ? limit : 100,
    });

    console.log(
      JSON.stringify(
        {
          project: project.name,

          sessions: results.length,

          importedMessages: results.reduce((total, item) => total + item.importedMessages, 0),

          importedParts: results.reduce((total, item) => total + item.importedParts, 0),
        },
        null,
        2
      )
    );

    return;
  }

  console.log(
    `OpenCode Session Adapter

Commands:
  sync <session-id> [--project PATH] [--idle]
  recover [--project PATH] [--limit N]
  install-plugin [--bin PATH]
`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);

  process.exit(1);
});
