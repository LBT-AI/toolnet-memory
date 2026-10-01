import {
  detectAgentIntegrations,
  type AgentDetection,
  type AgentIntegrationId,
} from './integration-detection.js';

import { installAgyPlugin } from '../session/agy/plugin-installer.js';

import { installOpenCodePlugin } from '../session/opencode/plugin-installer.js';

import { installOpenCodeMcp } from '../session/opencode/mcp-installer.js';

import { installCodexNotify } from '../session/codex/notify-installer.js';

import { installCodexContextHook } from '../session/codex/context-hook-installer.js';

import { installCodexStopHook } from '../session/codex/stop-hook-installer.js';

import { installCodexMcp } from '../session/codex/mcp-installer.js';

import { installClaudeIntegration } from '../session/claude/installer.js';

import {
  installKiroIntegration,
  type InstallKiroIntegrationOptions,
} from '../session/kiro/installer.js';

import {
  installToolNetCliIntegration,
  type InstallToolNetCliIntegrationOptions,
} from '../session/toolnet-cli/installer.js';

import {
  installKiloIntegration,
  type InstallKiloIntegrationOptions,
} from '../session/kilo/installer.js';

import {
  installCursorIntegration,
  type InstallCursorIntegrationOptions,
} from '../session/cursor/installer.js';

import {
  installCopilotIntegration,
  type InstallCopilotIntegrationOptions,
} from '../session/copilot/installer.js';

import {
  installGrokIntegration,
  type InstallGrokIntegrationOptions,
} from '../session/grok/installer.js';

import { installGooseIntegration, type GooseInstallOptions } from '../session/goose/installer.js';

import { installQwenIntegration, type QwenInstallOptions } from '../session/qwen/installer.js';

import { installKimiIntegration, type KimiInstallOptions } from '../session/kimi/installer.js';

import {
  installHermesIntegration,
  type HermesInstallOptions,
} from '../session/hermes/installer.js';

import { installQoderIntegration, type QoderInstallOptions } from '../session/qoder/installer.js';

import { installAiderIntegration, type AiderInstallOptions } from '../session/aider/installer.js';

import {
  installPlandexIntegration,
  type PlandexInstallOptions,
} from '../session/plandex/installer.js';

import {
  installOpenRouterIntegration,
  type OpenRouterInstallOptions,
} from '../session/openrouter/installer.js';

import {
  resolveAutoIntegrationScope,
  type AutoIntegrationScopeResolution,
} from './auto-integration-scope.js';

import {
  parseIntegrationScope,
  type IntegrationScope,
} from '../session/integration-scope/index.js';

export interface AutoIntegrationResult {
  agent: AgentIntegrationId;

  detected: boolean;

  installed: boolean;

  targets: string[];

  /**
   * Present for scoped Cursor/Copilot/Grok integrations.
   */
  scope?: IntegrationScope;

  projectRoot?: string;

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
     * Cursor/Copilot/Grok scoped policy.
     * Undefined = both only inside an initialized ToolNet project,
     * otherwise global.
     */
    scope?: IntegrationScope;

    /**
     * Explicit target project for auto integration.
     */
    projectRoot?: string;

    /**
     * Deterministic cwd override for tests/embedders.
     */
    cwd?: string;

    /**
     * Optional deterministic detections for tests/embedders.
     * Normal CLI usage leaves this undefined.
     */
    detections?: AgentDetection[];

    /**
     * Optional Kiro path overrides for tests/custom deployments.
     */
    kiro?: Omit<InstallKiroIntegrationOptions, 'binary'>;

    cursor?: Omit<InstallCursorIntegrationOptions, 'binary'>;

    copilot?: Omit<InstallCopilotIntegrationOptions, 'binary'>;

    grok?: Omit<InstallGrokIntegrationOptions, 'binary'>;

    toolnetCli?: Omit<InstallToolNetCliIntegrationOptions, 'binary'>;

    kilo?: Omit<InstallKiloIntegrationOptions, 'binary'>;

    goose?: Omit<GooseInstallOptions, 'binary'>;

    qwen?: Omit<QwenInstallOptions, 'binary'>;

    kimi?: Omit<KimiInstallOptions, 'binary'>;

    hermes?: Omit<HermesInstallOptions, 'binary'>;

    qoder?: Omit<QoderInstallOptions, 'binary'>;

    aider?: Omit<AiderInstallOptions, 'binary'>;

    plandex?: Omit<PlandexInstallOptions, 'binary'>;

    openrouter?: Omit<OpenRouterInstallOptions, 'binary'>;
  } = {}
): AutoIntegrationResult[] {
  const binary = options.binary ?? process.env.TOOLNET_MEMORY_BIN ?? 'toolnet-memory';

  const results: AutoIntegrationResult[] = [];

  const detections = options.detections ?? detectAutoIntegrations();

  const detected = new Map(detections.map((item) => [item.agent, item.detected]));

  const scopedPolicy: AutoIntegrationScopeResolution = resolveAutoIntegrationScope({
    scope: options.scope,
    projectRoot: options.projectRoot,
    cwd: options.cwd,
  });

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
        const pluginFiles = installOpenCodePlugin({
          binary,
        });

        const mcp = installOpenCodeMcp({
          binary,
        });

        results.push({
          agent: 'opencode',

          detected: true,

          installed: true,

          targets: [...pluginFiles, mcp.configFile, `mcp:${mcp.serverName}`],
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
   * Cursor CLI
   */
  {
    const isDetected = options.force === true || detected.get('cursor') === true;

    if (!isDetected) {
      results.push({
        agent: 'cursor',
        detected: false,
        installed: false,
        targets: [],
      });
    } else {
      try {
        const cursorOptions = options.cursor ?? {};

        const cursor = installCursorIntegration({
          ...cursorOptions,
          binary,
          scope: cursorOptions.scope ?? scopedPolicy.scope,
          projectRoot: cursorOptions.projectRoot ?? scopedPolicy.project?.root,
        });

        results.push({
          agent: 'cursor',
          detected: true,
          installed: true,
          scope: cursor.scope,
          projectRoot: cursor.project?.root,
          targets: [...cursor.files, `mcp:${cursor.mcp.serverName}`],
        });
      } catch (error) {
        results.push({
          agent: 'cursor',
          detected: true,
          installed: false,
          targets: [],
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /*
   * GitHub Copilot CLI
   */
  {
    const isDetected = options.force === true || detected.get('copilot') === true;

    if (!isDetected) {
      results.push({
        agent: 'copilot',
        detected: false,
        installed: false,
        targets: [],
      });
    } else {
      try {
        const copilotOptions = options.copilot ?? {};

        const copilot = installCopilotIntegration({
          ...copilotOptions,
          binary,
          scope: copilotOptions.scope ?? scopedPolicy.scope,
          projectRoot: copilotOptions.projectRoot ?? scopedPolicy.project?.root,
        });

        results.push({
          agent: 'copilot',
          detected: true,
          installed: true,
          scope: copilot.scope,
          projectRoot: copilot.project?.root,
          targets: [...copilot.files, `mcp:${copilot.mcp.serverName}`],
        });
      } catch (error) {
        results.push({
          agent: 'copilot',
          detected: true,
          installed: false,
          targets: [],
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /*
   * Grok Build
   */
  {
    const isDetected = options.force === true || detected.get('grok') === true;

    if (!isDetected) {
      results.push({
        agent: 'grok',
        detected: false,
        installed: false,
        targets: [],
      });
    } else {
      try {
        const grokOptions = options.grok ?? {};

        const grok = installGrokIntegration({
          ...grokOptions,
          binary,
          scope: grokOptions.scope ?? scopedPolicy.scope,
          projectRoot: grokOptions.projectRoot ?? scopedPolicy.project?.root,
        });

        results.push({
          agent: 'grok',
          detected: true,
          installed: true,
          scope: grok.scope,
          projectRoot: grok.project?.root,
          targets: [...grok.files, `mcp:${grok.mcp.serverName}`],
        });
      } catch (error) {
        results.push({
          agent: 'grok',
          detected: true,
          installed: false,
          targets: [],
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /*
   * ToolNet CLI
   */
  {
    const isDetected = options.force === true || detected.get('toolnet-cli') === true;

    if (!isDetected) {
      results.push({
        agent: 'toolnet-cli',

        detected: false,

        installed: false,

        targets: [],
      });
    } else {
      try {
        const toolnetCliOptions = options.toolnetCli ?? {};

        const toolnetCli = installToolNetCliIntegration({
          ...toolnetCliOptions,

          binary,
        });

        results.push({
          agent: 'toolnet-cli',

          detected: true,

          installed: true,

          targets: [toolnetCli.mcp.configFile],
        });
      } catch (error) {
        results.push({
          agent: 'toolnet-cli',

          detected: true,

          installed: false,

          targets: [],

          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /*
   * Kilo
   */
  {
    const isDetected = options.force === true || detected.get('kilo') === true;

    if (!isDetected) {
      results.push({
        agent: 'kilo',

        detected: false,

        installed: false,

        targets: [],
      });
    } else {
      try {
        const kiloOptions = options.kilo ?? {};

        const kilo = installKiloIntegration({
          ...kiloOptions,

          binary,
        });

        results.push({
          agent: 'kilo',

          detected: true,

          installed: true,

          targets: [kilo.mcp.configFile],
        });
      } catch (error) {
        results.push({
          agent: 'kilo',

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

        const stopHook = installCodexStopHook({
          binary,
        });

        const mcp = installCodexMcp({
          binary,
        });

        if (!mcp.installed) {
          throw new Error(mcp.error ?? 'Codex MCP registration failed');
        }

        const targets = [notify.configFile, context, stopHook.hooksFile, `mcp:${mcp.serverName}`];

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

  /*
   * goose
   */
  {
    const isDetected = options.force === true || detected.get('goose') === true;

    if (!isDetected) {
      results.push({
        agent: 'goose',
        detected: false,
        installed: false,
        targets: [],
      });
    } else {
      try {
        const gooseOptions = options.goose ?? {};

        const goose = installGooseIntegration({
          ...gooseOptions,
          binary,
        });

        results.push({
          agent: 'goose',
          detected: true,
          installed: true,
          targets: [goose.hooksFile],
        });
      } catch (error) {
        results.push({
          agent: 'goose',
          detected: true,
          installed: false,
          targets: [],
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /*
   * Qwen Code
   */
  {
    const isDetected = options.force === true || detected.get('qwen') === true;

    if (!isDetected) {
      results.push({
        agent: 'qwen',
        detected: false,
        installed: false,
        targets: [],
      });
    } else {
      try {
        const qwenOptions = options.qwen ?? {};

        const qwen = installQwenIntegration({
          ...qwenOptions,
          binary,
        });

        results.push({
          agent: 'qwen',
          detected: true,
          installed: true,
          targets: [qwen.hooksFile],
        });
      } catch (error) {
        results.push({
          agent: 'qwen',
          detected: true,
          installed: false,
          targets: [],
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /*
   * Kimi Code CLI
   */
  {
    const isDetected = options.force === true || detected.get('kimi') === true;

    if (!isDetected) {
      results.push({
        agent: 'kimi',
        detected: false,
        installed: false,
        targets: [],
      });
    } else {
      try {
        const kimiOptions = options.kimi ?? {};

        const kimi = installKimiIntegration({
          ...kimiOptions,
          binary,
        });

        results.push({
          agent: 'kimi',
          detected: true,
          installed: true,
          targets: [kimi.configFile],
        });
      } catch (error) {
        results.push({
          agent: 'kimi',
          detected: true,
          installed: false,
          targets: [],
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /*
   * Hermes Agent
   */
  {
    const isDetected = options.force === true || detected.get('hermes') === true;

    if (!isDetected) {
      results.push({
        agent: 'hermes',
        detected: false,
        installed: false,
        targets: [],
      });
    } else {
      try {
        const hermesOptions = options.hermes ?? {};

        const hermes = installHermesIntegration({
          ...hermesOptions,
          binary,
        });

        results.push({
          agent: 'hermes',
          detected: true,
          installed: true,
          targets: [hermes.configFile],
        });
      } catch (error) {
        results.push({
          agent: 'hermes',
          detected: true,
          installed: false,
          targets: [],
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /*
   * Qoder CLI
   */
  {
    const isDetected = options.force === true || detected.get('qoder') === true;

    if (!isDetected) {
      results.push({
        agent: 'qoder',
        detected: false,
        installed: false,
        targets: [],
      });
    } else {
      try {
        const qoderOptions = options.qoder ?? {};

        const qoder = installQoderIntegration({
          ...qoderOptions,
          binary,
        });

        results.push({
          agent: 'qoder',
          detected: true,
          installed: true,
          targets: [qoder.settingsFile],
        });
      } catch (error) {
        results.push({
          agent: 'qoder',
          detected: true,
          installed: false,
          targets: [],
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /*
   * Aider
   */
  {
    const isDetected = options.force === true || detected.get('aider') === true;

    if (!isDetected) {
      results.push({
        agent: 'aider',
        detected: false,
        installed: false,
        targets: [],
      });
    } else {
      try {
        const aiderOptions = options.aider ?? {};

        const aider = installAiderIntegration({
          ...aiderOptions,
          binary,
        });

        results.push({
          agent: 'aider',
          detected: true,
          installed: true,
          targets: [aider.launcherPath],
        });
      } catch (error) {
        results.push({
          agent: 'aider',
          detected: true,
          installed: false,
          targets: [],
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /*
   * Plandex
   */
  {
    const isDetected = options.force === true || detected.get('plandex') === true;

    if (!isDetected) {
      results.push({
        agent: 'plandex',
        detected: false,
        installed: false,
        targets: [],
      });
    } else {
      try {
        const plandexOptions = options.plandex ?? {};

        const plandex = installPlandexIntegration({
          ...plandexOptions,
          binary,
        });

        results.push({
          agent: 'plandex',
          detected: true,
          installed: true,
          targets: [plandex.configPath],
        });
      } catch (error) {
        results.push({
          agent: 'plandex',
          detected: true,
          installed: false,
          targets: [],
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /*
   * OpenRouter CLI
   */
  {
    const isDetected = options.force === true || detected.get('openrouter') === true;

    if (!isDetected) {
      results.push({
        agent: 'openrouter',
        detected: false,
        installed: false,
        targets: [],
      });
    } else {
      try {
        const openrouterOptions = options.openrouter ?? {};

        const openrouter = installOpenRouterIntegration({
          ...openrouterOptions,
          binary,
        });

        results.push({
          agent: 'openrouter',
          detected: true,
          installed: true,
          targets: [openrouter.configPath],
        });
      } catch (error) {
        results.push({
          agent: 'openrouter',
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

export function integrationDisplayName(agent: AgentIntegrationId): string {
  switch (agent) {
    case 'agy':
      return 'Agy / Antigravity';

    case 'opencode':
      return 'OpenCode';

    case 'claude':
      return 'Claude Code';

    case 'kiro':
      return 'Kiro CLI';

    case 'cursor':
      return 'Cursor CLI';

    case 'copilot':
      return 'GitHub Copilot CLI';

    case 'grok':
      return 'Grok Build';

    case 'toolnet-cli':
      return 'ToolNet CLI';

    case 'kilo':
      return 'Kilo';

    case 'codex':
      return 'Codex';

    case 'goose':
      return 'goose';

    case 'qwen':
      return 'Qwen Code';

    case 'kimi':
      return 'Kimi Code CLI';

    case 'hermes':
      return 'Hermes Agent';

    case 'qoder':
      return 'Qoder CLI';

    case 'aider':
      return 'Aider';

    case 'plandex':
      return 'Plandex';

    case 'openrouter':
      return 'OpenRouter CLI';

    default:
      return agent;
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

const HOOK_CAPTURE_AGENTS: readonly AgentIntegrationId[] = [
  'claude',
  'cursor',
  'copilot',
  'grok',
  'kiro',
  'opencode',
  'codex',
  'agy',
];

const MANUAL_SYNC_COMMAND: Partial<Record<AgentIntegrationId, string>> = {
  opencode: 'toolnet-memory session:opencode-sync',
  codex: 'toolnet-memory session:codex-sync',
  agy: 'toolnet-memory session:agy-sync',
  'toolnet-cli': 'toolnet-memory session:toolnet-cli-sync',
};

/**
 * Installation success is not runtime proof. State exactly what was written
 * and, for manual-sync agents, the command that actually starts capture.
 */
function integrationInstallMessage(agent: AgentIntegrationId): string {
  if (HOOK_CAPTURE_AGENTS.includes(agent)) {
    return 'ToolNet integration configured; hooks installed successfully';
  }

  const command = MANUAL_SYNC_COMMAND[agent];

  if (command) {
    return `ToolNet integration configured; run ${command} to capture session history`;
  }

  return 'ToolNet integration configured; capture begins when a supported hook or sync runs';
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
      const scope = result.scope ? ` [scope=${result.scope}]` : '';

      console.log(`✓ ${name}: ${integrationInstallMessage(result.agent)}${scope}`);

      if (result.projectRoot) {
        console.log(`  project: ${result.projectRoot}`);
      }

      continue;
    }

    console.log(`✗ ${name}: integration failed`);

    if (result.error) {
      console.log(`  ${result.error}`);
    }
  }

  console.log('');
}

function valueAfter(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);

  return index >= 0 ? args[index + 1] : undefined;
}

function explicitIntegrationScope(args: string[]): IntegrationScope | undefined {
  const hasExplicitScope =
    args.includes('--scope') || args.includes('--global') || args.includes('--both');

  return hasExplicitScope ? parseIntegrationScope(args) : undefined;
}

async function main() {
  const args = process.argv.slice(2);

  const force = args.includes('--all');

  const json = args.includes('--json');

  const detectOnly = args.includes('--detect-only');

  const scope = explicitIntegrationScope(args);

  const projectRoot = valueAfter(args, '--project');

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
    scope,
    projectRoot,
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
