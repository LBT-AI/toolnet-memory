/*
 * Phase 86E.7B — certification subprocess timeout policy.
 *
 * Fault injection for the production-certify harness: a hanging child must
 * fail closed with an explicit CERTIFY_SUBPROCESS_TIMEOUT code (command
 * label, budget, elapsed), never hang the certification, and never leak
 * partial output. Fast and failing children keep their exact semantics.
 *
 * Budgets: SHORT_CHECK_TIMEOUT_MS (30s interactive checks) vs
 * PACKAGING_PROBE_TIMEOUT_MS (300s; `npm pack` runs the prepack build
 * first, measured 64s for build:prod on a constrained host).
 */

import { describe, expect, it } from 'vitest';

import {
  PACKAGING_PROBE_TIMEOUT_MS,
  SHORT_CHECK_TIMEOUT_MS,
  run,
} from '../../src/production/production-certify.js';

describe('Phase 86E.7B — certify subprocess timeouts', () => {
  it('kills a hanging child and reports an explicit timeout code', async () => {
    const startedAt = Date.now();
    const result = run(
      process.execPath,
      ['-e', 'console.log("partial-junk"); setInterval(() => {}, 1000);'],
      process.cwd(),
      process.env,
      { timeoutMs: 200, label: 'hang-probe' }
    );
    const elapsed = Date.now() - startedAt;

    expect(result.timedOut).toBe(true);
    expect(result.stderr).toContain('CERTIFY_SUBPROCESS_TIMEOUT');
    expect(result.stderr).toContain(`command=${process.execPath}`);
    expect(result.stderr).toContain('budgetMs=200');
    expect(result.stderr).toMatch(/elapsedMs=\d+/u);
    // Partial child output is sanitized on timeout, never surfaced.
    expect(result.stdout).toBe('');
    expect(result.stdout).not.toContain('partial-junk');
    // Bounded: near the injected budget, never hanging the test process.
    expect(elapsed).toBeLessThan(30_000);
    expect(result.elapsedMs).toBeGreaterThanOrEqual(150);
  });

  it('preserves exact success semantics for fast children', () => {
    const result = run(process.execPath, ['-e', 'console.log("ok");'], process.cwd(), process.env, {
      timeoutMs: 10_000,
    });

    expect(result.timedOut).toBe(false);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('ok');
  });

  it('preserves exact failure semantics for non-zero exits', () => {
    const result = run(process.execPath, ['-e', 'process.exit(3);'], process.cwd());

    expect(result.timedOut).toBe(false);
    expect(result.status).toBe(3);
  });

  it('keeps short checks tight and the packaging budget above measured build cost', () => {
    expect(SHORT_CHECK_TIMEOUT_MS).toBe(30_000);
    // Grounded: build:prod measured ~64s on a constrained host; the
    // packaging probe must clear that with headroom for slow CI/VPS.
    expect(PACKAGING_PROBE_TIMEOUT_MS).toBeGreaterThanOrEqual(120_000);
    expect(PACKAGING_PROBE_TIMEOUT_MS).toBeLessThanOrEqual(600_000);
  });
});
