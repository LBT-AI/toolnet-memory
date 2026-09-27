/*
 * Phase 84C — the upgrade phase order.
 *
 * The order is a safety property. Each phase either makes the next one safe or
 * refuses to let it happen:
 *
 *   - authority is inspected before anything is touched at all,
 *   - an unsupported authority store blocks BEFORE any write,
 *   - a backup exists BEFORE authority bytes change,
 *   - authority is re-verified AFTER migrating and BEFORE derived rebuild,
 *   - the daemon is restarted only once the data on disk is known to be valid.
 *
 * Reordering these phases is not a tuning decision. This file is the single
 * place the order is written down, so the runner cannot drift from it.
 */

import type { UpgradePhase } from './types.js';

export interface UpgradePhaseSpec {
  phase: UpgradePhase;
  rationale: string;
}

export const UPGRADE_PHASES: readonly UpgradePhaseSpec[] = Object.freeze([
  {
    phase: 'inspect',
    rationale: 'Classify every observed store against its 84B contract. Read-only.',
  },
  {
    phase: 'block_unsupported',
    rationale: 'Refuse before any write when an authority store cannot be migrated.',
  },
  {
    phase: 'backup_authority',
    rationale: 'A durable authority backup exists before authority bytes can change.',
  },
  {
    phase: 'migrate_authority',
    rationale: 'Only explicit, versioned migrations run, in plan order.',
  },
  {
    phase: 'verify_authority',
    rationale: 'Authority is re-read after migrating; a write is never trusted blindly.',
  },
  {
    phase: 'rebuild_derived',
    rationale: 'Derived stores are regenerated, never migrated, and only after authority is valid.',
  },
  {
    phase: 'clear_ephemeral',
    rationale: 'Process-lifetime state is discarded only once the plan has proven executable.',
  },
  {
    phase: 'restart_daemon',
    rationale: 'The daemon is restarted only after migration and rebuild succeed.',
  },
  {
    phase: 'verify_upgrade',
    rationale: 'Post-condition check: the upgrade is only reported as applied when this passes.',
  },
]);

/** The phases in execution order. */
export function orderedPhases(): UpgradePhase[] {
  return UPGRADE_PHASES.map((spec) => spec.phase);
}

/** Position of a phase in the fixed order, for assertions and diagnostics. */
export function phaseIndex(phase: UpgradePhase): number {
  return UPGRADE_PHASES.findIndex((spec) => spec.phase === phase);
}
