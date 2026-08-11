import { existsSync } from 'node:fs';

import { homedir } from 'node:os';

import { join } from 'node:path';

import { spawnSync } from 'node:child_process';

import { installAgyHooks } from '../session/agy/hook-installer.js';

import { installAgyMcp } from '../session/agy/mcp-installer.js';

import { installOpenCodePlugin } from '../session/opencode/plugin-installer.js';

import { installOpenCodeMcp } from '../session/opencode/mcp-installer.js';

import { installCodexNotify } from '../session/codex/notify-installer.js';

import { installCodexContextHook } from '../session/codex/context-hook-installer.js';

import { installCodexMcp } from '../session/codex/mcp-installer.js';

export interface AutoIntegrationResult {
  agent: 'agy' | 'opencode' | 'codex';

  detected: boolean;

  installed: boolean;

  targets: string[];

  error?: string;
}

function commandExists(command: string): boolean {
  const result = spawnSync('sh', ['-lc', `command -v ${JSON.stringify(command)} >/dev/null 2>&1`], {
    stdio: 'ignore',
  });

  return result.status === 0;
}

function detectAgy(): boolean {
  return commandExists('agy') || existsSync(join(homedir(), '.gemini'));
}

function detectOpenCode(): boolean {
  return commandExists('opencode') || existsSync(join(homedir(), '.config', 'opencode'));
}

function detectCodex(): boolean {
  return commandExists('codex') || existsSync(process.env.CODEX_HOME ?? join(homedir(), '.codex'));
}

export function installAutoIntegrations(
  options: {
    binary?: string;
    force?: boolean;
  } = {}
): AutoIntegrationResult[] {
  const binary = options.binary ?? process.env.TOOLNET_MEMORY_BIN ?? 'toolnet-memory';

  const results: AutoIntegrationResult[] = [];

  /*
   * Agy / Antigravity
   */
  {
    const detected = options.force === true || detectAgy();

    if (!detected) {
      results.push({
        agent: 'agy',

        detected: false,

        installed: false,

        targets: [],
      });
    } else {
      try {
        const hooks = installAgyHooks({
          binary,
        });

        const mcp = installAgyMcp({
          binary,
        });

        results.push({
          agent: 'agy',

          detected: true,

          installed: true,

          targets: [hooks, mcp.configFile],
        });
      } catch (error) {
        results.push({
          agent: 'agy',

          detected: true,

          installed: false,

          targets: [],

          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /*
   * OpenCode
   */
  {
    const detected = options.force === true || detectOpenCode();

    if (!detected) {
      results.push({
        agent: 'opencode',

        detected: false,

        installed: false,

        targets: [],
      });
    } else {
      try {
        const plugin = installOpenCodePlugin({
          binary,
        });

        const mcp = installOpenCodeMcp({
          binary,
        });

        results.push({
          agent: 'opencode',

          detected: true,

          installed: true,

          targets: [plugin, mcp.configFile, `mcp:${mcp.serverName}`],
        });
      } catch (error) {
        results.push({
          agent: 'opencode',

          detected: true,

          installed: false,

          targets: [],

          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /*
   * Codex
   */
  {
    const detected = options.force === true || detectCodex();

    if (!detected) {
      results.push({
        agent: 'codex',

        detected: false,

        installed: false,

        targets: [],
      });
    } else {
      try {
        const notify = installCodexNotify({
          binary,
        });

        const context = installCodexContextHook({
          binary,
        });

        const mcp = installCodexMcp({
          binary,
        });

        if (!mcp.installed) {
          throw new Error(mcp.error ?? 'Codex MCP registration failed');
        }

        const targets = [notify.configFile, context, `mcp:${mcp.serverName}`];

        if (notify.preservedPrevious) {
          targets.push(notify.previousFile);
        }

        results.push({
          agent: 'codex',

          detected: true,

          installed: true,

          targets,
        });
      } catch (error) {
        results.push({
          agent: 'codex',

          detected: true,

          installed: false,

          targets: [],

          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  return results;
}

function printResults(results: AutoIntegrationResult[]): void {
  console.log('');
  console.log('ToolNet Memory AI Integrations');
  console.log('==============================');
  console.log('');

  for (const result of results) {
    const name =
      result.agent === 'agy'
        ? 'Agy / Antigravity'
        : result.agent === 'opencode'
          ? 'OpenCode'
          : 'Codex';

    if (!result.detected) {
      console.log(`- ${name}: not detected`);

      continue;
    }

    if (result.installed) {
      console.log(`✓ ${name}: automatic memory enabled`);

      continue;
    }

    console.log(`✗ ${name}: integration failed`);

    if (result.error) {
      console.log(`  ${result.error}`);
    }
  }

  console.log('');
}

async function main() {
  const args = process.argv.slice(2);

  const force = args.includes('--all');

  const json = args.includes('--json');

  const results = installAutoIntegrations({
    force,
  });

  if (json) {
    console.log(JSON.stringify(results, null, 2));

    return;
  }

  printResults(results);
}

const isCli =
  process.argv[1] &&
  (process.argv[1].endsWith('auto-integrate.js') || process.argv[1].endsWith('auto-integrate.ts'));

if (isCli) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));

    process.exitCode = 1;
  });
}
