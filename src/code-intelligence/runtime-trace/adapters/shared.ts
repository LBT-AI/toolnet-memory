/*
 * Phase 79 — shared adapter helpers.
 *
 * All reads go through prototype-safe accessors, so a hostile payload cannot
 * influence an adapter through the prototype chain.
 */

import { ownNumber, ownString, ownValue } from '../sanitize.js';

import { traceEventId } from '../identity.js';

import type { RuntimeSymbolRef } from '../types.js';

export function readString(source: unknown, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = ownString(source, key);

    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

export function readNumber(source: unknown, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = ownNumber(source, key);

    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

export function readBoolean(source: unknown, ...keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = ownValue(source, key);

    if (typeof value === 'boolean') {
      return value;
    }
  }

  return undefined;
}

/**
 * Read a runtime symbol reference.
 *
 * Only identity-bearing fields are kept. A bare simple `name` is recorded but
 * is never sufficient on its own — the matcher refuses to resolve it without
 * module/file evidence.
 */
export function readSymbolRef(source: unknown): RuntimeSymbolRef | undefined {
  if (source === null || typeof source !== 'object' || Array.isArray(source)) {
    return undefined;
  }

  const ref: RuntimeSymbolRef = {};

  const symbolId = readString(source, 'symbolId', 'symbol_id', 'id');
  if (symbolId) {
    ref.symbolId = symbolId;
  }

  const qualifiedName = readString(source, 'qualifiedName', 'qualified_name', 'qualified');
  if (qualifiedName) {
    ref.qualifiedName = qualifiedName;
  }

  const module = readString(source, 'module', 'moduleName', 'module_name');
  if (module) {
    ref.module = module;
  }

  const filePath = readString(source, 'filePath', 'file_path', 'file');
  if (filePath) {
    ref.filePath = filePath;
  }

  const name = readString(source, 'name', 'symbol', 'function');
  if (name) {
    ref.name = name;
  }

  return Object.keys(ref).length > 0 ? ref : undefined;
}

/** Read an array property without trusting `Array.isArray` on the prototype. */
export function readArray(source: unknown, key: string): unknown[] {
  const value = ownValue(source, key);

  return Array.isArray(value) ? value : [];
}

/** Read a nested object property. */
export function readObject(source: unknown, key: string): unknown {
  const value = ownValue(source, key);

  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : undefined;
}

/** Deterministic event id helper shared by both adapters. */
export function eventIdFor(parts: Parameters<typeof traceEventId>[0]): string {
  return traceEventId(parts);
}
