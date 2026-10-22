import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { dirname, resolve } from 'node:path';

import { loadConfig, ProjectManager } from '../../core/index.js';

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../../storage/index.js';

import { syncJunieSession } from './adapter.js';

import { junieSessionStateFile } from './config-paths.js';

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

function projectArg(args: string[]): string | undefined {
  const index = args.indexOf('--project');

  return index >= 0 ? args[index + 1] : undefined;
}

interface JunieSessionState {
  sessionId: string;

  cwd: string;

  updatedAt: string;
}

function readState(file: string): JunieSessionState | undefined {
  if (!existsSync(file)) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as Partial<JunieSessionState>;

    if (typeof parsed.sessionId === 'string' && parsed.sessionId) {
      return {
        sessionId: parsed.sessionId,
        cwd: typeof parsed.cwd === 'string' ? parsed.cwd : '',
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
      };
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function writeState(file: string, state: JunieSessionState): void {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });

  writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
}

function storageFor(project: ReturnType<ProjectManager['detect']>) {
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

  const projectPath = projectArg(process.argv.slice(2));

  if (!projectPath || !hookEvent) {
    process.stdout.write('{}');
    return;
  }

  const project = new ProjectManager().detect(resolve(projectPath));
  const stateFile = junieSessionStateFile(project.rootPath);

  if (hookEvent === 'SessionStart') {
    const sessionId = stringValue(input.session_id) ?? '';
    const cwd = stringValue(input.cwd) ?? project.rootPath;

    if (!sessionId) {
      process.stdout.write('{}');
      return;
    }

    writeState(stateFile, {
      sessionId,
      cwd,
      updatedAt: new Date().toISOString(),
    });

    try {
      await syncJunieSession({
        project,
        storage: storageFor(project),
        sessionId,
        cwd,
        event: 'SessionStart',
      });
    } catch {
      // Capture failure must never break Junie.
    }

    process.stdout.write('{}');
    return;
  }

  if (hookEvent !== 'Stop' && hookEvent !== 'SessionEnd') {
    process.stdout.write('{}');
    return;
  }

  const state = readState(stateFile);

  if (!state) {
    process.stdout.write('{}');
    return;
  }

  try {
    await syncJunieSession({
      project,
      storage: storageFor(project),
      sessionId: state.sessionId,
      cwd: state.cwd || project.rootPath,
      event: hookEvent,
      lastAssistantMessage: stringValue(input.last_assistant_message),
      reason: stringValue(input.reason),
    });
  } catch {
    // Capture failure must never break Junie.
  }

  if (hookEvent === 'SessionEnd') {
    rmSync(stateFile, { force: true });
  }

  process.stdout.write('{}');
}

main().catch(() => {
  process.stdout.write('{}');
  process.exitCode = 0;
});

export { main };
