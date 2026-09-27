/*
 * Phase 79 — trace sanitization.
 *
 * Trace payloads are untrusted input on two axes:
 *
 *   1. Privacy — a span can carry Authorization headers, cookies, tokens,
 *      passwords and credentialed URLs. None of that may reach the trace store,
 *      the evidence bundle or a log line.
 *   2. Structure — JSON keys such as `__proto__`, `constructor` and `prototype`
 *      must never reach an object literal, or a hostile trace could pollute a
 *      shared prototype.
 *
 * Everything here is deterministic and dependency-free. No eval, no dynamic
 * import, no network.
 */

import { createHash } from 'node:crypto';

import type { RuntimeTraceLimits } from './limits.js';

/* ------------------------------------------------------------------
 * Prototype safety
 * ------------------------------------------------------------------ */

/** Keys that can mutate a prototype if assigned through `obj[key] = value`. */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function isForbiddenKey(key: string): boolean {
  return FORBIDDEN_KEYS.has(key) || FORBIDDEN_KEYS.has(key.toLowerCase());
}

/**
 * Deep-copy an untrusted JSON value into plain data.
 *
 * - forbidden keys are dropped entirely;
 * - depth beyond `maxNestingDepth` is dropped (never traversed further);
 * - functions, symbols and cycles are dropped;
 * - the result is built with `Object.create(null)`-free plain objects whose keys
 *   are assigned via `Object.defineProperty`, so a hostile key can never reach
 *   the prototype even if the forbidden list ever misses one.
 */
export function safeClone(value: unknown, maxDepth: number): unknown {
  const seen = new WeakSet<object>();

  const walk = (input: unknown, depth: number): unknown => {
    if (input === null || typeof input !== 'object') {
      if (typeof input === 'function' || typeof input === 'symbol') {
        return undefined;
      }

      if (typeof input === 'bigint') {
        return input.toString();
      }

      return input;
    }

    if (depth >= maxDepth) {
      return undefined;
    }

    if (seen.has(input as object)) {
      return undefined;
    }

    seen.add(input as object);

    if (Array.isArray(input)) {
      const output: unknown[] = [];

      for (const item of input) {
        const cloned = walk(item, depth + 1);

        if (cloned !== undefined) {
          output.push(cloned);
        }
      }

      return output;
    }

    const output: Record<string, unknown> = {};

    for (const key of Object.getOwnPropertyNames(input as object)) {
      if (isForbiddenKey(key)) {
        continue;
      }

      let raw: unknown;

      try {
        raw = (input as Record<string, unknown>)[key];
      } catch {
        continue;
      }

      const cloned = walk(raw, depth + 1);

      if (cloned === undefined) {
        continue;
      }

      /* defineProperty avoids any setter/prototype magic on assignment. */
      Object.defineProperty(output, key, {
        value: cloned,
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }

    return output;
  };

  return walk(value, 0);
}

/** Safe lookup that never walks the prototype chain. */
export function ownValue(source: unknown, key: string): unknown {
  if (source === null || typeof source !== 'object' || isForbiddenKey(key)) {
    return undefined;
  }

  if (!Object.prototype.hasOwnProperty.call(source, key)) {
    return undefined;
  }

  return (source as Record<string, unknown>)[key];
}

/** Safe string read of a direct property. */
export function ownString(source: unknown, key: string): string | undefined {
  const value = ownValue(source, key);

  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function ownNumber(source: unknown, key: string): number | undefined {
  const value = ownValue(source, key);

  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/* ------------------------------------------------------------------
 * Secrets
 * ------------------------------------------------------------------ */

/**
 * Attribute names that must never be persisted, matched case-insensitively on
 * the raw key with separators removed.
 *
 * `token`-style keys are covered by the `token` entry; `db.statement` style
 * keys are covered by `statement` because database statements frequently embed
 * credentials.
 */
const SECRET_KEY_FRAGMENTS = [
  'authorization',
  'auth',
  'cookie',
  'setcookie',
  'password',
  'passwd',
  'secret',
  'token',
  'apikey',
  'accesstoken',
  'refreshtoken',
  'clientsecret',
  'credential',
  'credentials',
  'sessionid',
  'privatekey',
  'databaseurl',
  'connectionstring',
  'dsn',
  'bearer',
  'signature',
  'statement',
] as const;

/** Substrings that mark a free-text value as carrying a credential. */
const SECRET_VALUE_PATTERNS: readonly RegExp[] = [
  /\bbearer\s+[A-Za-z0-9._~+/-]+=*/iu,
  /\bbasic\s+[A-Za-z0-9+/]+=*/iu,
  /\b(?:sk|pk|rk)_[A-Za-z0-9_]{8,}/u,
  /\bgh[pousr]_[A-Za-z0-9]{16,}/u,
  /\bAKIA[0-9A-Z]{16}\b/u,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./u,
  /\/\/[^/\s:@]+:[^/\s:@]+@/u,
  /\b(?:password|passwd|pwd|token|secret|api[_-]?key|access[_-]?key)\s*[=:]\s*\S+/iu,
  /\bpostgres(?:ql)?:\/\/\S+/iu,
  /\bmysql:\/\/\S+/iu,
  /\bmongodb(?:\+srv)?:\/\/\S+/iu,
  /\bredis:\/\/\S+/iu,
];

export const REDACTION_MARKER = '[redacted]';

export function isSecretKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/gu, '');

  return SECRET_KEY_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}

export function containsSecretValue(value: string): boolean {
  return SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

/**
 * Redact credentials from a free-text value without destroying the metadata an
 * operator legitimately needs (scheme, host, port, path).
 */
export function redactValue(value: string, maxLength: number): string {
  let output = value;

  if (containsSecretValue(output)) {
    output = output
      .replace(/\b([A-Za-z][A-Za-z0-9+.-]*:\/\/)([^/\s:@]*):([^/\s:@]*)@/gu, '$1$2:***@')
      .replace(/\b(bearer|basic)\s+[A-Za-z0-9._~+/-]+=*/giu, '$1 ' + REDACTION_MARKER)
      .replace(
        /\b(password|passwd|pwd|token|secret|api[_-]?key|access[_-]?key)\s*([=:])\s*\S+/giu,
        `$1$2${REDACTION_MARKER}`
      )
      .replace(/\b(sk|pk|rk)_[A-Za-z0-9_]{8,}/gu, REDACTION_MARKER)
      .replace(/\bgh[pousr]_[A-Za-z0-9]{16,}/gu, REDACTION_MARKER)
      .replace(/\bAKIA[0-9A-Z]{16}\b/gu, REDACTION_MARKER)
      .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]*/gu, REDACTION_MARKER)
      .replace(
        /\b(postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/\S+/giu,
        '$1://' + REDACTION_MARKER
      );
  }

  return output.length > maxLength ? output.slice(0, maxLength) : output;
}

/* ------------------------------------------------------------------
 * Structural digest
 * ------------------------------------------------------------------ */

/**
 * Deterministic content digest of an untrusted payload.
 *
 * Safe by construction: the walk uses `safeClone` (forbidden keys dropped,
 * depth bounded) and a hard node budget, so a hostile payload cannot cause deep
 * recursion or unbounded memory use. Two identical payloads always produce the
 * same digest, which is what makes trace import idempotent.
 */
export function structuralDigest(
  value: unknown,
  options: { maxDepth: number; maxNodes: number }
): string {
  let nodes = 0;

  const summary: unknown[] = [];

  const walk = (input: unknown, depth: number): void => {
    if (nodes >= options.maxNodes) {
      return;
    }

    nodes += 1;

    if (input === null || typeof input !== 'object') {
      summary.push(input === undefined ? null : input);
      return;
    }

    if (depth >= options.maxDepth) {
      summary.push('<depth>');
      return;
    }

    if (Array.isArray(input)) {
      summary.push('[');
      for (const item of input) {
        if (nodes >= options.maxNodes) {
          summary.push('<truncated>');
          break;
        }
        walk(item, depth + 1);
      }
      summary.push(']');
      return;
    }

    summary.push('{');

    for (const key of Object.getOwnPropertyNames(input as object).sort()) {
      if (isForbiddenKey(key)) {
        continue;
      }

      summary.push(key);

      let raw: unknown;

      try {
        raw = (input as Record<string, unknown>)[key];
      } catch {
        summary.push('<error>');
        continue;
      }

      walk(raw, depth + 1);
    }

    summary.push('}');
  };

  walk(value, 0);

  return createHash('sha256').update(JSON.stringify(summary)).digest('hex').slice(0, 32);
}

/** True when redaction actually changed the value. */
export function wasRedacted(original: string, redacted: string): boolean {
  return original !== redacted;
}

/* ------------------------------------------------------------------
 * HTTP canonicalization
 * ------------------------------------------------------------------ */

/**
 * Canonicalize an HTTP path for deterministic route matching.
 *
 * Strips credentials, query string, fragment and trailing slash. Keeps the
 * static prefix so `POST /orders` matches `/orders/{id}`-style routes through
 * the caller's own route vocabulary, never through fuzzy matching.
 */
export function canonicalizeHttpPath(input: string): string | undefined {
  if (typeof input !== 'string' || input.length === 0) {
    return undefined;
  }

  let value = input;

  const schemeMatch = /^[A-Za-z][A-Za-z0-9+.-]*:\/\//u.exec(value);

  if (schemeMatch) {
    try {
      const url = new URL(value);
      value = url.pathname;
    } catch {
      return undefined;
    }
  }

  const hashIndex = value.indexOf('#');
  if (hashIndex >= 0) {
    value = value.slice(0, hashIndex);
  }

  const queryIndex = value.indexOf('?');
  if (queryIndex >= 0) {
    value = value.slice(0, queryIndex);
  }

  if (!value.startsWith('/')) {
    value = `/${value}`;
  }

  value = value.replace(/\/{2,}/gu, '/');

  if (value.length > 1 && value.endsWith('/')) {
    value = value.slice(0, -1);
  }

  return value.length > 1 || value === '/' ? value : undefined;
}

/** Hash an arbitrary correlation value so no payload is ever stored raw. */
export function hashCorrelation(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 32);
}

/* ------------------------------------------------------------------
 * Attribute sanitization
 * ------------------------------------------------------------------ */

export interface SanitizedAttributes {
  attributes: Record<string, string>;
  redacted: boolean;
  dropped: number;
}

/**
 * Sanitize an attribute bag: allowlist-safe keys only, secrets redacted,
 * values coerced to bounded strings, forbidden keys impossible.
 *
 * When `allowlist` is provided only those keys survive. When it is absent every
 * non-secret scalar survives (bounded), matching an explicit ToolNet trace
 * where the producer already chose the fields.
 */
export function sanitizeAttributes(
  raw: unknown,
  limits: RuntimeTraceLimits,
  allowlist?: readonly string[]
): SanitizedAttributes {
  const attributes: Record<string, string> = {};

  let redacted = false;
  let dropped = 0;

  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { attributes, redacted, dropped };
  }

  const allowed = allowlist ? new Set(allowlist) : null;

  const keys = Object.getOwnPropertyNames(raw).sort();

  for (const key of keys) {
    if (isForbiddenKey(key)) {
      dropped += 1;
      continue;
    }

    if (Object.keys(attributes).length >= limits.maxAttributesPerEvent) {
      dropped += 1;
      continue;
    }

    if (isSecretKey(key)) {
      redacted = true;
      continue;
    }

    if (allowed && !allowed.has(key)) {
      dropped += 1;
      continue;
    }

    const value = ownValue(raw, key);

    const rendered = renderScalar(value, limits.maxNestingDepth);

    if (rendered === undefined) {
      dropped += 1;
      continue;
    }

    const safe = redactValue(rendered, limits.maxAttributeLength);

    if (wasRedacted(rendered, safe)) {
      redacted = true;
    }

    Object.defineProperty(attributes, key, {
      value: safe,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }

  return { attributes, redacted, dropped };
}

function renderScalar(value: unknown, maxDepth: number): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : undefined;
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  const cloned = safeClone(value, maxDepth);

  return cloned === undefined ? undefined : JSON.stringify(cloned);
}

/**
 * Bounded byte length of a payload without serializing it twice for large
 * values.
 */
export function payloadBytes(payload: string | Uint8Array): number {
  return typeof payload === 'string' ? Buffer.byteLength(payload, 'utf8') : payload.byteLength;
}
