/*
 * Phase 81 — contract normalisation and deterministic identity.
 *
 * A canonical structural contract must fingerprint the same for the same
 * semantic contract regardless of source formatting or property ordering, and
 * must fingerprint differently whenever a semantically important fact changes
 * (requiredness, field number, method, route, type, enum value).
 *
 * Normalisation NEVER drops:
 *   - requiredness, nullability, repeated
 *   - protobuf field numbers
 *   - HTTP method / canonical path
 *   - enum values
 *   - field types
 */

import type { ContractEntry, ContractField, ContractShape } from './types.js';

/** Language-specific type spellings normalised to canonical kinds. */
const TYPE_ALIASES: Record<string, string> = {
  string: 'string',
  str: 'string',
  text: 'string',
  uuid: 'string',
  email: 'string',
  uri: 'string',
  url: 'string',
  datetime: 'string',
  date: 'string',
  bytes: 'bytes',
  binary: 'bytes',
  int: 'integer',
  int32: 'integer',
  int64: 'integer',
  integer: 'integer',
  uint: 'integer',
  uint32: 'integer',
  uint64: 'integer',
  sint32: 'integer',
  sint64: 'integer',
  fixed32: 'integer',
  fixed64: 'integer',
  number: 'number',
  float: 'number',
  double: 'number',
  decimal: 'number',
  bigint: 'integer',
  bool: 'boolean',
  boolean: 'boolean',
  object: 'object',
  map: 'object',
  dict: 'object',
  record: 'object',
  array: 'array',
  list: 'array',
  set: 'array',
  null: 'null',
  void: 'void',
  any: 'any',
  unknown: 'unknown',
};

/**
 * Normalise a source type spelling to a canonical kind.
 *
 * A type this build does not understand is preserved as `ref:<name>` rather
 * than guessed, so an unknown type never silently looks equal to another.
 */
export function canonicalType(raw: string | undefined | null): string {
  if (typeof raw !== 'string') {
    return 'unknown';
  }

  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    return 'unknown';
  }

  const lower = trimmed.toLowerCase();

  if (TYPE_ALIASES[lower]) {
    return TYPE_ALIASES[lower];
  }

  /* GraphQL / TS generics and unions: keep the canonical head kind. */
  const arrayish = /^(?:array|list|readonly\s+\w+\[\]|\[\])\b/u.exec(lower);

  if (arrayish) {
    return 'array';
  }

  if (lower.endsWith('[]')) {
    return 'array';
  }

  return `ref:${trimmed.replace(/\s+/gu, ' ')}`;
}

/** Deterministic ordering for fields: name, then number, then type. */
export function sortFields(fields: readonly ContractField[]): ContractField[] {
  return [...fields].sort(
    (left, right) =>
      left.name.localeCompare(right.name) ||
      (left.number ?? 0) - (right.number ?? 0) ||
      left.type.localeCompare(right.type)
  );
}

/** Normalise a shape: stable ordering plus duplicate-name collapse. */
export function normalizeShape(shape: ContractShape): ContractShape {
  const byName = new Map<string, ContractField>();

  for (const field of sortFields(shape.fields)) {
    const key = `${field.name}:${field.number ?? ''}`;

    if (!byName.has(key)) {
      byName.set(key, normalizeField(field));
    }
  }

  return { fields: [...byName.values()] };
}

export function normalizeField(field: ContractField): ContractField {
  const normalized: ContractField = {
    name: field.name,
    type: field.type,
    required: field.required,
  };

  if (field.repeated !== undefined) {
    normalized.repeated = field.repeated;
  }

  if (field.number !== undefined) {
    normalized.number = field.number;
  }

  if (field.nullable !== undefined) {
    normalized.nullable = field.nullable;
  }

  if (field.enumValues !== undefined) {
    normalized.enumValues = [...new Set(field.enumValues)].sort();
  }

  return normalized;
}

/** Normalise an entry: canonical shapes plus a deterministic id. */
export function normalizeEntry(entry: ContractEntry): ContractEntry {
  const normalized: ContractEntry = {
    id: entry.id.length > 0 ? entry.id : `${entry.kind}:${entry.identity}`,
    kind: entry.kind,
    identity: entry.identity,
    sourcePath: entry.sourcePath,
    request: normalizeShape(entry.request),
    response: normalizeShape(entry.response),
  };

  if (entry.serviceId !== undefined) {
    normalized.serviceId = entry.serviceId;
  }

  if (entry.method !== undefined) {
    normalized.method = entry.method;
  }

  if (entry.path !== undefined) {
    normalized.path = entry.path;
  }

  return normalized;
}

export function contractId(kind: ContractEntry['kind'], identity: string): string {
  return `${kind}:${identity}`;
}

/** Stable JSON of a contract entry — the fingerprint input. */
export function entryCanonicalJson(entry: ContractEntry): string {
  return JSON.stringify({
    id: entry.id,
    kind: entry.kind,
    identity: entry.identity,
    sourcePath: entry.sourcePath,
    ...(entry.serviceId !== undefined ? { serviceId: entry.serviceId } : {}),
    ...(entry.method !== undefined ? { method: entry.method } : {}),
    ...(entry.path !== undefined ? { path: entry.path } : {}),
    request: entry.request.fields,
    response: entry.response.fields,
  });
}
