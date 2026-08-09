import { loadConfig, ProjectManager } from '../../core/index.js';

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../../storage/index.js';

import { ProjectLock } from '../../production/project-lock.js';

import { reconcileSessionMemoryJournal } from './journal.js';

function after(
  args: string[],

  flag: string
): string | undefined {
  const index = args.indexOf(flag);

  return index >= 0 ? args[index + 1] : undefined;
}

async function main() {
  const [command = 'help', ...args] = process.argv.slice(2);

  if (command !== 'reconcile') {
    console.log(
      `Session Memory Learner

Commands:
  reconcile [--project PATH]
`
    );

    return;
  }

  const projectPath = after(args, '--project') ?? process.cwd();

  const project = new ProjectManager().detect(projectPath);

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

  const storage = new ProjectScopedStorageProvider(
    raw,
    project.id,
    project.name,
    project.remote ?? project.name
  );

  /*
   * Reconcile writes current.json.
   * Serialize against ToolNet runtime.
   */
  const lock = new ProjectLock(project.id);

  await lock.acquire();

  try {
    const result = await reconcileSessionMemoryJournal(project, storage);

    console.log(
      JSON.stringify(
        {
          project: project.name,

          ...result,
        },
        null,
        2
      )
    );
  } finally {
    await lock.release();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);

  process.exit(1);
});
