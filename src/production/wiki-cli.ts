/**
 * ToolNet Wiki state CLI entry point.
 *
 *   toolnet-memory wiki:inspect [--json]
 *   toolnet-memory wiki:repair  [--dry-run]
 *
 * Inspection never writes. Repair only applies a supported migration and never
 * deletes state.
 */

import type { ProjectManifest } from '../core/types.js';
import { loadConfig, ProjectManager } from '../core/index.js';
import { createStorageProvider, withStorageRetry } from '../storage/index.js';
import { inspectWikiState, runWikiRepair } from './wiki-state.js';

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

function project(): ProjectManifest {
  return new ProjectManager().detect();
}

async function wikiInspectCli(argv: string[]): Promise<number> {
  const json = argv.includes('--json');

  try {
    const report = await inspectWikiState(rootStorage(), project());

    if (json) {
      console.log(JSON.stringify(report, null, 2));
      return 0;
    }

    console.log(
      [
        `WIKI_INSPECT=${report.status}`,
        `project=${report.projectId}`,
        `wiki=${report.state.wiki.status}`,
        `governance=${report.state.governance.status}`,
        `automation=${report.state.automation.status}`,
        `repair_required=${String(report.repairRequired)}`,
        `migration_available=${String(report.migrationAvailable)}`,
      ].join('\n')
    );

    for (const line of report.guidance) {
      console.log(`guidance=${line}`);
    }

    return 0;
  } catch (error) {
    console.error(`WIKI_INSPECT=FAILED ${error instanceof Error ? error.message : String(error)}`);

    return 1;
  }
}

async function wikiRepairCli(argv: string[]): Promise<number> {
  const dryRun = argv.includes('--dry-run');

  try {
    const report = await runWikiRepair(rootStorage(), project(), { dryRun });

    console.log(
      [
        `WIKI_REPAIR=${dryRun ? 'DRY_RUN' : report.migrated ? 'MIGRATED' : 'NO_ACTION'}`,
        `dry_run=${String(report.dryRun)}`,
        `state_before=${report.statusBefore}`,
        `state_after=${report.statusAfter}`,
        `changed=${String(report.changed)}`,
        `migrated=${String(report.migrated)}`,
        `actions=${report.actions.join(',')}`,
      ].join('\n')
    );

    return 0;
  } catch (error) {
    console.error(`WIKI_REPAIR=FAILED ${error instanceof Error ? error.message : String(error)}`);

    return 1;
  }
}

async function main(): Promise<number> {
  const [subcommand, ...rest] = process.argv.slice(2);

  if (subcommand === 'repair') {
    return wikiRepairCli(rest);
  }

  return wikiInspectCli(rest);
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error('WIKI_CLI=FAILED', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
