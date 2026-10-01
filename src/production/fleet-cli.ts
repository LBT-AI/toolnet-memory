/**
 * ToolNet Fleet build CLI entry point.
 *
 *   toolnet-memory fleet:build [--dry-run] [--require-complete]
 *
 * Publishing Fleet state is an explicit lifecycle action; read-only Fleet
 * tools never write. Coverage is stamped with the snapshot generation it
 * belongs to, so a reader can never interpret coverage for a different
 * snapshot as current.
 */

import { ProjectManager, loadConfig } from '../core/index.js';
import { createStorageProvider, withStorageRetry } from '../storage/index.js';
import { runFleetBuild } from './fleet-build.js';

function rootStorage() {
  const config = loadConfig();

  return withStorageRetry(
    createStorageProvider({
      provider: config.storage.provider,
      r2: config.storage.r2,
      s3: config.storage.s3,
      huggingface: config.storage.huggingface,
      localRoot: config.storage.localRoot,
    }),
    { attempts: 3 }
  );
}

async function fleetBuildCli(argv: string[]): Promise<number> {
  const args = new Set(argv);

  const dryRun = args.has('--dry-run');

  const requireCompleteCoverage = args.has('--require-complete');

  try {
    /* Identifies the project for the operator's convenience only; Fleet state
     * lives in the shared root namespace, not in a project namespace. */
    const project = new ProjectManager().detect();

    const report = await runFleetBuild(rootStorage(), { dryRun, requireCompleteCoverage });

    console.log(
      [
        `FLEET_BUILD=${report.published ? 'PUBLISHED' : report.dryRun ? 'DRY_RUN' : 'NOT_PUBLISHED'}`,
        `project=${project.name}`,
        `state_before=${report.statusBefore}`,
        `state_after=${report.statusAfter}`,
        `build_required=${String(report.buildRequired)}`,
        `generation=${report.generation}`,
        `registered_projects=${String(report.registeredProjects)}`,
        `unregistered_projects=${String(report.unregisteredProjects)}`,
        `available_projects=${String(report.availableProjects)}`,
        `coverage=${report.coverage.status}`,
        `negative_claim_safe=${String(report.coverage.negativeClaimSafe)}`,
      ].join('\n')
    );

    if (report.missingProjects.length > 0) {
      console.log(`missing_projects=${report.missingProjects.join(',')}`);
    }

    return 0;
  } catch (error) {
    console.error(`FLEET_BUILD=FAILED ${error instanceof Error ? error.message : String(error)}`);

    return 1;
  }
}

fleetBuildCli(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error('FLEET_BUILD=FAILED', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
