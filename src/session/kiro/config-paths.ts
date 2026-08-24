import { homedir } from 'node:os';

import { join } from 'node:path';

export interface KiroConfigPathOptions {
  home?: string;

  kiroHome?: string;
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

export function kiroMcpConfigFile(options: KiroConfigPathOptions = {}): string {
  return join(kiroSettingsDirectory(options), 'mcp.json');
}

export function kiroHooksDirectory(options: KiroConfigPathOptions = {}): string {
  return join(kiroHomeDirectory(options), 'hooks');
}

export function kiroGlobalHooksFile(options: KiroConfigPathOptions = {}): string {
  return join(kiroHooksDirectory(options), 'toolnet-memory.json');
}

/**
 * Detection is intentionally based on Kiro's global home.
 *
 * Workspace-level .kiro/ detection belongs to project-scoped integration
 * logic in a later phase. Phase 01 only determines whether Kiro CLI is
 * installed/configured for the current user.
 */
export function kiroDetectionPaths(options: KiroConfigPathOptions = {}): string[] {
  return [kiroHomeDirectory(options)];
}
