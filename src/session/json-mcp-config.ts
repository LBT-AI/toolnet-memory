import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

import { dirname } from 'node:path';

export type JsonObject = Record<string, unknown>;

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readJsonObjectConfig(file: string, productName: string): JsonObject {
  if (!existsSync(file)) {
    return {};
  }

  const raw = readFileSync(file, 'utf8').trim();

  if (!raw) {
    return {};
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Invalid existing ${productName} MCP config: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (!isJsonObject(parsed)) {
    throw new Error(`Invalid existing ${productName} MCP config: root must be a JSON object.`);
  }

  return parsed;
}

export function atomicWriteJson(file: string, value: unknown): void {
  mkdirSync(dirname(file), {
    recursive: true,
    mode: 0o700,
  });

  const temp = `${file}.tmp-${process.pid}-${Date.now()}`;

  try {
    writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, {
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
