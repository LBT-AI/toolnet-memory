import { spawn } from 'node:child_process';

import { mkdirSync } from 'node:fs';

import { dirname, join } from 'node:path';

export interface AiderWrapperResult {
  exitCode: number | null;
  signal: string | null;
  historyPath: string;
}

function forwardSignal(child: ReturnType<typeof spawn>, signal: NodeJS.Signals): void {
  if (child.pid && !child.killed) {
    try {
      process.kill(child.pid, signal);
    } catch {
      // Child may have already exited.
    }
  }
}

export async function spawnAiderSession(options: {
  sessionId: string;
  cwd: string;
  aiderBinary: string;
  aiderArgs: string[];
}): Promise<AiderWrapperResult> {
  const { sessionId, cwd, aiderBinary, aiderArgs } = options;

  const historyDir = join(cwd, '.toolnet', 'aider-history');
  mkdirSync(historyDir, { recursive: true, mode: 0o700 });

  const uniqueHistoryPath = join(historyDir, `${sessionId}.md`);

  const env = {
    ...process.env,
    AIDER_CHAT_HISTORY_FILE: uniqueHistoryPath,
  };

  const child = spawn(aiderBinary, ['--chat-history-file', uniqueHistoryPath, ...aiderArgs], {
    cwd,
    env,
    shell: false,
    stdio: 'inherit',
  });

  const result: AiderWrapperResult = {
    exitCode: null,
    signal: null,
    historyPath: uniqueHistoryPath,
  };

  const unsubInt = () => {};
  const unsubTerm = () => {};

  const onInt = () => forwardSignal(child, 'SIGINT');
  const onTerm = () => forwardSignal(child, 'SIGTERM');

  process.once('SIGINT', onInt);
  process.once('SIGTERM', onTerm);

  await new Promise<void>((resolve) => {
    child.on('exit', (code, signal) => {
      result.exitCode = code ?? null;
      result.signal = (signal as string | null) ?? null;
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
