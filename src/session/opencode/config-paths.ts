import { homedir } from 'node:os';

import { join } from 'node:path';

export interface OpenCodeConfigPathOptions {
  home?: string;

  xdgConfigHome?: string;

  cwd?: string;
}

/**
 * Resolve OpenCode config directory.
 *
 * Priority:
 * 1. OPENCODE_CONFIG_DIR env var (for plugins/agents/commands)
 * 2. XDG_CONFIG_HOME/opencode
 * 3. ~/.config/opencode
 *
 * Note: OPENCODE_CONFIG_DIR is for plugins, agents, commands, modes.
 * MCP config targets are separate (see openCodeGlobalConfigFile).
 */
export function openCodeConfigDirectory(options: OpenCodeConfigPathOptions = {}): string {
  const envDir = process.env.OPENCODE_CONFIG_DIR?.trim();

  if (envDir) {
    return envDir;
  }

  const xdg = options.xdgConfigHome ?? process.env.XDG_CONFIG_HOME?.trim();

  if (xdg) {
    return join(xdg, 'opencode');
  }

  return join(options.home ?? homedir(), '.config', 'opencode');
}

/**
 * Resolve global opencode.json config file for MCP.
 *
 * MCP targets (in order):
 * 1. OPENCODE_CONFIG env var (explicit custom config file)
 * 2. ~/.config/opencode/opencode.json (global)
 * 3. <project>/opencode.json (project)
 *
 * OPENCODE_CONFIG_DIR is NOT used for MCP config resolution.
 * It's only for plugins/agents/commands/modes.
 */
export function openCodeGlobalConfigFile(options: OpenCodeConfigPathOptions = {}): string {
  const envConfig = process.env.OPENCODE_CONFIG?.trim();

  if (envConfig) {
    return envConfig;
  }

  // Use standard ~/.config/opencode/opencode.json, not OPENCODE_CONFIG_DIR
  const home = options.home ?? homedir();
  const xdg = options.xdgConfigHome ?? process.env.XDG_CONFIG_HOME?.trim();

  if (xdg) {
    return join(xdg, 'opencode', 'opencode.json');
  }

  return join(home, '.config', 'opencode', 'opencode.json');
}

/**
 * Resolve project-level opencode.json config file.
 */
export function openCodeProjectConfigFile(options: OpenCodeConfigPathOptions = {}): string {
  const cwd = options.cwd ?? process.cwd();
  return join(cwd, 'opencode.json');
}

/**
 * Resolve plugin directory.
 *
 * Official: OPENCODE_CONFIG_DIR/plugins/ or ~/.config/opencode/plugins/
 */
export function openCodePluginDirectory(options: OpenCodeConfigPathOptions = {}): string {
  return join(openCodeConfigDirectory(options), 'plugins');
}

/**
 * Resolve global AGENTS.md rules file.
 *
 * Official: ~/.config/opencode/AGENTS.md
 */
export function openCodeGlobalAgentsFile(options: OpenCodeConfigPathOptions = {}): string {
  return join(openCodeConfigDirectory(options), 'AGENTS.md');
}

/**
 * Resolve project AGENTS.md rules file.
 *
 * Official: <project>/AGENTS.md
 */
export function openCodeProjectAgentsFile(options: OpenCodeConfigPathOptions = {}): string {
  const cwd = options.cwd ?? process.cwd();
  return join(cwd, 'AGENTS.md');
}

/**
 * Detection paths for OpenCode.
 *
 * Looks for:
 * - Global config directory
 * - Global config file
 * - Project config file
 */
export function openCodeDetectionPaths(options: OpenCodeConfigPathOptions = {}): string[] {
  return [
    openCodeConfigDirectory(options),
    openCodeGlobalConfigFile(options),
    openCodeProjectConfigFile(options),
  ];
}
