import { existsSync } from 'node:fs';

import { loadConfig, ProjectManager } from '../../core/index.js';

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../../storage/index.js';

import { syncAgySession } from './adapter.js';

import { installAgyPlugin, type InstallAgyPluginResult } from './plugin-installer.js';

import { recoverAgyProject } from './recovery.js';

import {
  agyAntigravityDirectory,
  agyGlobalMcpConfigFile,
  agyWorkspaceMcpConfigFile,
  agyPluginRoot,
} from './config-paths.js';

import { spawnSync } from 'node:child_process';

function after(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);

  return index >= 0 ? args[index + 1] : undefined;
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
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

function agyBinaryExists(): boolean {
  const result = spawnSync('sh', ['-lc', 'command -v agy >/dev/null 2>&1'], {
    stdio: 'ignore',
  });
  return result.status === 0;
}

interface AgyStatus {
  agyBinaryDetected: boolean;
  globalMcpReady: boolean;
  workspaceMcpReady: boolean;
  pluginReady: boolean;
  hooksReady: boolean;
  continuityRuleReady: boolean;
  errors: string[];
}

function inspectStatus(cwd?: string): AgyStatus {
  const errors: string[] = [];

  const agyBinaryDetected = agyBinaryExists();
  if (!agyBinaryDetected) {
    errors.push('agy binary not found');
  }

  const globalMcpFile = agyGlobalMcpConfigFile();
  const globalMcpReady = existsSync(globalMcpFile);
  if (!globalMcpReady) {
    errors.push(`Global MCP config missing: ${globalMcpFile}`);
  }

  const workspaceMcpFile = agyWorkspaceMcpConfigFile({ cwd });
  const workspaceMcpReady = existsSync(workspaceMcpFile);

  const pluginDir = agyPluginRoot();
  const pluginReady = existsSync(pluginDir);
  if (!pluginReady) {
    errors.push(`Plugin directory missing: ${pluginDir}`);
  }

  const pluginHooksFile = `${pluginDir}/hooks.json`;
  const hooksReady = existsSync(pluginHooksFile);
  if (!hooksReady && pluginReady) {
    errors.push(`Hooks file missing: ${pluginHooksFile}`);
  }

  const ruleFile = `${pluginDir}/rules/toolnet-memory-continuity.md`;
  const continuityRuleReady = existsSync(ruleFile);
  if (!continuityRuleReady && pluginReady) {
    errors.push(`Continuity rule missing: ${ruleFile}`);
  }

  return {
    agyBinaryDetected,
    globalMcpReady,
    workspaceMcpReady,
    pluginReady,
    hooksReady,
    continuityRuleReady,
    errors,
  };
}

async function main() {
  const [command = 'help', ...args] = process.argv.slice(2);

  const json = hasFlag(args, '--json');
  const force = hasFlag(args, '--force');
  const scope = (after(args, '--scope') ?? 'global') as 'global' | 'workspace' | 'both';
  const projectPath = after(args, '--project') ?? process.cwd();

  if (command === 'status') {
    const status = inspectStatus(projectPath);

    if (json) {
      console.log(JSON.stringify(status, null, 2));
    } else {
      console.log('AGY / Antigravity CLI Integration');
      console.log('=================================');
      console.log('');
      console.log(`Binary detected  : ${status.agyBinaryDetected ? '✓' : '✗'}`);
      console.log(`Global MCP ready : ${status.globalMcpReady ? '✓' : '✗'}`);
      console.log(`Workspace MCP    : ${status.workspaceMcpReady ? '✓' : '✗'}`);
      console.log(`Plugin ready     : ${status.pluginReady ? '✓' : '✗'}`);
      console.log(`Hooks ready      : ${status.hooksReady ? '✓' : '✗'}`);
      console.log(`Continuity rule  : ${status.continuityRuleReady ? '✓' : '✗'}`);

      if (status.errors.length > 0) {
        console.log('');
        for (const error of status.errors) {
          console.log(`  ⚠ ${error}`);
        }
      }
    }

    if (!status.agyBinaryDetected) {
      process.exitCode = 1;
    }

    return;
  }

  if (command === 'install-hooks' || command === 'install-plugin') {
    const result = installAgyPlugin({
      binary: after(args, '--bin'),
      scope,
      cwd: projectPath,
      force,
    });

    if (json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`✅ ToolNet Antigravity plugin installed: ${result.pluginRoot}`);

      for (const file of result.files) {
        console.log(`  ✓ ${file}`);
      }

      console.log('');
      console.log('Restart Antigravity CLI before testing.');
    }

    return;
  }

  const project = new ProjectManager().detect(projectPath);

  const storage = storageFor(project);

  if (command === 'sync') {
    const conversationId = args[0];

    const transcriptPath = after(args, '--transcript');

    if (!conversationId || !transcriptPath) {
      throw new Error('Usage: sync <conversation-id> --transcript <path>');
    }

    const result = await syncAgySession({
      project,
      storage,
      conversationId,
      transcriptPath,
      phase: 'recover',
    });

    console.log(JSON.stringify(result, null, 2));

    return;
  }

  if (command === 'recover') {
    const limit = Number(after(args, '--limit') ?? 100);

    const results = await recoverAgyProject(project, storage, Number.isFinite(limit) ? limit : 100);

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

    return;
  }

  console.log(
    `Agy Session Adapter

Commands:
  install-hooks / install-plugin
    --scope global|workspace|both   MCP scope (default: global)
    --project PATH                  Project root
    --force                         Force reinstall
    --json                          JSON output

  status
    --json                          JSON output
    --project PATH                  Project root

  sync <conversation-id> --transcript <path>
    --project PATH                  Project root

  recover
    --project PATH                  Project root
    --limit N                       Max sessions (default: 100)
`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);

  process.exit(1);
});
