/*
 * Phase 81 — package export contract parser.
 *
 * Reads a supported manifest's declared public entry points (`exports`,
 * `main`, `module`, `types`/`typings`) and models each as a contract export.
 * Removing a declared export is EXPORT_REMOVED.
 *
 * No npm registry query. No dependency installation. No network.
 */

import { contractId } from '../shape.js';

import type { ContractField } from '../types.js';

import { emptyParseResult, type ContractParseInput, type ContractParseResult } from './types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function own(record: Record<string, unknown>, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

function flattenExports(value: unknown, prefix: string, out: ContractField[], depth: number): void {
  if (depth > 8) {
    return;
  }

  if (typeof value === 'string') {
    out.push({ name: prefix, type: 'export', required: true });
    return;
  }

  if (Array.isArray(value)) {
    out.push({ name: prefix, type: 'export', required: true });
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (const key of Object.keys(value).sort()) {
    const child = own(value, key);

    const next = key.startsWith('.') ? `${prefix}${key}` : `${prefix}.${key}`;

    flattenExports(child, next, out, depth + 1);
  }
}

export function parsePackage(input: ContractParseInput): ContractParseResult {
  const result = emptyParseResult();

  let document: unknown;

  try {
    document = JSON.parse(input.source) as unknown;
  } catch {
    result.unsupported.push({ path: input.path, reason: 'PARSE_FAILURE' });
    return result;
  }

  if (!isRecord(document)) {
    result.unsupported.push({ path: input.path, reason: 'PARSE_FAILURE' });
    return result;
  }

  const fields: ContractField[] = [];

  const exportsField = own(document, 'exports');

  if (exportsField !== undefined) {
    flattenExports(exportsField, 'exports', fields, 0);
  }

  for (const legacy of ['main', 'module', 'types', 'typings']) {
    const value = own(document, legacy);

    if (typeof value === 'string' && value.length > 0) {
      fields.push({ name: legacy, type: 'export', required: true });
    }
  }

  const name = own(document, 'name');

  const identity = typeof name === 'string' && name.length > 0 ? `package:${name}` : 'package';

  if (fields.length === 0) {
    result.unsupported.push({
      path: input.path,
      reason: 'UNSUPPORTED_CONSTRUCT',
      detail: 'No public exports declared.',
    });
    return result;
  }

  result.entries.push({
    id: contractId('package_export', identity),
    kind: 'package_export',
    identity,
    sourcePath: input.path,
    request: { fields },
    response: { fields: [] },
  });

  return result;
}
