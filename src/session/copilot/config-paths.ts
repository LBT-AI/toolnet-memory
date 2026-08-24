import { homedir } from 'node:os';

import { join, resolve } from 'node:path';

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

export function copilotProjectGithubDirectory(projectRoot: string): string {
  return join(resolve(projectRoot), '.github');
}

/**
 * ToolNet uses .github/mcp.json as the canonical project MCP location.
 * Copilot also supports repository .mcp.json; ToolNet leaves that file
 * untouched and reports conflicts separately.
 */
export function copilotProjectMcpConfigFile(projectRoot: string): string {
  return join(copilotProjectGithubDirectory(projectRoot), 'mcp.json');
}

export function copilotAlternateProjectMcpConfigFile(projectRoot: string): string {
  return join(resolve(projectRoot), '.mcp.json');
}

export function copilotProjectHooksDirectory(projectRoot: string): string {
  return join(copilotProjectGithubDirectory(projectRoot), 'hooks');
}

export function copilotProjectToolnetHookFile(projectRoot: string): string {
  return join(copilotProjectHooksDirectory(projectRoot), 'toolnet-memory.json');
}

export function copilotProjectInstructionsDirectory(projectRoot: string): string {
  return join(copilotProjectGithubDirectory(projectRoot), 'instructions');
}

export function copilotToolnetProjectInstructionFile(projectRoot: string): string {
  return join(copilotProjectInstructionsDirectory(projectRoot), 'toolnet-memory.instructions.md');
}

export function copilotDetectionPaths(options: CopilotConfigPathOptions = {}): string[] {
  return [copilotHomeDirectory(options)];
}
