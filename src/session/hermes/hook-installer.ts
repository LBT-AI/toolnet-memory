import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

import { dirname, join } from 'node:path';

import { hermesConfigFile } from './config-paths.js';

export interface HermesHookInstallOptions {
  configFile?: string;

  binary?: string;
}

export interface HermesHookInstallResult {
  configFile: string;

  changed: boolean;

  sessionEndInstalled: boolean;
}

function quote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function readYamlFile(file: string): string {
  if (!existsSync(file)) {
    return '';
  }

  return readFileSync(file, 'utf8');
}

function atomicWriteYaml(file: string, content: string): void {
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

export function installHermesHooks(
  options: HermesHookInstallOptions = {}
): HermesHookInstallResult {
  const configFile = options.configFile ?? hermesConfigFile();

  let content = readYamlFile(configFile);

  const binary = options.binary ?? 'toolnet-memory';

  const command = `${quote(binary)} session:hermes-hook`;

  const hookEntry = `  - name: toolnet-memory-session-end
    event: on_session_end
    command: ${command}
    timeout: 30
`;

  let changed = false;

  if (!content.includes('toolnet-memory-session-end')) {
    if (content.includes('hooks:')) {
      content = content.replace(/hooks:\n/, `hooks:\n${hookEntry}`);
    } else {
      content = content.trim() + '\n\nhooks:\n' + hookEntry;
    }

    changed = true;
  }

  if (changed || !existsSync(configFile)) {
    if (!content.endsWith('\n')) {
      content += '\n';
    }

    atomicWriteYaml(configFile, content);
  }

  return {
    configFile,
    changed,
    sessionEndInstalled: true,
  };
}
