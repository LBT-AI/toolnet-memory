import { homedir } from 'node:os';
import { join } from 'node:path';

export interface CopilotConfigPathOptions {
  home?: string;

  copilotHome?: string;
}

/**
 * Resolve GitHub Copilot CLI home.
 *
 * Priority:
 * 1. Explicit copilotHome option
 * 2. COPILOT_HOME
 * 3. ~/.copilot
 */
export function copilotHomeDirectory(options: CopilotConfigPathOptions = {}): string {
  return (
    options.copilotHome ?? process.env.COPILOT_HOME ?? join(options.home ?? homedir(), '.copilot')
  );
}

export function copilotMcpConfigFile(options: CopilotConfigPathOptions = {}): string {
  return join(copilotHomeDirectory(options), 'mcp-config.json');
}

export function copilotHooksDirectory(options: CopilotConfigPathOptions = {}): string {
  return join(copilotHomeDirectory(options), 'hooks');
}

export function copilotToolnetHookFile(options: CopilotConfigPathOptions = {}): string {
  return join(copilotHooksDirectory(options), 'toolnet-memory.json');
}

/**
 * Phase 01 only detects global Copilot CLI state.
 */
export function copilotDetectionPaths(options: CopilotConfigPathOptions = {}): string[] {
  return [copilotHomeDirectory(options)];
}
