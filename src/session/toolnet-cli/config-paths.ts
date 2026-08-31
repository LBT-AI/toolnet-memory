import { homedir } from 'node:os';

import { join } from 'node:path';

export interface ToolNetCliConfigPathOptions {
  home?: string;

  xdgConfigHome?: string;

  cwd?: string;
}

/**
 * Resolve ToolNet CLI config directory.
 *
 * Based on audit of LBT-AI/Toolnet-CLI:
 * - Config dir: ~/.toolnetcli/
 * - Config file: ~/.toolnetcli/config.json
 * - Project permissions: .toolnet/permissions.json
 */
export function toolnetCliHomeDirectory(options: ToolNetCliConfigPathOptions = {}): string {
  return join(options.home ?? homedir(), '.toolnetcli');
}

export function toolnetCliConfigFile(options: ToolNetCliConfigPathOptions = {}): string {
  return join(toolnetCliHomeDirectory(options), 'config.json');
}

/**
 * Resolve ToolNet CLI project-level MCP config.
 *
 * ToolNet CLI reads MCP config from .toolnet/mcp.json in the project root.
 */
export function toolnetCliProjectMcpConfigFile(options: ToolNetCliConfigPathOptions = {}): string {
  const cwd = options.cwd ?? process.cwd();
  return join(cwd, '.toolnet', 'mcp.json');
}

/**
 * Detection paths for ToolNet CLI.
 *
 * Looks for:
 * - ~/.toolnetcli/ config directory
 * - ~/.toolnetcli/config.json
 */
export function toolnetCliDetectionPaths(options: ToolNetCliConfigPathOptions = {}): string[] {
  const home = toolnetCliHomeDirectory(options);
  const configFile = toolnetCliConfigFile(options);

  return [home, configFile];
}
