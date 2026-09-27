/*
 * Phase 74 — Query fingerprint and pagination cursors.
 *
 * Both are deterministic and timestamp-free. A cursor is bound to the query
 * fingerprint, the scope and the graph generation it was produced from, so a
 * generation change can never mix rows from two graphs.
 */

import { createHash } from 'node:crypto';

import { QueryError, type QueryAst, type QueryParameters, type QueryScope } from './types.js';

export interface CursorPayload {
  /** Query fingerprint. */
  q: string;
  /** Scope. */
  s: QueryScope;
  /** Graph generation. */
  g: string;
  /** Row offset. */
  o: number;
}

export function queryFingerprint(input: {
  ast: QueryAst;
  scope: QueryScope;
  parameters: QueryParameters;
  schemaFingerprint: string;
}): string {
  const normalizedParameters = Object.entries(input.parameters)
    .map(([key, value]) => [key, value] as const)
    .sort(([left], [right]) => left.localeCompare(right));

  return createHash('sha256')
    .update(
      JSON.stringify({
        ast: input.ast,
        scope: input.scope,
        parameters: normalizedParameters,
        schemaFingerprint: input.schemaFingerprint,
      })
    )
    .digest('hex');
}

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeCursor(
  cursor: string,
  expected: { fingerprint: string; scope: QueryScope; generation: string }
): number {
  let payload: CursorPayload;

  try {
    payload = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as CursorPayload;
  } catch {
    throw new QueryError('CURSOR_INVALID', 'Pagination cursor is not valid');
  }

  if (
    typeof payload?.q !== 'string' ||
    typeof payload?.s !== 'string' ||
    typeof payload?.g !== 'string' ||
    typeof payload?.o !== 'number'
  ) {
    throw new QueryError('CURSOR_INVALID', 'Pagination cursor is malformed');
  }

  if (
    payload.q !== expected.fingerprint ||
    payload.s !== expected.scope ||
    payload.g !== expected.generation
  ) {
    throw new QueryError(
      'CURSOR_STALE',
      'Pagination cursor belongs to a different query or graph generation'
    );
  }

  if (!Number.isInteger(payload.o) || payload.o < 0) {
    throw new QueryError('CURSOR_INVALID', 'Pagination cursor position is invalid');
  }

  return payload.o;
}
