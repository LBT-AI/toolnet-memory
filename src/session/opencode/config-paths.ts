import { homedir } from 'node:os';

import { join } from 'node:path';

export interface OpenCodeConfigPathOptions {
  home?: string;

  xdgConfigHome?: string;
}

/**
 * Resolve the same OpenCode configuration root everywhere.
 *
 * OpenCode follows XDG_CONFIG_HOME when configured.
 */
export function openCodeConfigDirectory(options: OpenCodeConfigPathOptions = {}): string {
  const xdg = options.xdgConfigHome ?? process.env.XDG_CONFIG_HOME?.trim();

  if (xdg) {
    return join(xdg, 'opencode');
  }

  return join(options.home ?? homedir(), '.config', 'opencode');
}

export function openCodeJsonConfigFile(options: OpenCodeConfigPathOptions = {}): string {
  return join(openCodeConfigDirectory(options), 'opencode.json');
}

export function openCodePluginDirectory(options: OpenCodeConfigPathOptions = {}): string {
  return join(openCodeConfigDirectory(options), 'plugins');
}

export function openCodeAgentsFile(options: OpenCodeConfigPathOptions = {}): string {
  return join(openCodeConfigDirectory(options), 'AGENTS.md');
}
