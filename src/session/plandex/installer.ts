import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

import { dirname, join } from 'node:path';

import { homedir } from 'node:os';

export interface PlandexInstallOptions {
  binary?: string;
}

export interface PlandexInstallResult {
  configPath: string;
  changed: boolean;
}

function plandexBaseDir(): string {
  return process.env.PLANDEX_BASE_DIR ?? join(homedir(), 'plandex-server');
}

function readJsonFile(file: string): Record<string, unknown> {
  if (!existsSync(file)) {
    return {};
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    throw new Error(`Invalid existing Plandex config at ${file}: parse error. Not overwriting.`);
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Invalid existing Plandex config at ${file}: root must be a JSON object.`);
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

export function installPlandexIntegration(
  options: PlandexInstallOptions = {}
): PlandexInstallResult {
  const baseDir = plandexBaseDir();
  const configFile = join(baseDir, 'toolnet-memory.json');

  const root = readJsonFile(configFile);

  const toolnetConfig: Record<string, unknown> = (root.toolnetMemory ?? {}) as Record<
    string,
    unknown
  >;

  toolnetConfig.integration = 'toolnet-memory';
  toolnetConfig.captureMode = 'manual-recovery';
  toolnetConfig.managedBy = 'toolnet-memory';

  root.toolnetMemory = toolnetConfig;

  const next = JSON.stringify(root, null, 2) + '\n';

  const changed = !existsSync(configFile) || readFileSync(configFile, 'utf8') !== next;

  atomicWriteJson(configFile, root);

  return {
    configPath: configFile,
    changed,
  };
}
