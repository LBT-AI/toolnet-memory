import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

import { dirname, join } from 'node:path';

import { homedir } from 'node:os';

export interface OpenRouterInstallOptions {
  binary?: string;
}

export interface OpenRouterInstallResult {
  configPath: string;
  blocked: boolean;
  changed: boolean;
}

function readJsonFile(file: string): Record<string, unknown> {
  if (!existsSync(file)) {
    return {};
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    throw new Error(`Invalid existing OpenRouter config at ${file}: parse error. Not overwriting.`);
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Invalid existing OpenRouter config at ${file}: root must be a JSON object.`);
  }

  return parsed as Record<string, unknown>;
}

function atomicWriteJson(file: string, value: unknown): void {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });

  const temp = `${file}.tmp-${process.pid}-${Date.now()}`;

  try {
    writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });
    renameSync(temp, file);
  } finally {
    rmSync(temp, { force: true });
  }
}

export function installOpenRouterIntegration(
  options: OpenRouterInstallOptions = {}
): OpenRouterInstallResult {
  const home = homedir();
  const configFile = join(home, '.config', 'openrouter', 'toolnet-memory.json');

  mkdirSync(dirname(configFile), { recursive: true, mode: 0o700 });

  const root = readJsonFile(configFile);

  root.toolnetMemory = {
    integration: 'toolnet-memory',
    captureMode: 'blocked-product-identity',
    managedBy: 'toolnet-memory',
    blocked: true,
    reason: 'OpenRouter CLI product identity is blocked for ToolNet integration.',
  };

  const next = JSON.stringify(root, null, 2) + '\n';

  const changed = !existsSync(configFile) || readFileSync(configFile, 'utf8') !== next;

  atomicWriteJson(configFile, root);

  return {
    configPath: configFile,
    blocked: true,
    changed,
  };
}
