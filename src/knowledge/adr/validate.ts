import { createHash } from 'node:crypto';

import { SecretScanner } from '../../security/secret-scanner.js';

import type { AdrStatus } from './types.js';

/**
 * Deterministic error type. `code` is the machine-readable contract; the
 * message never contains stack traces or caller secrets.
 */
export class AdrError extends Error {
  constructor(
    readonly code:
      | 'ADR_NOT_FOUND'
      | 'ADR_INVALID'
      | 'ADR_CONFLICT'
      | 'ADR_INVALID_TRANSITION'
      | 'ADR_SUPERSESSION_CYCLE'
      | 'ADR_PATH_ESCAPE'
      | 'ADR_SECRET_DETECTED'
      | 'ADR_UNSUPPORTED_FORMAT',
    message: string,
    readonly statusCode = 400
  ) {
    super(message);
    this.name = 'AdrError';
  }
}

export const MAX_PATH_LENGTH = 400;
export const MAX_TEXT_LENGTH = 20_000;
export const MAX_SECTION_ITEMS = 200;

const ALLOWED_PATH = /^[A-Za-z0-9_\-./*@+[\]() ]+$/;

/**
 * Project-relative affected path validation.
 *
 * Rejects absolute paths, `~`, parent traversal, backslashes and control
 * characters. A wildcard is only the deterministic `*`/`**` glob subset.
 */
export function validateAffectedPath(value: string): string {
  const path = value.trim().replace(/\\/gu, '/');

  if (!path) {
    throw new AdrError('ADR_INVALID', 'Affected path must not be empty');
  }

  if (path.length > MAX_PATH_LENGTH) {
    throw new AdrError('ADR_INVALID', 'Affected path is too long');
  }

  if (path.startsWith('/') || path.startsWith('~') || /^[A-Za-z]:/u.test(path)) {
    throw new AdrError('ADR_PATH_ESCAPE', `Affected path must be project-relative: ${path}`);
  }

  const segments = path.split('/');

  if (segments.some((segment) => segment === '..')) {
    throw new AdrError('ADR_PATH_ESCAPE', `Affected path must not escape the project: ${path}`);
  }

  if (!ALLOWED_PATH.test(path) || /[\u0000-\u001f]/u.test(path)) {
    throw new AdrError('ADR_INVALID', `Affected path contains unsupported characters: ${path}`);
  }

  return path;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

/**
 * Deterministic glob → matcher.
 *
 * Supported subset only (`**` crosses directories, `*` stays in one segment).
 * No caller supplied regular expression is ever compiled.
 */
export function compileAffectedPath(pattern: string): RegExp {
  const source = escapeRegex(pattern)
    .replace(/\\\*\\\*/gu, '\u0000')
    .replace(/\\\*/gu, '[^/]*')
    .replace(/\u0000/gu, '.*');

  return new RegExp(`^${source}$`, 'u');
}

export function matchesAffectedPath(pattern: string, filePath: string): boolean {
  const normalized = filePath.trim().replace(/\\/gu, '/').replace(/^\.\//u, '');

  if (pattern === normalized) {
    return true;
  }

  if (pattern.endsWith('/**')) {
    const prefix = pattern.slice(0, -3);

    if (normalized === prefix || normalized.startsWith(`${prefix}/`)) {
      return true;
    }
  }

  return compileAffectedPath(pattern).test(normalized);
}

/**
 * Unambiguous credential shapes.
 *
 * These are applied to every text field. Heuristic/contextual patterns
 * (`password: ...`, entropy) are deliberately excluded so normal engineering
 * prose is not mangled, while exact key formats are always rejected.
 */
const HIGH_SIGNAL: ReadonlyArray<{ type: string; regex: RegExp }> = [
  { type: 'openai_key', regex: /\bsk-[A-Za-z0-9_-]{20,}\b/gu },
  { type: 'huggingface_token', regex: /\bhf_[A-Za-z0-9]{20,}\b/gu },
  { type: 'hf_s3_access_key', regex: /\bHFAK[A-Za-z0-9]{8,}\b/gu },
  { type: 'aws_access_key', regex: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/gu },
  {
    type: 'github_token',
    regex: /\b(?:gh[pousr]_[A-Za-z0-9]{30,255}|github_pat_[A-Za-z0-9_]{40,255})\b/gu,
  },
  { type: 'stripe_secret_key', regex: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/gu },
  { type: 'google_api_key', regex: /\bAIza[A-Za-z0-9_-]{30,}\b/gu },
  { type: 'slack_token', regex: /\bxox[baprs]-[A-Za-z0-9-]{16,}\b/gu },
  { type: 'npm_token', regex: /\bnpm_[A-Za-z0-9]{20,}\b/gu },
  {
    type: 'jwt',
    regex: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/gu,
  },
  { type: 'private_key', regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/gu },
  { type: 'url_credentials', regex: /\bhttps?:\/\/[^:/@\s]+:[^/@\s]{4,}@[^/\s]+/giu },
];

/**
 * Conservative secret rejection.
 *
 * Structured references get the full pattern set; every text field is checked
 * for unambiguous key formats and credential-bearing URLs. Detected values are
 * never stored or echoed.
 */
export function assertNoSecrets(fields: {
  references?: Array<{ target?: string; note?: string }>;
  texts?: string[];
}): void {
  const scanner = new SecretScanner({ enableEntropyHeuristic: false });

  const found = new Set<string>();

  for (const reference of fields.references ?? []) {
    for (const value of [reference.target ?? '', reference.note ?? '']) {
      if (!value) {
        continue;
      }

      for (const match of scanner.scan(value)) {
        found.add(match.type);
      }
    }
  }

  for (const text of fields.texts ?? []) {
    for (const pattern of HIGH_SIGNAL) {
      pattern.regex.lastIndex = 0;

      if (pattern.regex.test(text)) {
        found.add(pattern.type);
      }
    }
  }

  if (found.size > 0) {
    throw new AdrError(
      'ADR_SECRET_DETECTED',
      `ADR rejected: possible credential material detected (${[...found].sort().join(', ')})`
    );
  }
}

export function normalizeTags(tags: readonly string[] | undefined): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const raw of tags ?? []) {
    const value = raw.replace(/\s+/gu, ' ').trim().toLowerCase();

    if (!value || value.length > 64) {
      continue;
    }

    const key = value.normalize('NFKC');

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(value);
  }

  return output.sort((left, right) => left.localeCompare(right));
}

export function normalizeStringList(
  values: readonly string[] | undefined,
  max = MAX_SECTION_ITEMS
): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const raw of values ?? []) {
    const value = raw.trim();

    if (!value || seen.has(value)) {
      continue;
    }

    seen.add(value);
    output.push(value);
  }

  return output.slice(0, max);
}

/**
 * Status transition matrix. `superseded` is only reachable through the atomic
 * `supersede` operation, which requires a replacement ADR.
 */
const TRANSITIONS: Record<AdrStatus, AdrStatus[]> = {
  proposed: ['accepted', 'rejected', 'deprecated'],
  accepted: ['deprecated'],
  deprecated: [],
  superseded: [],
  rejected: [],
};

export function assertTransition(from: AdrStatus, to: AdrStatus): void {
  if (from === to) {
    return;
  }

  if (to === 'superseded') {
    throw new AdrError(
      'ADR_INVALID_TRANSITION',
      'Use the supersede operation to mark an ADR as superseded'
    );
  }

  if (!TRANSITIONS[from].includes(to)) {
    throw new AdrError('ADR_INVALID_TRANSITION', `Invalid ADR status transition: ${from} -> ${to}`);
  }
}

export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));

  return `{${entries
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalize(item)}`)
    .join(',')}}`;
}

export function hashPayload(value: unknown): string {
  return createHash('sha256').update(canonicalize(value)).digest('hex').slice(0, 32);
}

export function seedForText(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 24);
}
