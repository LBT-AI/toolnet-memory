import { loadConfig, ProjectManager } from '../../core/index.js';

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../../storage/index.js';

import { syncAgySession } from './adapter.js';

import { installAgyPlugin } from './plugin-installer.js';

import { recoverAgyProject } from './recovery.js';

function after(args: string[], flag: string) {
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

  if (command === 'install-hooks' || command === 'install-plugin') {
    const result = installAgyPlugin({
      binary: after(args, '--bin'),
    });

    console.log(`✅ ToolNet Antigravity plugin installed: ${result.pluginRoot}`);

    for (const file of result.files) {
      console.log(`  ✓ ${file}`);
    }

    if (result.migratedLegacy.length) {
      console.log('  ✓ Legacy ToolNet Agy config migrated');
    }

    console.log('');
    console.log('Restart Antigravity CLI before testing.');

    return;
  }

  const projectPath = after(args, '--project') ?? process.cwd();

  const project = new ProjectManager().detect(projectPath);

  const storage = storageFor(project);

  if (command === 'sync') {
    const conversationId = args[0];

    const transcriptPath = after(args, '--transcript');

    if (!conversationId || !transcriptPath) {
      throw new Error('Usage: sync <conversation-id> --transcript <path>');
    }

    const result = await syncAgySession({
      project,
      storage,

      conversationId,
      transcriptPath,

      phase: 'recover',
    });

    console.log(JSON.stringify(result, null, 2));

    return;
  }

  if (command === 'recover') {
    const limit = Number(after(args, '--limit') ?? 100);

    const results = await recoverAgyProject(project, storage, Number.isFinite(limit) ? limit : 100);

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
    `Agy Session Adapter

Commands:
  install-hooks
  install-plugin
  sync <conversation-id> --transcript <path>
  recover [--project PATH] [--limit N]
`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);

  process.exit(1);
});
