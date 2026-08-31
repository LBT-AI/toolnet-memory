import { homedir } from 'node:os';

import { join } from 'node:path';

export interface ToolNetCliConfigPathOptions {
  home?: string;

  xdgConfigHome?: string;
}

/**
 * Resolve ToolNet CLI config directory.
 *
 * Priority:
 * 1. XDG_CONFIG_HOME if set
 * 2. ~/.config/toolnet-memory
 */
export function toolnetCliConfigDirectory(options: ToolNetCliConfigPathOptions = {}): string {
  const home = options.home ?? homedir();

  const xdgConfig = options.xdgConfigHome ?? process.env.XDG_CONFIG_HOME;

  if (xdgConfig) {
    return join(xdgConfig, 'toolnet-memory');
  }

  return join(home, '.config', 'toolnet-memory');
}

export function toolnetCliEnvFile(options: ToolNetCliConfigPathOptions = {}): string {
  return join(toolnetCliConfigDirectory(options), '.env');
}

export function toolnetCliMcpConfigFile(options: ToolNetCliConfigPathOptions = {}): string {
  return join(toolnetCliConfigDirectory(options), 'mcp.json');
}

/**
 * Detection paths for ToolNet CLI.
 * Looks for:
 * - Config directory existence
 * - MCP config file
 */
export function toolnetCliDetectionPaths(options: ToolNetCliConfigPathOptions = {}): string[] {
  const dir = toolnetCliConfigDirectory(options);

  return [dir, toolnetCliMcpConfigFile(options)];
}
