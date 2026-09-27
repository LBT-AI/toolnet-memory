/*
 * Phase 74 — TGQL hard limits and cost model.
 *
 * Every bound is declared here exactly once. No scattered magic numbers, no
 * threshold that depends on wall-clock timing.
 */

export const MAX_QUERY_LENGTH = 8192;
export const MAX_QUERY_TOKENS = 2048;
export const MAX_MATCH_PATTERNS = 4;
export const MAX_PATTERN_ELEMENTS = 8;
export const MAX_PATTERN_COUNT = 16;
export const MAX_DEPTH = 5;
export const MAX_EXPANSIONS = 20_000;
export const MAX_ROWS = 1000;
export const DEFAULT_ROWS = 100;
export const MAX_ORDER_BY = 4;
export const MAX_IN_VALUES = 200;
export const MAX_EXPRESSION_DEPTH = 12;

/** Query planner rejects a plan whose estimate exceeds this before running. */
export const MAX_ESTIMATED_OPERATIONS = 250_000;

/** Response size guard: serialized rows above this are truncated/paginated. */
export const MAX_RESPONSE_BYTES = 512_000;

export function clampLimit(value: number | undefined): number {
  if (value === undefined) {
    return DEFAULT_ROWS;
  }
  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_ROWS;
  }
  return Math.min(Math.floor(value), MAX_ROWS);
}
