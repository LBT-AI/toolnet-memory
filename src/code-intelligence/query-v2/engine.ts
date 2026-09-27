/*
 * Phase 74 — TGQL engine.
 *
 * The single pipeline: text -> tokens -> AST -> validate -> plan -> execute.
 * The query string is never evaluated as code and never becomes SQL.
 */

import type { ReadableGraph } from './adapter.js';

import { executeQuery } from './executor.js';

import { decodeCursor, encodeCursor, queryFingerprint } from './fingerprint.js';

import { clampLimit } from './limits.js';

import { parseQuery } from './parser.js';

import { planQuery } from './planner.js';

import { schemaFingerprint } from './schema-registry.js';

import type {
  QueryCoverage,
  QueryGeneration,
  QueryParameters,
  QueryResult,
  QueryScope,
} from './types.js';

import { validateQuery } from './validator.js';

export interface CoverageRequest {
  requiredCapabilities: string[];
  usesFleet: boolean;
  negative: boolean;
}

export interface RunQueryInput {
  source: string;
  scope: QueryScope;
  graph: ReadableGraph;
  parameters?: QueryParameters;
  limit?: number;
  skip?: number;
  cursor?: string;
  explain?: boolean;
  signal?: AbortSignal;
  generation?: QueryGeneration;
  coverage?: (
    request: CoverageRequest
  ) => QueryCoverage | undefined | Promise<QueryCoverage | undefined>;
}

export async function runQuery(input: RunQueryInput): Promise<QueryResult> {
  const parameters = input.parameters ?? {};

  const { ast, tokens } = parseQuery(input.source);

  const validated = validateQuery({
    ast,
    tokens,
    scope: input.scope,
    parameters,
  });

  const plan = planQuery(validated, input.graph);

  const schema = schemaFingerprint();

  const fingerprint = queryFingerprint({
    ast,
    scope: input.scope,
    parameters,
    schemaFingerprint: schema,
  });

  const generation: QueryGeneration = input.generation ?? { [input.scope]: input.graph.generation };

  const cursorGeneration = input.graph.generation;

  const offset = input.cursor
    ? decodeCursor(input.cursor, {
        fingerprint,
        scope: input.scope,
        generation: cursorGeneration,
      })
    : Math.max(0, input.skip ?? ast.skip ?? 0);

  if (input.explain) {
    return {
      schemaVersion: 1,
      queryFingerprint: fingerprint,
      schemaFingerprint: schema,
      scope: input.scope,
      generation,
      columns: ast.projection.map((item) => item.alias),
      rows: [],
      rowCount: 0,
      truncated: false,
      plan,
      explain: true,
    };
  }

  const executed = executeQuery({
    ast,
    validated,
    parameters,
    graph: input.graph,
    /* Explicit caller limit wins over the query's own LIMIT. */
    rowLimit: clampLimit(input.limit ?? ast.limit),
    offset,
    ...(input.signal ? { signal: input.signal } : {}),
  });

  const coverage = await input.coverage?.({
    requiredCapabilities: validated.requiredCapabilities,
    usesFleet: validated.usesFleet,
    negative: executed.rows.length === 0,
  });

  return {
    schemaVersion: 1,
    queryFingerprint: fingerprint,
    schemaFingerprint: schema,
    scope: input.scope,
    generation,
    columns: executed.columns,
    rows: executed.rows,
    rowCount: executed.rows.length,
    truncated: executed.truncated,
    ...(executed.truncated && executed.nextOffset !== undefined
      ? {
          nextCursor: encodeCursor({
            q: fingerprint,
            s: input.scope,
            g: cursorGeneration,
            o: executed.nextOffset,
          }),
        }
      : {}),
    ...(coverage ? { coverage } : {}),
  };
}
