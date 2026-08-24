import { installCursorHooks } from './hook-installer.js';
import { installCursorMcp } from './mcp-installer.js';

export interface InstallCursorIntegrationOptions {
  binary?: string;
  configFile?: string;
  hooksFile?: string;
}

export function installCursorIntegration(options: InstallCursorIntegrationOptions = {}) {
  const binary = options.binary ?? process.env.TOOLNET_MEMORY_BIN ?? 'toolnet-memory';

  const mcp = installCursorMcp({
    binary,
    configFile: options.configFile,
  });

  const hooks = installCursorHooks({
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
