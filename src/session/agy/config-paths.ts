import { homedir } from 'node:os';

import { join } from 'node:path';

export interface AgyConfigPathOptions {
  home?: string;
}

export function agyGeminiDirectory(options: AgyConfigPathOptions = {}): string {
  return join(options.home ?? homedir(), '.gemini');
}

export function agyConfigDirectory(options: AgyConfigPathOptions = {}): string {
  return join(agyGeminiDirectory(options), 'config');
}

export function agyMcpConfigFile(options: AgyConfigPathOptions = {}): string {
  return join(agyConfigDirectory(options), 'mcp_config.json');
}

export function agyHooksFile(options: AgyConfigPathOptions = {}): string {
  return join(agyConfigDirectory(options), 'hooks.json');
}

export function agyAntigravityDirectory(options: AgyConfigPathOptions = {}): string {
  return join(agyGeminiDirectory(options), 'antigravity-cli');
}

export function agyPluginRoot(
  pluginName = 'toolnet-memory',
  options: AgyConfigPathOptions = {}
): string {
  return join(agyAntigravityDirectory(options), 'plugins', pluginName);
}

/**
 * Keep I3 detection semantics backward compatible:
 *
 * - native Antigravity CLI state
 * - legacy/global Gemini config used by older Agy integration
 */
export function agyDetectionPaths(options: AgyConfigPathOptions = {}): string[] {
  return [agyAntigravityDirectory(options), agyConfigDirectory(options)];
}
