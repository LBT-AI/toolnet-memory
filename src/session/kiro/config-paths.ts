import { homedir } from 'node:os';

import { join } from 'node:path';

export interface KiroConfigPathOptions {
  home?: string;

  kiroHome?: string;

  cwd?: string;
}

/**
 * Resolve the Kiro home directory.
 *
 * Priority:
 * 1. Explicit kiroHome option (tests/callers)
 * 2. KIRO_HOME environment override
 * 3. ~/.kiro
 */
export function kiroHomeDirectory(options: KiroConfigPathOptions = {}): string {
  return options.kiroHome ?? process.env.KIRO_HOME ?? join(options.home ?? homedir(), '.kiro');
}

export function kiroSettingsDirectory(options: KiroConfigPathOptions = {}): string {
  return join(kiroHomeDirectory(options), 'settings');
}

export function kiroCliSettingsFile(options: KiroConfigPathOptions = {}): string {
  return join(kiroSettingsDirectory(options), 'cli.json');
}

/**
 * Global MCP config: ~/.kiro/settings/mcp.json
 */
export function kiroMcpConfigFile(options: KiroConfigPathOptions = {}): string {
  return join(kiroSettingsDirectory(options), 'mcp.json');
}

/**
 * Project MCP config: <project>/.kiro/settings/mcp.json
 */
export function kiroProjectMcpConfigFile(options: KiroConfigPathOptions = {}): string {
  const cwd = options.cwd ?? process.cwd();
  return join(cwd, '.kiro', 'settings', 'mcp.json');
}

export function kiroHooksDirectory(options: KiroConfigPathOptions = {}): string {
  return join(kiroHomeDirectory(options), 'hooks');
}

/**
 * Global hooks: ~/.kiro/hooks/toolnet-memory.json
 */
export function kiroGlobalHooksFile(options: KiroConfigPathOptions = {}): string {
  return join(kiroHooksDirectory(options), 'toolnet-memory.json');
}

/**
 * Project hooks: <project>/.kiro/hooks/toolnet-memory.json
 */
export function kiroProjectHooksFile(options: KiroConfigPathOptions = {}): string {
  const cwd = options.cwd ?? process.cwd();
  return join(cwd, '.kiro', 'hooks', 'toolnet-memory.json');
}

/**
 * Detection paths for Kiro CLI.
 *
 * Looks for:
 * - ~/.kiro/ (home directory)
 * - ~/.kiro/settings/mcp.json (global MCP)
 */
export function kiroDetectionPaths(options: KiroConfigPathOptions = {}): string[] {
  return [kiroHomeDirectory(options), kiroMcpConfigFile(options)];
}
