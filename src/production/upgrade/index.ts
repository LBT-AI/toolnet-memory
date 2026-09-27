/*
 * Phase 84C — upgrade orchestration.
 *
 * Plan (pure) -> run (ordered, dry-run first) -> ports (the only place with
 * side effects). Consumers: the `update` command and the certification suite.
 */

export * from './types.js';
export * from './migrations.js';
export * from './fingerprint.js';
export * from './order.js';
export * from './plan.js';
export * from './run.js';
export * from './observations.js';
export * from './ports.js';
export * from './package-upgrade.js';
