import { loadConfig, ProjectManager } from '../../core/index.js';

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../../storage/index.js';

import { resolveJunieCapability } from './capability.js';

import { installJunieHooks } from './hook-installer.js';

import { recoverJunieProject } from './recovery.js';

import { inspectJunieStatus } from './status.js';

function after(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);

  return index >= 0 ? args[index + 1] : undefined;
}

function storageFor(project: ReturnType<ProjectManager['detect']>) {
  const config = loadConfig();

  const raw = withStorageRetry(
    createStorageProvider({
      provider: config.storage.provider,
      huggingface: config.storage.huggingface,
      localRoot: config.storage.localRoot,
    }),
    { attempts: 3 }
  );

  return new ProjectScopedStorageProvider(
    raw,
    project.id,
    project.name,
    project.remote ?? project.name
  );
}

async function main() {
  const [command = 'help', ...args] = process.argv.slice(2);

  if (command === 'install-hooks' || command === 'install') {
    const projectRoot = after(args, '--project') ?? process.cwd();

    const result = installJunieHooks({
      ...(after(args, '--config') ? { configFile: after(args, '--config') } : {}),
      ...(after(args, '--bin') ? { binary: after(args, '--bin') } : {}),
      projectRoot,
    });

    if (result.installed) {
      console.log(`Junie hooks installed: ${result.configFile}`);
      console.log(`Events: ${result.events.join(', ')}`);
    } else {
      console.log(`Junie hooks not installed: ${result.reason}`);
      console.log(`Config file: ${result.configFile} (unchanged)`);
      process.exitCode = 1;
    }
    console.log(`Project: ${projectRoot}`);

    return;
  }

  if (command === 'status') {
    const status = inspectJunieStatus();

    console.log('Junie CLI Integration Status');
    console.log('============================');
    console.log(`Binary detected        : ${status.binaryDetected ? 'yes' : 'no'}`);
    if (status.version) {
      console.log(`Version                : ${status.version}`);
    }
    console.log(`Config ready           : ${status.configReady ? 'yes' : 'no'}`);
    console.log(`Hooks configured       : ${status.hooksConfigured ? 'yes' : 'no'}`);
    console.log(`Config file            : ${status.configFile}`);
    console.log(`Lifecycle hooks avail. : ${status.hooksAvailable ? 'yes' : 'no'}`);
    console.log(`Auto capture supported : ${status.automaticCaptureSupported ? 'yes' : 'no'}`);
    console.log(`Capture mode           : ${status.captureMode}`);
    console.log(`GA class               : ${status.gaClass}`);
    console.log(`Refresh mode           : ${status.refreshMode}`);
    console.log(`Capability reason      : ${status.capabilityReason}`);

    return;
  }

  if (command !== 'recover') {
    console.log(`Junie CLI Session Adapter

Commands:
  install-hooks / install
    --project PATH                   Project root
    --config PATH                    Junie config.json
    --bin PATH                       ToolNet binary

    Installs only when the detected build exposes verified lifecycle hooks.
    Stable builds fail closed and leave config.json untouched.

  status

  recover
    --project PATH                   Project root

    Available only for hook-capable builds with an active hook marker.
    Blocked-capability builds refuse recovery instead of guessing.
`);
    return;
  }

  const capability = resolveJunieCapability();

  if (capability.captureMode === 'blocked-capability') {
    console.log(
      JSON.stringify(
        {
          recovered: false,
          captureMode: capability.captureMode,
          version: capability.version,
          reason: capability.capabilityReason,
        },
        null,
        2
      )
    );

    process.exitCode = 1;

    return;
  }

  const projectPath = after(args, '--project') ?? process.cwd();

  const project = new ProjectManager().detect(projectPath);
  const results = await recoverJunieProject(project, storageFor(project));

  console.log(
    JSON.stringify(
      {
        project: project.name,
        sessions: results.length,
        imported: results.reduce((total, item) => total + item.imported, 0),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);

  process.exit(1);
});
