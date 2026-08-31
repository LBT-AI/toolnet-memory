import { homedir } from 'node:os';

import { join } from 'node:path';

export interface KiloConfigPathOptions {
  home?: string;

  kiloHome?: string;
}

/**
 * Resolve Kilo home directory.
 *
 * Priority:
 * 1. Explicit kiloHome option (tests/callers)
 * 2. KILO_HOME environment override
 * 3. ~/.kilo (similar to Kiro)
 */
export function kiloHomeDirectory(options: KiloConfigPathOptions = {}): string {
  return options.kiloHome ?? process.env.KILO_HOME ?? join(options.home ?? homedir(), '.kilo');
}

export function kiloConfigFile(options: KiloConfigPathOptions = {}): string {
  return join(kiloHomeDirectory(options), 'kilo.jsonc');
}

export function kiloMcpConfigFile(options: KiloConfigPathOptions = {}): string {
  return join(kiloHomeDirectory(options), 'mcp.json');
}

export function kiloSettingsFile(options: KiloConfigPathOptions = {}): string {
  return join(kiloHomeDirectory(options), 'settings.json');
}

/**
 * Detection paths for Kilo CLI.
 * Looks for:
 * - Kilo config directory (~/.kilo)
 * - MCP config file
 */
export function kiloDetectionPaths(options: KiloConfigPathOptions = {}): string[] {
  const home = kiloHomeDirectory(options);

  return [home, kiloMcpConfigFile(options), kiloConfigFile(options)];
}
