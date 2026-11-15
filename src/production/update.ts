import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, type ChildProcess } from 'node:child_process';

import { ProjectManager } from '../core/project-manager.js';

import { daemonRuntimeRoot } from '../daemon/paths.js';

import { UpdateView, upgradePhaseStatusLabel } from './update-view.js';

import {
  collectLocalStoreObservations,
  createDaemonOnlyUpgradePorts,
  createRealUpgradePorts,
  currentBuildDescriptor,
  orchestratePackageUpgrade,
} from './upgrade/index.js';

import type { BuildDescriptor, PackageUpgradeOutcome, UpgradePhase } from './upgrade/index.js';

const PACKAGE = 'toolnet-memory';

interface RunResult {
  status: number;
  stdout: string;
  stderr: string;
}

/*
 * The npm child currently running, if any.
 *
 * SIGINT/SIGTERM forwarding is scoped to the npm phases: while a child is
 * active the handlers below kill it so Ctrl+C never leaves the updater UI
 * alive with an orphaned install. Outside those phases no handler is
 * installed and the process keeps default signal semantics (immediate,
 * bounded termination); the daemon-restart child is separately bounded by
 * the upgrade timeout in `upgrade/ports.ts`.
 */
let activeChild: ChildProcess | null = null;

function run(command: string, args: string[]): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });

    activeChild = child;

    let signalCount = 0;

    const forwardSignal = (signal: NodeJS.Signals): void => {
      signalCount += 1;

      if (signalCount > 1) {
        process.exit(130);
      }

      try {
        child.kill('SIGTERM');
      } catch {
        // best-effort: the child may already be gone
      }
    };

    const onSigint = (): void => forwardSignal('SIGINT');
    const onSigterm = (): void => forwardSignal('SIGTERM');

    const cleanupSignals = (): void => {
      if (activeChild === child) {
        activeChild = null;
      }

      process.removeListener('SIGINT', onSigint);
      process.removeListener('SIGTERM', onSigterm);
    };

    process.once('SIGINT', onSigint);
    process.once('SIGTERM', onSigterm);

    let stdout = '';
    let stderr = '';

    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');

    child.stdout?.on('data', (chunk: string) => {
      stdout += chunk;
    });

    child.stderr?.on('data', (chunk: string) => {
      stderr += chunk;
    });

    child.once('error', (error) => {
      cleanupSignals();
      reject(error);
    });

    child.once('close', (code) => {
      cleanupSignals();
      resolve({
        status: code ?? 1,
        stdout,
        stderr,
      });
    });
  });
}

function localPackageRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));

  return path.resolve(here, '..');
}

function readVersion(root: string): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

    return String(pkg.version ?? 'unknown');
  } catch {
    return 'unknown';
  }
}

function detectPrefix(root: string): string | null {
  const marker = `${path.sep}lib${path.sep}` + `node_modules${path.sep}${PACKAGE}`;

  if (root.endsWith(marker)) {
    const prefix = root.slice(0, -marker.length);

    return prefix || path.parse(root).root;
  }

  return null;
}

/**
 * Phase 84C — bring local state up to the build that was just installed.
 *
 * `before` is captured by the caller before the package on disk changes; the
 * runtime schema fingerprints belong to the code this process already loaded,
 * and the package version is read from the installed package.json, so `after`
 * carries the one change this process can honestly observe. The daemon
 * re-derives its own fingerprint when it starts — which is also why a package
 * upgrade always requires a daemon restart.
 *
 * Read-only against the project: the project is located, never created.
 *
 * `onPhase` narrates real upgrade progress to the Step 4 UI. The daemon
 * restart phase is bounded by the upgrade timeout owner
 * (`upgrade/ports.ts`), so this callback always terminates.
 */
async function orchestrateLocalUpgrade(
  before: BuildDescriptor,
  latest: string,
  onPhase?: (phase: UpgradePhase) => void
): Promise<PackageUpgradeOutcome> {
  const after = { ...before, packageVersion: latest };

  const project = new ProjectManager().findExisting(process.cwd());

  const observations = project ? collectLocalStoreObservations(project.rootPath) : [];

  return orchestratePackageUpgrade({
    observations,
    before,
    after,
    ports: project ? createRealUpgradePorts({ project }) : createDaemonOnlyUpgradePorts(),
    dryRun: false,
    ...(onPhase !== undefined ? { onPhase } : {}),
  });
}

async function main(): Promise<void> {
  const root = localPackageRoot();
  const current = readVersion(root);
  const view = new UpdateView(current);

  view.startStep({
    step: 1,
    label: 'Checking registry',
    fromPercent: 0,
    toPercent: 18,
    estimatedMs: 2500,
    status: 'Checking for updates...',
  });

  let latestResult: RunResult;

  try {
    latestResult = await run('npm', ['view', `${PACKAGE}@latest`, 'version', '--silent']);
  } catch (error) {
    view.fail('Unable to reach npm registry');
    throw error;
  }

  if (latestResult.status !== 0) {
    view.fail('Unable to check latest version');

    if (latestResult.stderr.trim()) {
      console.error(latestResult.stderr.trim());
    }

    process.exitCode = 1;
    return;
  }

  const latest = latestResult.stdout.trim();

  view.setLatest(latest);
  view.completeStep(20);

  if (current === latest) {
    view.alreadyUpToDate();
    return;
  }

  const prefix = detectPrefix(root);

  if (!prefix) {
    view.fail('Self-update unavailable in source checkout');

    console.error('');
    console.error('For a source checkout, update the published CLI with:');
    console.error(`  npm install -g ${PACKAGE}@latest`);
    console.error('');

    process.exitCode = 1;
    return;
  }

  /*
   * Capture the runtime build identity BEFORE the package on disk changes.
   *
   * This is the only moment it can be observed: the fingerprint reads the
   * installed package.json and the code already loaded in this process. Reading
   * it after the install would report the new version on both sides of the
   * comparison and silently skip the daemon restart the upgrade requires.
   */
  const runtimeRoot = daemonRuntimeRoot();

  const beforeBuild = currentBuildDescriptor(runtimeRoot);

  view.startStep({
    step: 2,
    label: 'Downloading & installing package',
    fromPercent: 20,
    toPercent: 88,
    estimatedMs: 15_000,
    status: 'Updating...',
  });

  let result: RunResult;

  try {
    result = await run('npm', [
      'install',
      '-g',
      '--prefix',
      prefix,
      `${PACKAGE}@${latest}`,
      '--no-fund',
      '--no-audit',
      '--loglevel=error',
    ]);
  } catch (error) {
    view.fail('Package installation failed');
    throw error;
  }

  if (result.status !== 0) {
    view.fail('Package installation failed');

    if (result.stderr.trim()) {
      console.error('');
      console.error(result.stderr.trim());
    }

    console.error('');
    console.error('Retry with:');
    console.error(`  npm install -g ${PACKAGE}@${latest}`);
    console.error('');

    process.exitCode = result.status || 1;
    return;
  }

  view.completeStep(90);

  view.startStep({
    step: 3,
    label: 'Verifying installation',
    fromPercent: 90,
    toPercent: 98,
    estimatedMs: 1200,
    status: 'Verifying...',
  });

  const installed = readVersion(root);

  if (installed !== latest) {
    view.fail(`Version verification failed (${installed} != ${latest})`);
    process.exitCode = 1;
    return;
  }

  view.completeStep(99);

  /*
   * Step 4/4 — the work after package verification.
   *
   * Previously the UI parked at 99% under "Verifying installation" while
   * local migration and the daemon restart were still running, so a hung
   * restart looked like a hung verify. This step has no estimable duration:
   * progress holds at 99% while the status line narrates the real phase and
   * elapsed time ticks instead of a fake ETA.
   */
  view.startIndefiniteStep({
    step: 4,
    label: 'Applying local upgrade',
    percent: 99,
    status: 'Inspecting local state...',
  });

  let upgrade: PackageUpgradeOutcome;

  try {
    upgrade = await orchestrateLocalUpgrade(beforeBuild, latest, (phase) => {
      view.setStatus(upgradePhaseStatusLabel(phase));
    });
  } catch (error) {
    view.fail('Local upgrade orchestration failed');

    console.error('');
    console.error(error instanceof Error ? error.message : String(error));
    console.error('');
    console.error(`Package installed: yes (${latest})`);
    console.error('Local upgrade applied: no');
    console.error('Retryable: yes');
    console.error('');
    console.error('Recover with:');
    console.error('  toolnet-memory daemon:restart');
    console.error('  toolnet-memory update');
    console.error('');

    process.exitCode = 1;
    return;
  }

  if (!upgrade.ok) {
    const { result, plan } = upgrade;

    view.fail(result.outcome === 'blocked' ? 'Upgrade blocked' : 'Upgrade failed');

    console.error('');

    for (const blocker of plan.blockers) {
      console.error(`  blocker: ${blocker}`);
    }

    if (result.failure) {
      for (const code of result.failure.codes) {
        console.error(`  ${code}`);
      }

      console.error(`  phase: ${result.failure.phase}`);
      console.error(`  ${result.failure.message}`);
    }

    if (result.backupId) {
      console.error(`  authority backup: ${result.backupId}`);
    }

    /*
     * The npm package already installed successfully at this point: never
     * imply a rollback happened. Report package truth and local truth
     * separately so the user knows a reinstall is unnecessary.
     */
    const retryable = result.failure?.restartFailure?.retryable ?? result.outcome === 'blocked';

    console.error('');
    console.error(`Package installed: yes (${latest})`);
    console.error('Local upgrade applied: no');
    console.error(`Retryable: ${retryable ? 'yes' : 'no'}`);
    console.error('');
    console.error('Recover with:');
    console.error('  toolnet-memory daemon:restart');
    console.error('  toolnet-memory update');
    console.error('');

    process.exitCode = 1;
    return;
  }

  if (upgrade.result.daemonRestarted) {
    console.error('[toolnet-memory] local daemon restarted for the new build');
  }

  view.succeed(latest);
}

main().catch((error) => {
  console.error('');
  console.error(error instanceof Error ? error.message : String(error));
  console.error('');

  process.exitCode = 1;
});
