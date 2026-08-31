import { existsSync } from 'node:fs';

import { spawnSync } from 'node:child_process';

import { installKiroIntegration } from './installer.js';

import { inspectKiroIntegrationStatus } from './status.js';

import {
  kiroHomeDirectory,
  kiroMcpConfigFile,
  kiroProjectMcpConfigFile,
  kiroGlobalHooksFile,
  kiroProjectHooksFile,
} from './config-paths.js';

function after(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function has(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function kiroBinaryExists(): boolean {
  const result = spawnSync('sh', ['-lc', 'command -v kiro-cli >/dev/null 2>&1'], {
    stdio: 'ignore',
  });
  return result.status === 0;
}

function kiroVersion(): string | undefined {
  try {
    const result = spawnSync('kiro-cli', ['--version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000,
    });
    return result.stdout?.trim() || undefined;
  } catch {
    return undefined;
  }
}

interface KiroStatus {
  kiroBinaryDetected: boolean;
  version?: string;
  kiroHome: string;
  globalMcpReady: boolean;
  projectMcpReady: boolean;
  globalHooksReady: boolean;
  projectHooksReady: boolean;
  integrationReady: boolean;
  errors: string[];
}

function inspectStatus(projectPath?: string): KiroStatus {
  const errors: string[] = [];

  const kiroBinaryDetected = kiroBinaryExists();
  if (!kiroBinaryDetected) {
    errors.push('kiro-cli binary not found');
  }

  const version = kiroVersion();

  const kiroHome = kiroHomeDirectory();

  const globalMcpFile = kiroMcpConfigFile();
  const globalMcpReady = existsSync(globalMcpFile);

  const projectMcpFile = kiroProjectMcpConfigFile({ cwd: projectPath });
  const projectMcpReady = existsSync(projectMcpFile);

  const globalHooksFile = kiroGlobalHooksFile();
  const globalHooksReady = existsSync(globalHooksFile);

  const projectHooksFile = kiroProjectHooksFile({ cwd: projectPath });
  const projectHooksReady = existsSync(projectHooksFile);

  // Check if integration is ready (MCP + hooks configured)
  const status = inspectKiroIntegrationStatus();
  const integrationReady = status.installed;

  return {
    kiroBinaryDetected,
    version,
    kiroHome,
    globalMcpReady,
    projectMcpReady,
    globalHooksReady,
    projectHooksReady,
    integrationReady,
    errors,
  };
}

function main(): void {
  const args = process.argv.slice(2);

  const json = has(args, '--json');
  const force = has(args, '--force');
  const scope = (after(args, '--scope') ?? 'global') as 'global' | 'project' | 'both';
  const projectPath = after(args, '--project');

  const wantsStatus = has(args, '--status') || args[0] === 'status';

  if (wantsStatus) {
    const status = inspectStatus(projectPath);

    if (json) {
      console.log(JSON.stringify(status, null, 2));
    } else {
      console.log('Kiro CLI Integration');
      console.log('====================');
      console.log('');
      console.log(`Binary detected    : ${status.kiroBinaryDetected ? '✓' : '✗'}`);
      if (status.version) {
        console.log(`Version            : ${status.version}`);
      }
      console.log(`KIRO_HOME          : ${status.kiroHome}`);
      console.log(`Global MCP         : ${status.globalMcpReady ? '✓' : '✗'}`);
      console.log(`Project MCP        : ${status.projectMcpReady ? '✓' : '✗'}`);
      console.log(`Global hooks       : ${status.globalHooksReady ? '✓' : '✗'}`);
      console.log(`Project hooks      : ${status.projectHooksReady ? '✓' : '✗'}`);
      console.log(`Integration ready  : ${status.integrationReady ? '✓' : '✗'}`);

      if (status.errors.length > 0) {
        console.log('');
        for (const error of status.errors) {
          console.log(`  ⚠ ${error}`);
        }
      }
    }

    if (!status.kiroBinaryDetected) {
      process.exitCode = 1;
    }

    return;
  }

  const result = installKiroIntegration({
    binary: after(args, '--bin'),
    scope,
    cwd: projectPath,
    force,
  });

  const status = inspectKiroIntegrationStatus();

  if (json) {
    console.log(
      JSON.stringify(
        {
          installed: result.installed,
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

  console.log(`✅ Kiro CLI integration installed (scope: ${scope})`);
  console.log(`MCP: ${result.mcp.configFile}`);
  console.log(`Hooks: ${result.hooks.hooksFile}`);
  console.log('Server: toolnet-memory');

  if (!status.installed) {
    console.log('');
    console.log(`⚠ Integration partially configured (state=${status.state})`);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));

  process.exitCode = 1;
}
