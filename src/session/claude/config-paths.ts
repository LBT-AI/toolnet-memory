import { homedir } from 'node:os';

import { join } from 'node:path';

export interface ClaudeConfigPathOptions {
  home?: string;
}

export function claudeConfigDirectory(options: ClaudeConfigPathOptions = {}): string {
  return join(options.home ?? homedir(), '.claude');
}

export function claudeSettingsFile(options: ClaudeConfigPathOptions = {}): string {
  return join(claudeConfigDirectory(options), 'settings.json');
}

/**
 * Claude Code stores user-scoped MCP configuration
 * in ~/.claude.json.
 */
export function claudeStateFile(options: ClaudeConfigPathOptions = {}): string {
  return join(options.home ?? homedir(), '.claude.json');
}
