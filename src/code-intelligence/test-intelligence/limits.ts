/*
 * Phase 82 — central test-intelligence limits.
 *
 * Every bound used by discovery, selection and guarded execution lives here, so
 * no code path can scan an unbounded number of test files, collect an unbounded
 * selection, spawn unlimited processes or retain unbounded test output.
 */

import type { TestIntelligenceLimits } from './types.js';

export const TEST_INTELLIGENCE_LIMITS: TestIntelligenceLimits = {
  /** Maximum test files inspected by one discovery pass. */
  maxTestFiles: 5_000,

  /** Maximum test symbols collected by one discovery pass. */
  maxTestSymbols: 50_000,

  /** Maximum selected tests returned by one selection. */
  maxSelectedTests: 5_000,

  /** Maximum traversal depth when following test relationships. */
  maxDepth: 6,

  /** Maximum bytes read from one test/source file. */
  maxSourceReadBytes: 2 * 1024 * 1024,

  /** Maximum retained runner output (stdout + stderr) per run. */
  maxRunOutputBytes: 256 * 1024,

  /** Maximum concurrently spawned test processes. */
  maxProcesses: 2,

  /** Maximum retained test runs (bounded derived state). */
  maxRetainedRuns: 50,

  /** Default per-run timeout. */
  runTimeoutMs: 120_000,
} as const;

/**
 * Resolve effective limits. Every override must be a positive safe integer and
 * may only NARROW the central ceiling, never widen it.
 */
export function resolveTestLimits(
  overrides: Partial<TestIntelligenceLimits> = {}
): TestIntelligenceLimits {
  const narrow = (key: keyof TestIntelligenceLimits): number => {
    const ceiling = TEST_INTELLIGENCE_LIMITS[key];
    const value = overrides[key];

    if (value === undefined || !Number.isSafeInteger(value) || value < 1) {
      return ceiling;
    }

    return Math.min(value, ceiling);
  };

  return {
    maxTestFiles: narrow('maxTestFiles'),
    maxTestSymbols: narrow('maxTestSymbols'),
    maxSelectedTests: narrow('maxSelectedTests'),
    maxDepth: narrow('maxDepth'),
    maxSourceReadBytes: narrow('maxSourceReadBytes'),
    maxRunOutputBytes: narrow('maxRunOutputBytes'),
    maxProcesses: narrow('maxProcesses'),
    maxRetainedRuns: narrow('maxRetainedRuns'),
    runTimeoutMs: narrow('runTimeoutMs'),
  };
}
