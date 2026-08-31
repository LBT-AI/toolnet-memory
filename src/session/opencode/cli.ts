import { existsSync, readFileSync } from 'node:fs';

import { join } from 'node:path';

import { spawnSync } from 'node:child_process';

import { loadConfig, ProjectManager } from '../../core/index.js';

import {
  createStorageProvider,
  ProjectScopedStorageProvider,
  withStorageRetry,
} from '../../storage/index.js';

import { recoverOpenCodeProject, syncOpenCodeSession } from './adapter.js';

import { installOpenCodePlugin } from './plugin-installer.js';

import { installOpenCodeMcp } from './mcp-installer.js';

import { refreshStartupBriefCache } from '../../work-continuity/brief-cache.js';

import {
  openCodeConfigDirectory,
  openCodeGlobalConfigFile,
  openCodeProjectConfigFile,
  openCodePluginDirectory,
  openCodeGlobalAgentsFile,
} from './config-paths.js';

function valueAfter(
  args: string[],

  flag: string
): string | undefined {
  const index = args.indexOf(flag);

  if (index < 0) {
    return undefined;
  }

  return args[index + 1];
}

function has(
  args: string[],

  flag: string
): boolean {
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

function opencodeBinaryExists(): boolean {
  const result = spawnSync('sh', ['-lc', 'command -v opencode >/dev/null 2>&1'], {
    stdio: 'ignore',
  });
  return result.status === 0;
}

function opencodeVersion(): string | undefined {
  try {
    const result = spawnSync('opencode', ['--version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000,
    });
    return result.stdout?.trim() || undefined;
  } catch {
    return undefined;
  }
}

function opencodeMcpList(): { available: boolean; servers: string[] } {
  try {
    const result = spawnSync('opencode', ['mcp', 'list', '--format', 'json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 10000,
    });

    if (result.status !== 0) {
      return { available: false, servers: [] };
    }

    const parsed = JSON.parse(result.stdout || '[]');

    const servers = Array.isArray(parsed)
      ? parsed.map((s: Record<string, unknown>) => String(s.name || s.id || ''))
      : [];

    return { available: true, servers };
  } catch {
    return { available: false, servers: [] };
  }
}

interface OpenCodeStatus {
  opencodeBinaryDetected: boolean;
  version?: string;
  globalConfigExists: boolean;
  projectConfigExists: boolean;
  customConfigExists: boolean;
  globalMcpReady: boolean;
  projectMcpReady: boolean;
  globalPluginExists: boolean;
  projectPluginExists: boolean;
  continuityInstructions: boolean;
  mcpConnectionStatus?: { available: boolean; servers: string[] };
  errors: string[];
}

function inspectStatus(projectPath?: string): OpenCodeStatus {
  const errors: string[] = [];

  const opencodeBinaryDetected = opencodeBinaryExists();
  if (!opencodeBinaryDetected) {
    errors.push('opencode binary not found');
  }

  const version = opencodeVersion();

  const globalConfigFile = openCodeGlobalConfigFile();
  const globalConfigExists = existsSync(globalConfigFile);

  const projectConfigFile = openCodeProjectConfigFile({ cwd: projectPath });
  const projectConfigExists = existsSync(projectConfigFile);

  const customConfigFile = process.env.OPENCODE_CONFIG?.trim();
  const customConfigExists = customConfigFile ? existsSync(customConfigFile) : false;

  // Check MCP in global config
  let globalMcpReady = false;
  if (globalConfigExists) {
    try {
      const config = JSON.parse(readFileSync(globalConfigFile, 'utf8'));
      globalMcpReady = !!config.mcp?.['toolnet-memory'];
    } catch {
      // Invalid config
    }
  }

  // Check MCP in project config
  let projectMcpReady = false;
  if (projectConfigExists) {
    try {
      const config = JSON.parse(readFileSync(projectConfigFile, 'utf8'));
      projectMcpReady = !!config.mcp?.['toolnet-memory'];
    } catch {
      // Invalid config
    }
  }

  const globalPluginDir = openCodePluginDirectory();
  const globalPluginExists = existsSync(`${globalPluginDir}/toolnet-memory.js`);

  const projectPluginDir = join(projectPath ?? process.cwd(), '.opencode', 'plugins');
  const projectPluginExists = existsSync(`${projectPluginDir}/toolnet-memory.js`);

  const agentsFile = openCodeGlobalAgentsFile();
  const continuityInstructions = existsSync(agentsFile);

  let mcpConnectionStatus: { available: boolean; servers: string[] } | undefined;
  if (opencodeBinaryDetected) {
    mcpConnectionStatus = opencodeMcpList();
  }

  return {
    opencodeBinaryDetected,
    version,
    globalConfigExists,
    projectConfigExists,
    customConfigExists,
    globalMcpReady,
    projectMcpReady,
    globalPluginExists,
    projectPluginExists,
    continuityInstructions,
    mcpConnectionStatus,
    errors,
  };
}

async function main() {
  const [command = 'help', ...args] = process.argv.slice(2);

  const json = has(args, '--json');
  const force = has(args, '--force');
  const scope = (valueAfter(args, '--scope') ?? 'global') as 'global' | 'project' | 'both';
  const projectPath = valueAfter(args, '--project') ?? process.cwd();

  if (command === 'status') {
    const status = inspectStatus(projectPath);

    if (json) {
      console.log(JSON.stringify(status, null, 2));
    } else {
      console.log('OpenCode Integration');
      console.log('====================');
      console.log('');
      console.log(`Binary detected     : ${status.opencodeBinaryDetected ? '✓' : '✗'}`);
      if (status.version) {
        console.log(`Version             : ${status.version}`);
      }
      console.log(`Global config       : ${status.globalConfigExists ? '✓' : '✗'}`);
      console.log(`Project config      : ${status.projectConfigExists ? '✓' : '✗'}`);
      if (status.customConfigExists) {
        console.log(`Custom config       : ✓ (${process.env.OPENCODE_CONFIG})`);
      }
      console.log(`Global MCP          : ${status.globalMcpReady ? '✓' : '✗'}`);
      console.log(`Project MCP         : ${status.projectMcpReady ? '✓' : '✗'}`);
      console.log(`Global plugin       : ${status.globalPluginExists ? '✓' : '✗'}`);
      console.log(`Project plugin      : ${status.projectPluginExists ? '✓' : '✗'}`);
      console.log(`Continuity rules    : ${status.continuityInstructions ? '✓' : '✗'}`);

      if (status.mcpConnectionStatus) {
        console.log(`MCP connection      : ${status.mcpConnectionStatus.available ? '✓' : '✗'}`);
        if (status.mcpConnectionStatus.servers.length > 0) {
          console.log(`  Servers           : ${status.mcpConnectionStatus.servers.join(', ')}`);
        }
      }

      if (status.errors.length > 0) {
        console.log('');
        for (const error of status.errors) {
          console.log(`  ⚠ ${error}`);
        }
      }
    }

    if (!status.opencodeBinaryDetected) {
      process.exitCode = 1;
    }

    return;
  }

  if (command === 'install-plugin') {
    // Install MCP
    const mcpResult = installOpenCodeMcp({
      binary: valueAfter(args, '--bin'),
      scope,
      cwd: projectPath,
      force,
    });

    // Install plugin
    const pluginFiles = installOpenCodePlugin({
      binary: valueAfter(args, '--bin'),
      scope,
      cwd: projectPath,
    });

    if (json) {
      console.log(JSON.stringify({ mcp: mcpResult, pluginFiles }, null, 2));
    } else {
      console.log(`✅ OpenCode integration installed (scope: ${scope})`);
      console.log(`  MCP config: ${mcpResult.configFile}`);
      if (mcpResult.changed) {
        console.log(`  ✓ MCP server "${mcpResult.serverName}" added`);
      } else {
        console.log(`  ✓ MCP server "${mcpResult.serverName}" already configured`);
      }
      for (const file of pluginFiles) {
        console.log(`  ✓ ${file}`);
      }
      console.log('');
      console.log('OpenCode will load plugins automatically on next start.');
      console.log('Verify MCP with: opencode mcp list');
    }

    return;
  }

  const project = new ProjectManager().detect(projectPath);

  const storage = storageFor(project);

  const dbPath = valueAfter(args, '--db');

  if (command === 'sync') {
    const nativeSessionId = args.find(
      (value) => !value.startsWith('--') && value !== projectPath && value !== dbPath
    );

    if (!nativeSessionId) {
      throw new Error('Usage: session:opencode-sync <session-id>');
    }

    const idle = has(args, '--idle');

    const error = has(args, '--error');

    const compacted = has(args, '--compacted');

    const localOnly = has(args, '--local-only');

    const result = await syncOpenCodeSession({
      project,
      storage,
      nativeSessionId,
      dbPath,
      idle,
      error,
      compacted,
      localOnly,
    });

    if (!localOnly && (idle || compacted || error)) {
      try {
        await refreshStartupBriefCache(project, storage, 800);
      } catch {
        // Derived cache must never break session capture.
      }
    }

    console.log(JSON.stringify(result, null, 2));

    return;
  }

  if (command === 'recover') {
    const limitValue = valueAfter(args, '--limit');

    const limit = limitValue ? Number(limitValue) : 100;

    const results = await recoverOpenCodeProject({
      project,
      storage,
      dbPath,
      limit: Number.isFinite(limit) ? limit : 100,
    });

    console.log(
      JSON.stringify(
        {
          project: project.name,
          sessions: results.length,
          importedMessages: results.reduce((total, item) => total + item.importedMessages, 0),
          importedParts: results.reduce((total, item) => total + item.importedParts, 0),
        },
        null,
        2
      )
    );

    return;
  }

  console.log(
    `OpenCode Session Adapter

Commands:
  install-plugin
    --scope global|project|both   MCP + plugin scope (default: global)
    --project PATH                Project root
    --force                       Force reinstall
    --json                        JSON output

  status
    --json                        JSON output
    --project PATH                Project root

  sync <session-id>
    --project PATH                Project root
    --db PATH                     Custom DB path
    --idle                        Mark session idle
    --compacted                   Mark session compacted
    --error                       Mark session error
    --local-only                  Local flush only

  recover
    --project PATH                Project root
    --db PATH                     Custom DB path
    --limit N                     Max sessions (default: 100)
`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);

  process.exit(1);
});
