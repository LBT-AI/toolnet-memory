import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

import { dirname, join } from 'node:path';

import { kimiConfigFile } from './config-paths.js';

export interface KimiHookInstallOptions {
  configFile?: string;

  binary?: string;
}

export interface KimiHookInstallResult {
  configFile: string;

  changed: boolean;

  stopInstalled: boolean;

  sessionEndInstalled: boolean;
}

function quote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function readTomlFile(file: string): string {
  if (!existsSync(file)) {
    return '';
  }

  return readFileSync(file, 'utf8');
}

function atomicWriteToml(file: string, content: string): void {
  mkdirSync(dirname(file), {
    recursive: true,
    mode: 0o700,
  });

  const temp = `${file}.tmp-${process.pid}-${Date.now()}`;

  try {
    writeFileSync(temp, content, {
      encoding: 'utf8',
      mode: 0o600,
    });

    renameSync(temp, file);
  } finally {
    rmSync(temp, {
      force: true,
    });
  }
}

export function installKimiHooks(options: KimiHookInstallOptions = {}): KimiHookInstallResult {
  const configFile = options.configFile ?? kimiConfigFile();

  let content = readTomlFile(configFile);

  const binary = options.binary ?? 'toolnet-memory';

  const stopCommand = `${quote(binary)} session:kimi-hook`;
  const sessionEndCommand = `${quote(binary)} session:kimi-hook`;

  const stopEntry = `[[hooks]]
name = "toolnet-memory-stop"
event = "Stop"
command = ${stopCommand}
timeout = 30
`;

  const sessionEndEntry = `[[hooks]]
name = "toolnet-memory-session-end"
event = "SessionEnd"
command = ${sessionEndCommand}
timeout = 3
`;

  let changed = false;

  if (!content.includes('toolnet-memory-stop')) {
    content = content.trim() + '\n\n' + stopEntry + '\n';
    changed = true;
  }

  if (!content.includes('toolnet-memory-session-end')) {
    content = content.trim() + '\n\n' + sessionEndEntry + '\n';
    changed = true;
  }

  if (changed) {
    atomicWriteToml(configFile, content);
  } else if (!existsSync(configFile)) {
    atomicWriteToml(configFile, stopEntry + '\n' + sessionEndEntry + '\n');
    changed = true;
  }

  return {
    configFile,
    changed,
    stopInstalled: true,
    sessionEndInstalled: true,
  };
}
