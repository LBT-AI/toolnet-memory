import { existsSync } from 'node:fs';

import { homedir } from 'node:os';

import { join } from 'node:path';

import { spawnSync } from 'node:child_process';

import { agyDetectionPaths } from '../session/agy/config-paths.js';

import { openCodeConfigDirectory } from '../session/opencode/config-paths.js';

import { claudeConfigDirectory } from '../session/claude/config-paths.js';

import { kiroDetectionPaths } from '../session/kiro/config-paths.js';
import { cursorDetectionPaths } from '../session/cursor/config-paths.js';
import { copilotDetectionPaths } from '../session/copilot/config-paths.js';
import { grokDetectionPaths } from '../session/grok/config-paths.js';

export type AgentIntegrationId =
  'agy' | 'opencode' | 'codex' | 'claude' | 'kiro' | 'cursor' | 'copilot' | 'grok';

export interface AgentDetection {
  agent: AgentIntegrationId;

  detected: boolean;

  commandDetected: boolean;

  configDetected: boolean;

  evidence: string[];
}

export interface DetectAgentIntegrationOptions {
  home?: string;

  codexHome?: string;

  kiroHome?: string;

  cursorHome?: string;

  cursorConfigDir?: string;

  copilotHome?: string;

  grokHome?: string;

  xdgConfigHome?: string;

  commandExists?: (command: string) => boolean;
}

function systemCommandExists(command: string): boolean {
  const result = spawnSync('sh', ['-lc', `command -v ${JSON.stringify(command)} >/dev/null 2>&1`], {
    stdio: 'ignore',
  });

  return result.status === 0;
}

function detectOne(options: {
  agent: AgentIntegrationId;

  command: string;

  configPaths: string[];

  commandExists: (command: string) => boolean;
}): AgentDetection {
  const commandDetected = options.commandExists(options.command);

  const existingConfigs = options.configPaths.filter((path) => existsSync(path));

  const configDetected = existingConfigs.length > 0;

  const evidence: string[] = [];

  if (commandDetected) {
    evidence.push(`command:${options.command}`);
  }

  for (const path of existingConfigs) {
    evidence.push(`config:${path}`);
  }

  return {
    agent: options.agent,

    detected: commandDetected || configDetected,

    commandDetected,

    configDetected,

    evidence,
  };
}

export function detectAgentIntegrations(
  options: DetectAgentIntegrationOptions = {}
): AgentDetection[] {
  const home = options.home ?? homedir();

  const commandExists = options.commandExists ?? systemCommandExists;

  const codexHome = options.codexHome ?? process.env.CODEX_HOME ?? join(home, '.codex');

  return [
    detectOne({
      agent: 'agy',

      command: 'agy',

      commandExists,

      configPaths: agyDetectionPaths({
        home,
      }),
    }),

    detectOne({
      agent: 'opencode',

      command: 'opencode',

      commandExists,

      configPaths: [
        openCodeConfigDirectory({
          home,

          xdgConfigHome: options.xdgConfigHome,
        }),
      ],
    }),

    detectOne({
      agent: 'claude',

      command: 'claude',

      commandExists,

      configPaths: [
        claudeConfigDirectory({
          home,
        }),
      ],
    }),

    detectOne({
      agent: 'kiro',

      command: 'kiro-cli',

      commandExists,

      configPaths: kiroDetectionPaths({
        home,

        kiroHome: options.kiroHome,
      }),
    }),

    detectOne({
      agent: 'cursor',

      command: 'agent',

      commandExists,

      configPaths: cursorDetectionPaths({
        home,

        cursorHome: options.cursorHome,

        cursorConfigDir: options.cursorConfigDir,

        xdgConfigHome: options.xdgConfigHome,
      }),
    }),

    detectOne({
      agent: 'copilot',

      command: 'copilot',

      commandExists,

      configPaths: copilotDetectionPaths({
        home,

        copilotHome: options.copilotHome,
      }),
    }),

    detectOne({
      agent: 'grok',

      command: 'grok',

      commandExists,

      configPaths: grokDetectionPaths({
        home,

        grokHome: options.grokHome,
      }),
    }),

    detectOne({
      agent: 'codex',

      command: 'codex',

      commandExists,

      configPaths: [codexHome],
    }),
  ];
}
