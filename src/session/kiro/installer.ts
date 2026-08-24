import { installKiroHooks } from './hook-installer.js';

import { installKiroMcp } from './mcp-installer.js';

export interface InstallKiroIntegrationOptions {
  binary?: string;

  configFile?: string;

  hooksFile?: string;
}

export function installKiroIntegration(options: InstallKiroIntegrationOptions = {}) {
  const binary = options.binary ?? process.env.TOOLNET_MEMORY_BIN ?? 'toolnet-memory';

  const mcp = installKiroMcp({
    binary,

    configFile: options.configFile,
  });

  const hooks = installKiroHooks({
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
