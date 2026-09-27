/*
 * Phase 82 — run_selected_tests MCP tool.
 *
 * Explicit execution only. The caller supplies a selection id produced by
 * ToolNet (plus an optional validated subset). There is deliberately NO command
 * string input: argv is built internally per framework, the executable is
 * resolved from the project's own tooling, and every run is bounded by a
 * timeout and an output budget.
 *
 * A passing run is evidence, never authorisation.
 */

import { z } from 'zod';

import type { MCPContext } from '../context.js';

import { runMcpTestExecution } from '../test-intelligence.js';

export const runSelectedTestsSchema = {
  selectionId: z.string().min(1).max(200),

  /** Expected change fingerprint; a mismatch marks the selection stale. */
  changeFingerprint: z.string().max(200).optional(),

  /** Explicit subset of test ids from the selection. */
  tests: z.array(z.string().min(1).max(512)).max(5_000).optional(),

  timeoutMs: z.number().int().min(1_000).max(600_000).optional(),

  networkAllowed: z.boolean().optional(),
};

export interface RunSelectedTestsToolInput {
  selectionId: string;
  changeFingerprint?: string;
  tests?: string[];
  timeoutMs?: number;
  networkAllowed?: boolean;
}

export async function runSelectedTestsTool(ctx: MCPContext, input: RunSelectedTestsToolInput) {
  try {
    const { selection, verification } = await runMcpTestExecution(ctx, {
      selectionId: input.selectionId,
      ...(input.changeFingerprint !== undefined
        ? { changeFingerprint: input.changeFingerprint }
        : {}),
      ...(input.tests !== undefined ? { tests: input.tests } : {}),
      ...(input.timeoutMs !== undefined ? { timeoutMs: input.timeoutMs } : {}),
      ...(input.networkAllowed !== undefined ? { networkAllowed: input.networkAllowed } : {}),
    });

    return {
      selectionId: selection.selectionId,
      run: verification.run,
      summary: summarize(verification.run),
      passed: verification.passed.map((descriptor) => descriptor.id),
      failed: verification.failed.map((entry) => ({
        testId: entry.test.id,
        ...(entry.message ? { message: entry.message } : {}),
      })),
      skipped: verification.skipped.map((descriptor) => descriptor.id),
      errors: verification.errors,
      blockers: verification.blockers,
      stale: verification.stale,
      complete: verification.complete,
      limitations: verification.limitations,
      safeToMerge: false,
      safeToDeploy: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return { error: message.split(':')[0] ?? 'TEST_RUNNER_ERROR' };
  }
}

function summarize(run?: {
  status: string;
  results: Array<{ status: string }>;
  output: { truncated: boolean; bytes: number };
  environment: { networkAllowed: boolean; networkIsolation: string };
}) {
  if (!run) {
    return null;
  }

  const summary = { passed: 0, failed: 0, skipped: 0, errored: 0 };

  for (const result of run.results) {
    if (result.status === 'passed') summary.passed += 1;
    else if (result.status === 'failed') summary.failed += 1;
    else if (result.status === 'skipped' || result.status === 'todo') summary.skipped += 1;
    else summary.errored += 1;
  }

  return {
    status: run.status,
    ...summary,
    outputTruncated: run.output.truncated,
    outputBytes: run.output.bytes,
    networkAllowed: run.environment.networkAllowed,
    networkIsolation: run.environment.networkIsolation,
  };
}
