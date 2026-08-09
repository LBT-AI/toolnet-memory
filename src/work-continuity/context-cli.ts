import { loadConfig, ProjectManager } from '../core/index.js';

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../storage/index.js';

import { createSessionIdentity } from '../session/identity.js';

import { buildStartupBrief } from './brief.js';

import { loadLatestHandoff, SmartHandoffManager } from './handoff.js';

function after(
  args: string[],

  flag: string
): string | undefined {
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

  const project = new ProjectManager().detect(after(args, '--project') ?? process.cwd());

  const storage = storageFor(project);

  if (command === 'brief') {
    const maxTokens = Number(after(args, '--tokens') ?? 1000);

    const brief = await buildStartupBrief({
      project,

      storage,

      maxTokens: Number.isFinite(maxTokens) ? maxTokens : 1000,
    });

    process.stdout.write(brief.text + '\n');

    return;
  }

  if (command === 'brief-json') {
    const brief = await buildStartupBrief({
      project,
      storage,

      maxTokens: Number(after(args, '--tokens') ?? 1000),
    });

    console.log(JSON.stringify(brief, null, 2));

    return;
  }

  if (command === 'handoff-latest') {
    const handoff = await loadLatestHandoff(project, storage);

    console.log(JSON.stringify(handoff, null, 2));

    return;
  }

  if (command === 'handoff-create') {
    const agent = (after(args, '--agent') ?? 'manual') as 'opencode' | 'agy' | 'codex' | 'manual';

    if (agent === 'manual') {
      /*
       * Manual maintenance command only.
       * Session adapters use native IDs automatically.
       */
      throw new Error('--agent must be opencode, agy, or codex');
    }

    const session = after(args, '--session');

    if (!session) {
      throw new Error('--session is required');
    }

    const identity = createSessionIdentity(project, agent, session);

    const manager = new SmartHandoffManager({
      project,
      storage,
      identity,
    });

    const result = await manager.capture('manual', 0);

    console.log(JSON.stringify(result, null, 2));

    return;
  }

  console.log(
    `Work Context

Commands:
  brief [--project PATH] [--tokens N]
  brief-json [--project PATH] [--tokens N]
  handoff-latest [--project PATH]
  handoff-create --agent <opencode|agy|codex> --session <id>
`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);

  process.exit(1);
});
