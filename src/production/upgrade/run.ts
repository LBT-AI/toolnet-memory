/*
 * Phase 84C — the upgrade runner (imperative shell).
 *
 * All I/O lives behind `UpgradePorts`; the ordering lives in `order.ts`; the
 * decisions live in `plan.ts`. What is left here is the part that genuinely has
 * to be imperative: run the phases in order, stop at the first failure, and
 * never report success for work that did not happen.
 *
 * Two properties this file exists to guarantee:
 *
 *   - a dry run touches nothing. Not a file, not a cache entry, not a daemon.
 *   - a failed phase is terminal. The runner never continues into the daemon
 *     restart as if the upgrade had succeeded.
 */

import { orderedPhases } from './order.js';

import type {
  DaemonRestartFailure,
  RunUpgradeOptions,
  UpgradeFailureCode,
  UpgradePhase,
  UpgradePlan,
  UpgradePorts,
  UpgradeResult,
  UpgradeStepRecord,
} from './types.js';

type PhaseOutcome =
  | { status: 'ok'; detail?: string }
  | { status: 'skipped'; detail?: string }
  | {
      status: 'failed';
      code: UpgradeFailureCode;
      message: string;
      restartFailure?: DaemonRestartFailure;
    };

/** Mutable shell state shared by the phase runners. */
interface RunnerState {
  backupId?: string;
  /** Completed phases that changed live state. Drives `partial`. */
  mutations: number;
  daemonRestarted: boolean;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function phasePlanDetail(phase: UpgradePhase, plan: UpgradePlan): string {
  switch (phase) {
    case 'backup_authority':
    case 'migrate_authority':
      return plan.migrations.length > 0
        ? `would run ${plan.migrations.join(', ')}`
        : 'no authority migration planned';
    case 'verify_authority':
      return plan.migrations.length > 0 ? 'would re-read migrated authority' : 'nothing to verify';
    case 'rebuild_derived':
      return plan.rebuilds.length > 0
        ? `would rebuild ${plan.rebuilds.join(', ')}`
        : 'no derived store requires a rebuild';
    case 'clear_ephemeral':
      return plan.ephemeral.length > 0
        ? `would clear ${plan.ephemeral.join(', ')}`
        : 'no ephemeral store to clear';
    case 'restart_daemon':
      return plan.daemonRestartRequired
        ? 'would restart the daemon'
        : 'daemon restart not required';
    default:
      return 'nothing to do';
  }
}

function createPhaseRunners(
  plan: UpgradePlan,
  ports: UpgradePorts,
  state: RunnerState
): Record<UpgradePhase, () => Promise<PhaseOutcome>> {
  const authorityMigrationNeeded = plan.migrations.length > 0;

  return {
    inspect: async () => ({
      status: 'ok',
      detail: `${plan.stores.length} store(s) classified`,
    }),

    block_unsupported: async () => ({ status: 'ok', detail: 'no blockers' }),

    backup_authority: async () => {
      if (!authorityMigrationNeeded) {
        return { status: 'skipped', detail: 'no authority migration planned' };
      }

      try {
        const backup = await ports.backupAuthority(`pre-upgrade:${plan.migrations.join(',')}`);

        state.backupId = backup.backupId;

        return { status: 'ok', detail: `backup ${backup.backupId}` };
      } catch (error) {
        return {
          status: 'failed',
          code: 'UPGRADE_MIGRATION_FAILED',
          message: `authority backup failed: ${errorMessage(error)}`,
        };
      }
    },

    migrate_authority: async () => {
      if (!authorityMigrationNeeded) {
        return { status: 'skipped', detail: 'no authority migration planned' };
      }

      for (const migrationId of plan.migrations) {
        try {
          await ports.runMigration(migrationId);
          state.mutations += 1;
        } catch (error) {
          return {
            status: 'failed',
            code: 'UPGRADE_MIGRATION_FAILED',
            message: `${migrationId}: ${errorMessage(error)}`,
          };
        }
      }

      return { status: 'ok', detail: plan.migrations.join(', ') };
    },

    verify_authority: async () => {
      if (!authorityMigrationNeeded) {
        return { status: 'skipped', detail: 'nothing to verify' };
      }

      for (const migrationId of plan.migrations) {
        let valid: boolean;

        try {
          valid = await ports.verifyMigration(migrationId);
        } catch (error) {
          return {
            status: 'failed',
            code: 'UPGRADE_VERIFY_FAILED',
            message: `${migrationId}: ${errorMessage(error)}`,
          };
        }

        if (!valid) {
          return {
            status: 'failed',
            code: 'UPGRADE_VERIFY_FAILED',
            message: `${migrationId}: migrated authority state did not verify`,
          };
        }
      }

      return { status: 'ok', detail: `${plan.migrations.length} migration(s) verified` };
    },

    rebuild_derived: async () => {
      if (plan.rebuilds.length === 0) {
        return { status: 'skipped', detail: 'no derived store requires a rebuild' };
      }

      try {
        await ports.rebuildDerived(plan.rebuilds);
        state.mutations += 1;

        return { status: 'ok', detail: plan.rebuilds.join(', ') };
      } catch (error) {
        return {
          status: 'failed',
          code: 'UPGRADE_REBUILD_FAILED',
          message: errorMessage(error),
        };
      }
    },

    clear_ephemeral: async () => {
      if (plan.ephemeral.length === 0) {
        return { status: 'skipped', detail: 'no ephemeral store to clear' };
      }

      try {
        await ports.clearEphemeral(plan.ephemeral);
        state.mutations += 1;

        return { status: 'ok', detail: plan.ephemeral.join(', ') };
      } catch (error) {
        return {
          status: 'failed',
          code: 'UPGRADE_EPHEMERAL_CLEAR_FAILED',
          message: errorMessage(error),
        };
      }
    },

    restart_daemon: async () => {
      if (!plan.daemonRestartRequired) {
        return { status: 'skipped', detail: 'build identity unchanged' };
      }

      try {
        await ports.restartDaemon();
        state.daemonRestarted = true;

        return { status: 'ok', detail: 'daemon restarted' };
      } catch (error) {
        const candidate = error as Partial<DaemonRestartFailure> & {
          code?: unknown;
          restartFailure?: DaemonRestartFailure;
        };

        const restartFailure =
          candidate.restartFailure ??
          (candidate.code === 'DAEMON_UPGRADE_BLOCKED_ACTIVE_SESSIONS'
            ? {
                code: 'DAEMON_UPGRADE_BLOCKED_ACTIVE_SESSIONS' as const,
                message: errorMessage(error),
                runtimeRoot: candidate.runtimeRoot ?? '',
                socketPath: '',
                oldDaemonStopped: false,
                newDaemonStarted: false,
                retryable: true,
              }
            : undefined);

        /* An old daemon must never keep serving a new CLI unnoticed. */
        return {
          status: 'failed',
          code: restartFailure?.code ?? 'UPGRADE_DAEMON_RESTART_FAILED',
          message: restartFailure?.message ?? errorMessage(error),
          ...(restartFailure ? { restartFailure } : {}),
        };
      }
    },

    verify_upgrade: async () => {
      try {
        await ports.verifyUpgrade();
      } catch (error) {
        return {
          status: 'failed',
          code: 'UPGRADE_VERIFY_FAILED',
          message: errorMessage(error),
        };
      }

      return { status: 'ok', detail: 'post-conditions verified' };
    },
  };
}

function phaseRecords(plan: UpgradePlan, detail: (phase: UpgradePhase) => string) {
  return orderedPhases().map<UpgradeStepRecord>((phase) => ({
    phase,
    status: 'skipped' as const,
    detail: detail(phase),
  }));
}

export async function runUpgrade(
  plan: UpgradePlan,
  ports: UpgradePorts,
  options: RunUpgradeOptions = {}
): Promise<UpgradeResult> {
  /* Conservative default: an upgrade only happens when a caller opts in. */
  const dryRun = options.dryRun !== false;

  if (plan.blockers.length > 0) {
    return {
      outcome: 'blocked',
      plan,
      steps: phaseRecords(plan, () => `blocked: ${plan.blockers.join(', ')}`),
      daemonRestarted: false,
    };
  }

  if (dryRun) {
    return {
      outcome: 'planned',
      plan,
      steps: phaseRecords(plan, (phase) => `dry-run: ${phasePlanDetail(phase, plan)}`),
      daemonRestarted: false,
    };
  }

  const phases = orderedPhases();

  const state: RunnerState = { mutations: 0, daemonRestarted: false };

  const runners = createPhaseRunners(plan, ports, state);

  const steps: UpgradeStepRecord[] = [];

  for (const phase of phases) {
    const outcome = await runners[phase]();

    if (outcome.status !== 'failed') {
      steps.push({
        phase,
        status: outcome.status,
        ...(outcome.detail !== undefined ? { detail: outcome.detail } : {}),
      });

      continue;
    }

    steps.push({ phase, status: 'failed', detail: outcome.message });

    const failedAt = phases.indexOf(phase);

    for (const remaining of phases.slice(failedAt + 1)) {
      steps.push({ phase: remaining, status: 'skipped', detail: 'not reached' });
    }

    const partial = state.mutations > 0;

    return {
      outcome: 'failed',
      plan,
      steps,
      daemonRestarted: state.daemonRestarted,
      ...(state.backupId !== undefined ? { backupId: state.backupId } : {}),
      failure: {
        code: outcome.code,
        codes: partial ? [outcome.code, 'UPGRADE_PARTIAL_FAILURE'] : [outcome.code],
        phase,
        message: outcome.message,
        partial,
        ...(outcome.restartFailure ? { restartFailure: outcome.restartFailure } : {}),
      },
    };
  }

  return {
    outcome: 'applied',
    plan,
    steps,
    daemonRestarted: state.daemonRestarted,
    ...(state.backupId !== undefined ? { backupId: state.backupId } : {}),
  };
}
