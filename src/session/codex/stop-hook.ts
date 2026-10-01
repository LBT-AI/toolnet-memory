import { loadConfig, ProjectManager } from '../../core/index.js';

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../../storage/index.js';

import { findCodexToolNetProject } from './project-resolver.js';

import { syncCodexSession } from './adapter.js';

async function readInput(): Promise<Record<string, unknown>> {
  let raw = '';

  for await (const chunk of process.stdin) {
    raw += chunk.toString();
  }

  if (!raw.trim()) {
    return {};
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function writeEmpty(): void {
  process.stdout.write('{}');
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
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

async function main(): Promise<void> {
  const input = await readInput();

  const hookEvent = stringValue(input.hook_event_name);

  if (hookEvent !== 'Stop' && hookEvent !== 'SessionEnd') {
    writeEmpty();
    return;
  }

  const threadId = stringValue(input.session_id) ?? '';

  if (!threadId) {
    writeEmpty();
    return;
  }

  const cwd = stringValue(input.cwd) ?? '';

  if (!cwd) {
    writeEmpty();
    return;
  }

  const project = findCodexToolNetProject(cwd);

  if (!project) {
    writeEmpty();
    return;
  }

  const rolloutPath = stringValue(input.transcript_path) ?? '';

  if (!rolloutPath) {
    writeEmpty();
    return;
  }

  const storage = storageFor(project);

  const turnId = stringValue(input.turn_id);

  const client = stringValue(input.client);

  try {
    await syncCodexSession({
      project,
      storage,
      threadId,
      rolloutPath,
      cwd,
      turnId,
      client,
      idle: hookEvent === 'SessionEnd',
    });
  } catch {
    // Capture failure must not break Codex.
  }

  process.stdout.write('{}');
}

main().catch(() => {
  process.stdout.write('{}');
  process.exitCode = 0;
});

export { main };
