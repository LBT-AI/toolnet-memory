/*
 * Phase 80 — path containment for change analysis.
 *
 * A diff (especially a caller-supplied patch) is hostile input. Paths are
 * normalised and checked before they are used, and sensitive files are refused
 * so a report can never leak their contents.
 */

import { isAbsolute, normalize } from 'node:path';

import { isSensitiveFile } from '../../security/file-filter.js';

/** Strip a git `a/` / `b/` prefix and normalise separators. */
export function normalizeRelativePath(value: string): string {
  return value
    .trim()
    .replaceAll('\\', '/')
    .replace(/^[ab]\//u, '')
    .replace(/^\.\//u, '')
    .replace(/\/+$/u, '');
}

/**
 * True when a relative path stays inside the project root.
 *
 * Rejects empty paths, absolute paths, `..` escapes and NUL bytes.
 */
export function isPathContained(value: string): boolean {
  if (typeof value !== 'string' || value.length === 0 || value.length > 1_024) {
    return false;
  }

  if (value.includes('\0')) {
    return false;
  }

  if (isAbsolute(value) || /^[A-Za-z]:[\\/]/u.test(value)) {
    return false;
  }

  const normalized = normalize(value).replaceAll('\\', '/');

  if (normalized === '..' || normalized.startsWith('../') || normalized.includes('/../')) {
    return false;
  }

  return true;
}

export function isSensitiveChangePath(value: string): boolean {
  const normalized = normalizeRelativePath(value);

  if (!normalized) {
    return false;
  }

  return isSensitiveFile(normalized);
}

/** Unquote a git-escaped path (`"a b"` / octal escapes). */
export function unquoteGitPath(value: string): string {
  const trimmed = value.trim();

  if (!trimmed.startsWith('"') || !trimmed.endsWith('"') || trimmed.length < 2) {
    return trimmed;
  }

  const inner = trimmed.slice(1, -1);

  const bytes: number[] = [];

  for (let index = 0; index < inner.length; index += 1) {
    const char = inner[index]!;

    if (char === '\\' && index + 1 < inner.length) {
      const next = inner[index + 1]!;

      if (/[0-7]/u.test(next)) {
        const octal = inner.slice(index + 1, index + 4);
        const match = /^[0-7]{1,3}/u.exec(octal);
        const code = match ? Number.parseInt(match[0], 8) : Number.NaN;

        if (Number.isFinite(code)) {
          bytes.push(code);
          index += match![0].length;
          continue;
        }
      }

      if (next === 'n') {
        bytes.push(0x0a);
        index += 1;
        continue;
      }

      if (next === 't') {
        bytes.push(0x09);
        index += 1;
        continue;
      }

      bytes.push(next.charCodeAt(0));
      index += 1;
      continue;
    }

    for (const byte of Buffer.from(char, 'utf8')) {
      bytes.push(byte);
    }
  }

  return Buffer.from(bytes).toString('utf8');
}
