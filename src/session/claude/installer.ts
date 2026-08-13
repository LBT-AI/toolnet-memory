import { installClaudeHooks } from './hook-installer.js';

import { installClaudeMcp } from './mcp-installer.js';

export interface InstallClaudeIntegrationOptions {
  binary?: string;

  settingsFile?: string;

  stateFile?: string;
}

export function installClaudeIntegration(options: InstallClaudeIntegrationOptions = {}) {
  const binary = options.binary ?? process.env.TOOLNET_MEMORY_BIN ?? 'toolnet-memory';

  const hooks = installClaudeHooks({
    binary,

    settingsFile: options.settingsFile,
  });

  const mcp = installClaudeMcp({
    binary,

    stateFile: options.stateFile,
  });

  return {
    hooks,

    mcp,

    files: [hooks.settingsFile, mcp.configFile],
  };
}
