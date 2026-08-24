import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

export interface CursorConfigPathOptions {
  home?: string;

  cursorHome?: string;

  cursorConfigDir?: string;

  xdgConfigHome?: string;
}

/**
 * Cursor's user-level directory used by MCP and hooks.
 */
export function cursorHomeDirectory(options: CursorConfigPathOptions = {}): string {
  return options.cursorHome ?? join(options.home ?? homedir(), '.cursor');
}

/**
 * Resolve the Cursor CLI configuration directory.
 *
 * Priority:
 * 1. Explicit cursorConfigDir option
 * 2. CURSOR_CONFIG_DIR
 * 3. XDG_CONFIG_HOME/cursor
 * 4. ~/.cursor
 */
export function cursorCliConfigDirectory(options: CursorConfigPathOptions = {}): string {
  const configured =
    options.cursorConfigDir ??
    process.env.CURSOR_CONFIG_DIR ??
    ((options.xdgConfigHome ?? process.env.XDG_CONFIG_HOME)
      ? join(options.xdgConfigHome ?? process.env.XDG_CONFIG_HOME!, 'cursor')
      : undefined);

  return configured ?? cursorHomeDirectory(options);
}

export function cursorCliConfigFile(options: CursorConfigPathOptions = {}): string {
  return join(cursorCliConfigDirectory(options), 'cli-config.json');
}

export function cursorMcpConfigFile(options: CursorConfigPathOptions = {}): string {
  return join(cursorHomeDirectory(options), 'mcp.json');
}

export function cursorHooksFile(options: CursorConfigPathOptions = {}): string {
  return join(cursorHomeDirectory(options), 'hooks.json');
}

export function cursorHooksDirectory(options: CursorConfigPathOptions = {}): string {
  return join(cursorHomeDirectory(options), 'hooks');
}

export function cursorProjectDirectory(projectRoot: string): string {
  return join(resolve(projectRoot), '.cursor');
}

export function cursorProjectMcpConfigFile(projectRoot: string): string {
  return join(cursorProjectDirectory(projectRoot), 'mcp.json');
}

export function cursorProjectHooksFile(projectRoot: string): string {
  return join(cursorProjectDirectory(projectRoot), 'hooks.json');
}

export function cursorProjectRulesDirectory(projectRoot: string): string {
  return join(cursorProjectDirectory(projectRoot), 'rules');
}

export function cursorToolnetProjectRuleFile(projectRoot: string): string {
  return join(cursorProjectRulesDirectory(projectRoot), 'toolnet-memory.mdc');
}

export function cursorDetectionPaths(options: CursorConfigPathOptions = {}): string[] {
  return Array.from(new Set([cursorHomeDirectory(options), cursorCliConfigDirectory(options)]));
}
