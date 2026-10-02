import { loadConfig } from '../../core/index.js';

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../../storage/index.js';

import { findClineToolNetProject } from './project-resolver.js';

import { syncClineSession } from './adapter.js';

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

  const hookName = stringValue(input.hookName) ?? stringValue(input.hook_name);

  if (
    hookName !== 'TaskComplete' &&
    hookName !== 'TaskStart' &&
    hookName !== 'agent_end' &&
    hookName !== 'agent_start'
  ) {
    writeEmpty();
    return;
  }

  const cwd = stringValue(input.cwd) ?? process.cwd();

  const project = findClineToolNetProject(cwd);

  if (!project) {
    writeEmpty();
    return;
  }

  const storage = storageFor(project);

  try {
    await syncClineSession({
      project,
      storage,
      hookName,
      payload: input,
      cwd,
    });
  } catch {
    // Capture failure must not break Cline.
  }

  writeEmpty();
}

main().catch(() => {
  writeEmpty();
  process.exitCode = 0;
});

export { main };
