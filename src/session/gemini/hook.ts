import { loadConfig } from '../../core/index.js';

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../../storage/index.js';

import { syncGeminiSession } from './adapter.js';

import { findGeminiToolNetProject } from './project-resolver.js';

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
    { attempts: 3 }
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

  if (hookEvent !== 'SessionStart' && hookEvent !== 'SessionEnd') {
    process.stdout.write('{}');
    return;
  }

  const sessionId = stringValue(input.session_id) ?? '';
  const cwd = stringValue(input.cwd) ?? '';

  if (!sessionId || !cwd) {
    process.stdout.write('{}');
    return;
  }

  const project = findGeminiToolNetProject(cwd);

  if (!project) {
    process.stdout.write('{}');
    return;
  }

  try {
    await syncGeminiSession({
      project,
      storage: storageFor(project),
      sessionId,
      cwd,
      transcriptPath: stringValue(input.transcript_path),
      hookEvent,
    });
  } catch {
    // Capture failure must never break Gemini CLI.
  }

  process.stdout.write('{}');
}

main().catch(() => {
  process.stdout.write('{}');
  process.exitCode = 0;
});

export { main };
