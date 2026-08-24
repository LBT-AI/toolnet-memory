import { installCopilotHooks } from './hook-installer.js';
import { installCopilotMcp } from './mcp-installer.js';

export interface InstallCopilotIntegrationOptions {
  binary?: string;
  configFile?: string;
  hooksFile?: string;
}

export function installCopilotIntegration(options: InstallCopilotIntegrationOptions = {}) {
  const binary = options.binary ?? process.env.TOOLNET_MEMORY_BIN ?? 'toolnet-memory';

  const mcp = installCopilotMcp({
    binary,
    configFile: options.configFile,
  });

  const hooks = installCopilotHooks({
    binary,
    hooksFile: options.hooksFile,
  });

  return {
    installed: mcp.installed,
    changed: mcp.changed || hooks.changed,
    mcp,
    hooks,
    files: [mcp.configFile, hooks.hooksFile],
  };
}
