import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

import { dirname } from 'node:path';

export type JsonObject = Record<string, unknown>;

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readHooksRoot(file: string, productName: string): JsonObject {
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
      `Invalid existing ${productName} hooks file: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (!isJsonObject(parsed)) {
    throw new Error(`Invalid existing ${productName} hooks file: root must be a JSON object.`);
  }

  return parsed;
}

export function atomicWriteHooks(file: string, value: JsonObject): void {
  mkdirSync(dirname(file), {
    recursive: true,
    mode: 0o700,
  });

  const temporary = `${file}.toolnet-${process.pid}-${Date.now()}.tmp`;

  try {
    writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });

    renameSync(temporary, file);
  } finally {
    rmSync(temporary, {
      force: true,
    });
  }
}

export function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_./:-]+$/u.test(value)) {
    return value;
  }

  return `'${value.replace(/'/gu, `'\\''`)}'`;
}
