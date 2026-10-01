import { loadConfig } from '../../core/index.js';

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../../storage/index.js';

import { findHermesToolNetProject } from './project-resolver.js';

import { syncHermesSession } from './adapter.js';

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

  const sessionId = stringValue(input.session_id) ?? '';

  if (!sessionId) {
    writeEmpty();
    return;
  }

  const cwd = stringValue(input.cwd) ?? process.cwd();

  if (!cwd) {
    writeEmpty();
    return;
  }

  const project = findHermesToolNetProject(cwd);

  if (!project) {
    writeEmpty();
    return;
  }

  const storage = storageFor(project);

  try {
    await syncHermesSession({
      project,
      storage,
      sessionId,
      cwd,
      platform: stringValue(input.platform),
    });
  } catch {
    // Capture failure must not break Hermes.
  }

  process.stdout.write('{}');
}

main().catch(() => {
  process.stdout.write('{}');
  process.exitCode = 0;
});

export { main };
