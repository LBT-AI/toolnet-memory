import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

import { dirname, join } from 'node:path';

import { homedir } from 'node:os';

export interface AiderInstallOptions {
  binary?: string;
  cwd?: string;
}

export interface AiderInstallResult {
  launcherPath: string;
  changed: boolean;
}

function quote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function atomicWrite(file: string, content: string): void {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });

  const temp = `${file}.tmp-${process.pid}-${Date.now()}`;

  try {
    writeFileSync(temp, content, { encoding: 'utf8', mode: 0o755 });
    renameSync(temp, file);
  } finally {
    rmSync(temp, { force: true });
  }
}

const WRAPPER_SCRIPT = `#!/usr/bin/env node
// ToolNet-managed aider wrapper - DO NOT EDIT
// Installed by toolnet-memory session:aider-install

import { spawn as childSpawn } from 'node:child_process';

import { mkdirSync } from 'node:fs';

import { dirname, join } from 'node:path';

function forwardSignal(child, signal) {
  if (child.pid && !child.killed) {
    try {
      process.kill(child.pid, signal);
    } catch {
      // Child may have already exited.
    }
  }
}

async function spawnAiderSession(sessionId, cwd, aiderBinary, aiderArgs) {
  const historyDir = join(cwd, '.toolnet', 'aider-history');
  mkdirSync(historyDir, { recursive: true, mode: 0o700 });

  const uniqueHistoryPath = join(historyDir, sessionId + '.md');

  const env = {
    ...process.env,
    AIDER_CHAT_HISTORY_FILE: uniqueHistoryPath,
  };

  const child = childSpawn(aiderBinary, ['--chat-history-file', uniqueHistoryPath, ...aiderArgs], {
    cwd,
    env,
    shell: false,
    stdio: 'inherit',
  });

  const result = { exitCode: null, signal: null, historyPath: uniqueHistoryPath };

  const onInt = () => forwardSignal(child, 'SIGINT');
  const onTerm = () => forwardSignal(child, 'SIGTERM');

  process.once('SIGINT', onInt);
  process.once('SIGTERM', onTerm);

  await new Promise((resolve) => {
    child.on('exit', (code, signal) => {
      result.exitCode = code ?? null;
      result.signal = (signal ?? null);
      resolve();
    });

    child.on('error', () => {
      result.exitCode = 1;
      resolve();
    });
  });

  process.removeListener('SIGINT', onInt);
  process.removeListener('SIGTERM', onTerm);

  return result;
}

async function main() {
  const cwd = process.cwd();
  const sessionId = process.env.TOOLNET_AIDER_SESSION_ID ?? Date.now().toString(36);
  const aiderBinary = process.argv[2] ?? 'aider';
  const aiderArgs = process.argv.slice(3);

  const result = await spawnAiderSession(sessionId, cwd, aiderBinary, aiderArgs);
  process.exitCode = result.exitCode ?? 0;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
`;

export function installAiderIntegration(options: AiderInstallOptions = {}): AiderInstallResult {
  const targetDir = options.cwd
    ? join(options.cwd, '.toolnet', 'bin')
    : join(process.env.TOOLNET_HOME ?? join(homedir(), '.toolnet'), 'bin');

  mkdirSync(targetDir, { recursive: true, mode: 0o700 });

  const launcherPath = join(targetDir, 'aider-wrapper');

  const desired = WRAPPER_SCRIPT.endsWith('\n') ? WRAPPER_SCRIPT : WRAPPER_SCRIPT + '\n';

  const changed = !existsSync(launcherPath) || readFileSync(launcherPath, 'utf8') !== desired;

  atomicWrite(launcherPath, desired);

  return {
    launcherPath,
    changed,
  };
}
