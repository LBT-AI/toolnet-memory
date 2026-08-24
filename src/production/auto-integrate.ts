import { detectAgentIntegrations, type AgentDetection } from './integration-detection.js';

import { installAgyPlugin } from '../session/agy/plugin-installer.js';

import { installOpenCodePlugin } from '../session/opencode/plugin-installer.js';

import { installOpenCodeMcp } from '../session/opencode/mcp-installer.js';

import { installCodexNotify } from '../session/codex/notify-installer.js';

import { installCodexContextHook } from '../session/codex/context-hook-installer.js';

import { installCodexMcp } from '../session/codex/mcp-installer.js';

import { installClaudeIntegration } from '../session/claude/installer.js';

import {
  installKiroIntegration,
  type InstallKiroIntegrationOptions,
} from '../session/kiro/installer.js';

export interface AutoIntegrationResult {
  agent: 'agy' | 'opencode' | 'codex' | 'claude' | 'kiro';

  detected: boolean;

  installed: boolean;

  targets: string[];

  error?: string;
}

export function detectAutoIntegrations(): AgentDetection[] {
  return detectAgentIntegrations();
}

export function installAutoIntegrations(
  options: {
    binary?: string;
    force?: boolean;

    /**
     * Optional deterministic detections for tests/embedders.
     * Normal CLI usage leaves this undefined.
     */
    detections?: AgentDetection[];

    /**
     * Optional Kiro path overrides for tests/custom deployments.
     */
    kiro?: Omit<InstallKiroIntegrationOptions, 'binary'>;
  } = {}
): AutoIntegrationResult[] {
  const binary = options.binary ?? process.env.TOOLNET_MEMORY_BIN ?? 'toolnet-memory';

  const results: AutoIntegrationResult[] = [];

  const detections = options.detections ?? detectAutoIntegrations();

  const detected = new Map(detections.map((item) => [item.agent, item.detected]));

  /*
   * Agy / Antigravity
   */
  {
    const isDetected = options.force === true || detected.get('agy') === true;

    if (!isDetected) {
      results.push({
        agent: 'agy',

        detected: false,

        installed: false,

        targets: [],
      });
    } else {
      try {
        const plugin = installAgyPlugin({
          binary,
        });

        results.push({
          agent: 'agy',

          detected: true,

          installed: true,

          targets: plugin.files,
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
    const isDetected = options.force === true || detected.get('opencode') === true;

    if (!isDetected) {
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
   * Claude Code
   */
  {
    const isDetected = options.force === true || detected.get('claude') === true;

    if (!isDetected) {
      results.push({
        agent: 'claude',

        detected: false,

        installed: false,

        targets: [],
      });
    } else {
      try {
        const claude = installClaudeIntegration({
          binary,
        });

        results.push({
          agent: 'claude',

          detected: true,

          installed: true,

          targets: [
            claude.hooks.settingsFile,
            claude.mcp.configFile,
            `mcp:${claude.mcp.serverName}`,
          ],
        });
      } catch (error) {
        results.push({
          agent: 'claude',

          detected: true,

          installed: false,

          targets: [],

          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /*
   * Kiro CLI
   */
  {
    const isDetected = options.force === true || detected.get('kiro') === true;

    if (!isDetected) {
      results.push({
        agent: 'kiro',

        detected: false,

        installed: false,

        targets: [],
      });
    } else {
      try {
        const kiro = installKiroIntegration({
          ...(options.kiro ?? {}),

          binary,
        });

        results.push({
          agent: 'kiro',

          detected: true,

          installed: true,

          targets: [kiro.mcp.configFile, `mcp:${kiro.mcp.serverName}`, kiro.hooks.hooksFile],
        });
      } catch (error) {
        results.push({
          agent: 'kiro',

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
    const isDetected = options.force === true || detected.get('codex') === true;

    if (!isDetected) {
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

function integrationDisplayName(agent: AutoIntegrationResult['agent']): string {
  switch (agent) {
    case 'agy':
      return 'Agy / Antigravity';

    case 'opencode':
      return 'OpenCode';

    case 'claude':
      return 'Claude Code';

    case 'kiro':
      return 'Kiro CLI';

    case 'codex':
      return 'Codex';
  }
}

function printDetections(detections: AgentDetection[]): void {
  console.log('');
  console.log('ToolNet Memory Integration Detection');
  console.log('====================================');
  console.log('');

  for (const item of detections) {
    const name = integrationDisplayName(item.agent);

    if (!item.detected) {
      console.log(`○ ${name}: not detected`);

      continue;
    }

    console.log(`✓ ${name}: detected`);

    for (const evidence of item.evidence) {
      console.log(`  ${evidence}`);
    }
  }

  console.log('');
}

function printResults(results: AutoIntegrationResult[]): void {
  console.log('');
  console.log('ToolNet Memory AI Integrations');
  console.log('==============================');
  console.log('');

  for (const result of results) {
    const name = integrationDisplayName(result.agent);

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

  const detectOnly = args.includes('--detect-only');

  if (detectOnly) {
    const detections = detectAutoIntegrations();

    if (json) {
      console.log(JSON.stringify(detections, null, 2));

      return;
    }

    printDetections(detections);

    return;
  }

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
