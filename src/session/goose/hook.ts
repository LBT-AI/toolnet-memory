import { loadConfig } from '../../core/index.js';

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../../storage/index.js';

import { findGooseToolNetProject } from './project-resolver.js';

import { syncGooseSession } from './adapter.js';

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

function storageFor(project: ReturnType<import('../../core/index.js').ProjectManager['detect']>) {
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

  const sessionId = stringValue(input.session_id) ?? '';

  if (!sessionId) {
    writeEmpty();
    return;
  }

  const cwd = stringValue(input.cwd) ?? '';

  if (!cwd) {
    writeEmpty();
    return;
  }

  const project = findGooseToolNetProject(cwd);

  if (!project) {
    writeEmpty();
    return;
  }

  const storage = storageFor(project);

  try {
    await syncGooseSession({
      project,
      storage,
      sessionId,
      cwd,
    });
  } catch {
    // Capture failure must not break Goose.
  }

  process.stdout.write('{}');
}

main().catch(() => {
  process.stdout.write('{}');
  process.exitCode = 0;
});

export { main };
