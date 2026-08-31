import { homedir } from 'node:os';

import { join } from 'node:path';

export interface AgyConfigPathOptions {
  home?: string;

  cwd?: string;
}

/**
 * ~/.gemini/
 */
export function agyGeminiDirectory(options: AgyConfigPathOptions = {}): string {
  return join(options.home ?? homedir(), '.gemini');
}

/**
 * ~/.gemini/antigravity-cli/
 */
export function agyAntigravityDirectory(options: AgyConfigPathOptions = {}): string {
  return join(agyGeminiDirectory(options), 'antigravity-cli');
}

/**
 * ~/.gemini/antigravity-cli/settings.json
 */
export function agySettingsFile(options: AgyConfigPathOptions = {}): string {
  return join(agyAntigravityDirectory(options), 'settings.json');
}

/**
 * ~/.gemini/config/ (legacy Gemini config dir)
 */
export function agyLegacyConfigDirectory(options: AgyConfigPathOptions = {}): string {
  return join(agyGeminiDirectory(options), 'config');
}

/**
 * ~/.gemini/config/mcp_config.json (global MCP)
 */
export function agyGlobalMcpConfigFile(options: AgyConfigPathOptions = {}): string {
  return join(agyLegacyConfigDirectory(options), 'mcp_config.json');
}

/**
 * <project>/.agents/mcp_config.json (workspace MCP)
 */
export function agyWorkspaceMcpConfigFile(options: AgyConfigPathOptions = {}): string {
  const cwd = options.cwd ?? process.cwd();
  return join(cwd, '.agents', 'mcp_config.json');
}

/**
 * ~/.gemini/config/hooks.json (legacy hooks location)
 */
export function agyLegacyHooksFile(options: AgyConfigPathOptions = {}): string {
  return join(agyLegacyConfigDirectory(options), 'hooks.json');
}

/**
 * <project>/.agents/hooks.json (workspace hooks)
 */
export function agyWorkspaceHooksFile(options: AgyConfigPathOptions = {}): string {
  const cwd = options.cwd ?? process.cwd();
  return join(cwd, '.agents', 'hooks.json');
}

/**
 * ~/.gemini/antigravity-cli/plugins/<plugin_name>/
 */
export function agyPluginRoot(
  pluginName = 'toolnet-memory',
  options: AgyConfigPathOptions = {}
): string {
  return join(agyAntigravityDirectory(options), 'plugins', pluginName);
}

/**
 * Detection paths for AGY CLI.
 *
 * Official paths:
 * - ~/.gemini/antigravity-cli/ (config directory)
 * - ~/.gemini/config/mcp_config.json (global MCP)
 * - .agents/mcp_config.json (workspace MCP)
 */
export function agyDetectionPaths(options: AgyConfigPathOptions = {}): string[] {
  return [
    agyAntigravityDirectory(options),
    agyGlobalMcpConfigFile(options),
    agyLegacyConfigDirectory(options),
    agyWorkspaceMcpConfigFile(options),
  ];
}
