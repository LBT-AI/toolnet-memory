import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

import { dirname } from 'node:path';

import { rovoConfigFile } from './config-paths.js';

export interface RovoHookInstallOptions {
  binary?: string;

  configFile?: string;
}

export interface RovoHookInstallResult {
  configFile: string;

  changed: boolean;

  hookInstalled: boolean;
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
      mode: 0o600,
    });

    renameSync(temp, file);
  } finally {
    rmSync(temp, {
      force: true,
    });
  }
}

function readYamlFile(file: string): string {
  if (!existsSync(file)) {
    return '';
  }

  return readFileSync(file, 'utf8');
}

function ensureHooksSection(content: string): string {
  const hookLine = `  - type: command
    command: ${quote('toolnet-memory hook rovo')}
    timeout: 10
`;

  if (content.includes('hooks:')) {
    if (content.includes('toolnet-memory hook rovo')) {
      return content;
    }

    const lines = content.split('\n');
    const lastIndex = lines.length - 1;
    let insertIndex = lastIndex;

    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].trim() === '') {
        insertIndex = i;
      } else {
        break;
      }
    }

    lines.splice(insertIndex, 0, hookLine);

    return lines.join('\n');
  }

  return content + `\nhooks:\n${hookLine}`;
}

export function installRovoHooks(options: RovoHookInstallOptions = {}): RovoHookInstallResult {
  const binary = options.binary ?? 'toolnet-memory';
  const configFile = options.configFile ?? rovoConfigFile();

  mkdirSync(dirname(configFile), {
    recursive: true,
    mode: 0o700,
  });

  if (!existsSync(configFile)) {
    const initialContent = `hooks:
  - type: command
    command: ${quote(`${binary} hook rovo`)}
    timeout: 10
`;

    atomicWriteFile(configFile, initialContent);

    return {
      configFile,
      changed: true,
      hookInstalled: true,
    };
  }

  const original = readYamlFile(configFile);
  const updated = ensureHooksSection(original);

  const changed = original !== updated;

  if (changed) {
    atomicWriteFile(configFile, updated);
  }

  return {
    configFile,
    changed,
    hookInstalled: changed,
  };
}
