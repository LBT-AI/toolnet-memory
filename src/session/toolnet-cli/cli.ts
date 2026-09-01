import { installToolNetCliIntegration } from './installer.js';

import { inspectToolNetCliIntegrationStatus } from './status.js';

import { syncToolNetCliSession } from './adapter.js';

import { recoverBoundToolNetCliSessions } from './recovery.js';

import { startBoundToolNetCliWatcher } from './watcher.js';

import { loadConfig, ProjectManager } from '../../core/index.js';

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../../storage/index.js';

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
    {
      attempts: 3,
    }
  );

  return new ProjectScopedStorageProvider(
    raw,
    project.id,
    project.name,
    project.remote ?? project.name
  );
}

function printStatus(): boolean {
  const status = inspectToolNetCliIntegrationStatus({
    cwd: process.cwd(),
  });

  console.log('ToolNet CLI Integration');
  console.log('=======================');
  console.log('');

  console.log(`State : ${status.state}`);

  console.log(`MCP   : ${status.mcp.configured ? 'ready' : 'missing'} — ${status.mcp.configFile}`);

  console.log(`Memory: ${status.capabilities.level}`);

  console.log(`Capture: ${status.capabilities.nativeCapture ? 'native' : 'not available'}`);

  console.log(
    `Native source: ${status.nativeSource.available ? 'available' : 'missing'} — ${status.nativeSource.sessionsDir}`
  );

  for (const error of status.errors) {
    console.log(`Error : ${error}`);
  }

  console.log('');

  return status.installed;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const command = args[0];

  const json = args.includes('--json');

  /*
   * Continuously recover only sessions already bound to this
   * project. This is an explicit ToolNet Memory watcher,
   * not a native ToolNet CLI lifecycle hook.
   */
  if (command === 'watch-bound') {
    const projectPath = after(args, '--project') ?? process.cwd();

    const project = new ProjectManager().detect(projectPath);

    const storage = storageFor(project);

    const intervalRaw = after(args, '--interval-ms');

    const intervalParsed = intervalRaw !== undefined ? Number(intervalRaw) : undefined;

    const intervalMs =
      Number.isFinite(intervalParsed) && intervalParsed !== undefined ? intervalParsed : undefined;

    const watcher = startBoundToolNetCliWatcher({
      project,

      storage,

      sessionsDir: after(args, '--sessions-dir'),

      localOnly: args.includes('--local-only'),

      intervalMs,

      onSync(result) {
        if (result.importedMessages === 0 && result.recordedEvents === 0 && result.failed === 0) {
          return;
        }

        console.log(
          JSON.stringify(
            {
              event: 'toolnet-cli-bound-sync',

              ...result,
            },
            null,
            2
          )
        );
      },

      onError(error) {
        console.error(`ToolNet CLI watcher error: ${error.message}`);
      },
    });

    const first = await watcher.runOnce();

    console.log(
      JSON.stringify(
        {
          event: 'toolnet-cli-watcher-started',

          first,

          watcher: watcher.status(),
        },
        null,
        2
      )
    );

    const stop = (): void => {
      watcher.stop();

      console.log(
        JSON.stringify(
          {
            event: 'toolnet-cli-watcher-stopped',

            watcher: watcher.status(),
          },
          null,
          2
        )
      );
    };

    process.once('SIGINT', stop);

    process.once('SIGTERM', stop);

    return;
  }

  /*
   * Recover all native ToolNet CLI sessions that were explicitly
   * bound to the current project.
   *
   * No implicit binding and no global-session sweep.
   */
  if (command === 'sync-bound') {
    const projectPath = after(args, '--project') ?? process.cwd();

    const project = new ProjectManager().detect(projectPath);

    const storage = storageFor(project);

    const result = await recoverBoundToolNetCliSessions({
      project,

      storage,

      sessionsDir: after(args, '--sessions-dir'),

      localOnly: args.includes('--local-only'),

      idle: args.includes('--idle'),
    });

    console.log(JSON.stringify(result, null, 2));

    if (result.failed > 0) {
      process.exitCode = 1;
    }

    return;
  }

  /*
   * Native ToolNet CLI session import.
   *
   * Example:
   * toolnet-memory integrate:toolnet-cli sync sess_123
   */
  if (command === 'sync') {
    const nativeSessionId = args[1];

    if (!nativeSessionId) {
      throw new Error(
        'Usage: toolnet-memory integrate:toolnet-cli sync <session-id> --bind [--project PATH]'
      );
    }

    const projectPath = after(args, '--project') ?? process.cwd();

    const project = new ProjectManager().detect(projectPath);

    const storage = storageFor(project);

    const result = await syncToolNetCliSession({
      project,

      storage,

      nativeSessionId,

      sessionsDir: after(args, '--sessions-dir'),

      localOnly: args.includes('--local-only'),

      idle: args.includes('--idle'),

      bind: args.includes('--bind'),

      bindingFile: after(args, '--binding-file'),
    });

    console.log(JSON.stringify(result, null, 2));

    return;
  }

  const wantsStatus = args.includes('--status') || args[0] === 'status';

  if (wantsStatus) {
    const status = inspectToolNetCliIntegrationStatus({
      cwd: process.cwd(),
    });

    if (json) {
      console.log(JSON.stringify(status, null, 2));
    } else {
      printStatus();
    }

    if (!status.installed) {
      process.exitCode = 1;
    }

    return;
  }

  const force = args.includes('--force');

  const result = installToolNetCliIntegration({
    force,

    cwd: process.cwd(),
  });

  const status = inspectToolNetCliIntegrationStatus({
    cwd: process.cwd(),
  });

  if (!status.installed) {
    throw new Error(
      `ToolNet CLI integration installation did not verify successfully (state=${status.state}).`
    );
  }

  if (json) {
    console.log(
      JSON.stringify(
        {
          installed: true,

          changed: result.changed,

          files: result.files,

          status,
        },
        null,
        2
      )
    );

    return;
  }

  console.log(`ToolNet CLI MCP: ${result.mcp.configured ? 'configured' : 'not configured'}`);

  console.log(`Memory: ${status.capabilities.level}`);

  console.log(`Native source: ${status.nativeSource.available ? 'available' : 'missing'}`);

  if (result.changed) {
    console.log(`Config updated: ${result.mcp.configFile}`);
  } else {
    console.log('Config unchanged (already configured)');
  }

  console.log('');
  console.log('ToolNet CLI integration ready.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));

  process.exitCode = 1;
});
