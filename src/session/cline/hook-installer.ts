import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

import { dirname, join } from 'node:path';

import { clineHooksDir } from './config-paths.js';

export interface ClineHookInstallOptions {
  projectRoot?: string;

  binary?: string;
}

export interface ClineHookInstallResult {
  hooksDir: string;

  hooksFile: string;

  changed: boolean;

  taskCompleteInstalled: boolean;

  taskStartInstalled: boolean;
}

function quote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function atomicWriteFile(file: string, content: string): void {
  mkdirSync(dirname(file), {
    recursive: true,
    mode: 0o700,
  });

  const temp = `${file}.tmp-${process.pid}-${Date.now()}`;

  try {
    writeFileSync(temp, content, {
      encoding: 'utf8',
      mode: 0o755,
    });

    renameSync(temp, file);
  } finally {
    rmSync(temp, {
      force: true,
    });
  }
}

function hookScript(binary: string): string {
  const cmd = `${quote(binary)} hook cline`;
  return `#!/bin/sh
exec ${cmd}
`;
}

export function installClineHooks(options: ClineHookInstallOptions = {}): ClineHookInstallResult {
  const binary = options.binary ?? 'toolnet-memory';
  const hooksDir = clineHooksDir(options.projectRoot);
  const hooksFile = join(hooksDir, 'toolnet-memory.sh');

  mkdirSync(hooksDir, {
    recursive: true,
    mode: 0o700,
  });

  const scriptContent = hookScript(binary);
  const changed = !existsSync(hooksFile) || readFileSync(hooksFile, 'utf8') !== scriptContent;

  atomicWriteFile(hooksFile, scriptContent);

  const taskCompleteHook = join(hooksDir, 'TaskComplete');
  const taskStartHook = join(hooksDir, 'TaskStart');

  let taskCompleteInstalled = false;
  let taskStartInstalled = false;

  if (!existsSync(taskCompleteHook) || readFileSync(taskCompleteHook, 'utf8') !== scriptContent) {
    atomicWriteFile(taskCompleteHook, scriptContent);
    taskCompleteInstalled = true;
  }

  if (!existsSync(taskStartHook) || readFileSync(taskStartHook, 'utf8') !== scriptContent) {
    atomicWriteFile(taskStartHook, scriptContent);
    taskStartInstalled = true;
  }

  return {
    hooksDir,
    hooksFile,
    changed: changed || taskCompleteInstalled || taskStartInstalled,
    taskCompleteInstalled,
    taskStartInstalled,
  };
}
