import { homedir } from 'node:os';
import { join } from 'node:path';

export interface CursorConfigPathOptions {
  home?: string;

  cursorHome?: string;

  cursorConfigDir?: string;

  xdgConfigHome?: string;
}

/**
 * Cursor's user-level directory used by MCP and hooks.
 *
 * Cursor documents:
 *   ~/.cursor/hooks.json
 * and shares MCP configuration between editor and CLI.
 *
 * cursorHome is intentionally an explicit ToolNet override for tests/callers;
 * Cursor itself documents CURSOR_CONFIG_DIR for CLI configuration.
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

/**
 * Detect global Cursor state only.
 *
 * Project-level .cursor/ detection belongs to later integration phases.
 */
export function cursorDetectionPaths(options: CursorConfigPathOptions = {}): string[] {
  return Array.from(new Set([cursorHomeDirectory(options), cursorCliConfigDirectory(options)]));
}
