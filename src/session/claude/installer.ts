import { installClaudeHooks } from './hook-installer.js';

import { installClaudeMcp } from './mcp-installer.js';

export interface InstallClaudeIntegrationOptions {
  binary?: string;

  settingsFile?: string;

  stateFile?: string;

  /** Read-only repair preview: report intended changes without writing. */
  dryRun?: boolean;
}

export function installClaudeIntegration(options: InstallClaudeIntegrationOptions = {}) {
  const binary = options.binary ?? process.env.TOOLNET_MEMORY_BIN ?? 'toolnet-memory';

  const hooks = installClaudeHooks({
    binary,

    settingsFile: options.settingsFile,

    ...(options.dryRun !== undefined ? { dryRun: options.dryRun } : {}),
  });

  const mcp = installClaudeMcp({
    binary,

    stateFile: options.stateFile,

    ...(options.dryRun !== undefined ? { dryRun: options.dryRun } : {}),
  });

  return {
    hooks,

    mcp,

    files: [hooks.settingsFile, mcp.configFile],
  };
}
