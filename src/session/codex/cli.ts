import { existsSync, readFileSync } from 'node:fs';

import { spawn } from 'node:child_process';

import { homedir } from 'node:os';

import { join } from 'node:path';

import { loadConfig, ProjectManager } from '../../core/index.js';

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../../storage/index.js';

import { syncCodexSession } from './adapter.js';

import { findCodexRollout } from './discovery.js';

import { findCodexToolNetProject } from './project-resolver.js';

import { recoverCodexProject } from './recovery.js';

import { installCodexNotify } from './notify-installer.js';

import { installCodexContextHook } from './context-hook-installer.js';

import { refreshStartupBriefCache } from '../../work-continuity/brief-cache.js';

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

async function waitForRollout(threadId: string) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const file = findCodexRollout(threadId);

    if (file) {
      return file;
    }

    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  return null;
}

function runPreviousNotify(rawPayload: string) {
  const previousFile = join(homedir(), '.config', 'toolnet-memory', 'codex-notify-previous.json');

  if (!existsSync(previousFile)) {
    return;
  }

  try {
    const argv = JSON.parse(readFileSync(previousFile, 'utf8'));

    if (
      !Array.isArray(argv) ||
      argv.length === 0 ||
      !argv.every((item) => typeof item === 'string')
    ) {
      return;
    }

    const child = spawn(argv[0], [...argv.slice(1), rawPayload], {
      detached: true,

      stdio: 'ignore',
    });

    child.unref();
  } catch {
    // Existing notifier must never break Codex.
  }
}

async function notify(raw: string) {
  let payload: Record<string, unknown>;

  try {
    payload = JSON.parse(raw);
  } catch {
    return;
  }

  const type = payload.type;

  if (type !== 'agent-turn-complete') {
    return;
  }

  const threadId = typeof payload['thread-id'] === 'string' ? (payload['thread-id'] as string) : '';

  const turnId = typeof payload['turn-id'] === 'string' ? (payload['turn-id'] as string) : '';

  const cwd = typeof payload.cwd === 'string' ? payload.cwd : '';

  const client = typeof payload.client === 'string' ? payload.client : undefined;

  if (!threadId || !cwd) {
    return;
  }

  const project = findCodexToolNetProject(cwd);

  /*
   * Global Codex notify:
   * ignore non-ToolNet projects.
   */
  if (!project) {
    return;
  }

  const rolloutPath = await waitForRollout(threadId);

  if (!rolloutPath) {
    /*
     * Recovery command will backfill later.
     */
    return;
  }

  const storage = storageFor(project);

  await syncCodexSession({
    project,
    storage,

    threadId,
    rolloutPath,
    cwd,
    turnId,
    client,

    idle: true,
  });

  try {
    await refreshStartupBriefCache(project, storage, 800);
  } catch {
    // Derived cache must never break Codex notify.
  }
}

async function main() {
  const [command = 'help', ...args] = process.argv.slice(2);

  if (command === 'install-notify') {
    const binary = after(args, '--bin');

    const result = installCodexNotify({
      binary,
    });

    const contextHooks = installCodexContextHook({
      binary,
    });

    console.log(`✅ Codex notify installed: ${result.configFile}`);

    if (result.preservedPrevious) {
      console.log(`✅ Previous notify preserved: ${result.previousFile}`);
    }

    console.log(`✅ Codex SessionStart context hook: ${contextHooks}`);

    return;
  }

  if (command === 'notify') {
    const raw = args[args.length - 1] ?? '';

    try {
      await notify(raw);
    } finally {
      runPreviousNotify(raw);
    }

    return;
  }

  const projectPath = after(args, '--project') ?? process.cwd();

  const project = new ProjectManager().detect(projectPath);

  const storage = storageFor(project);

  if (command === 'sync') {
    const threadId = args[0];

    if (!threadId) {
      throw new Error('Usage: sync <thread-id>');
    }

    const rolloutPath = after(args, '--rollout') ?? findCodexRollout(threadId);

    if (!rolloutPath) {
      throw new Error(`Codex rollout not found for ${threadId}`);
    }

    const result = await syncCodexSession({
      project,
      storage,

      threadId,
      rolloutPath,

      idle: args.includes('--idle'),
    });

    console.log(JSON.stringify(result, null, 2));

    return;
  }

  if (command === 'recover') {
    const rawLimit = Number(after(args, '--limit') ?? 100);

    const results = await recoverCodexProject(
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
    `Codex Session Adapter

Commands:
  install-notify
  sync <thread-id> [--project PATH]
  recover [--project PATH] [--limit N]
`
  );
}

main().catch((error) => {
  /*
   * notify must never make Codex fail.
   */
  if (process.argv[2] === 'notify') {
    process.exit(0);
  }

  console.error(error instanceof Error ? error.message : error);

  process.exit(1);
});
