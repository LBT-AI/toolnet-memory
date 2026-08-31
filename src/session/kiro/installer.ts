import { installKiroHooks, type InstallKiroHooksOptions } from './hook-installer.js';

import { installKiroMcp, type InstallKiroMcpOptions } from './mcp-installer.js';

export interface InstallKiroIntegrationOptions {
  binary?: string;

  configFile?: string;

  hooksFile?: string;

  scope?: 'global' | 'project' | 'both';

  cwd?: string;

  force?: boolean;
}

export function installKiroIntegration(options: InstallKiroIntegrationOptions = {}) {
  const binary = options.binary ?? process.env.TOOLNET_MEMORY_BIN ?? 'toolnet-memory';

  const mcp = installKiroMcp({
    binary,
    configFile: options.configFile,
    scope: options.scope,
    cwd: options.cwd,
    force: options.force,
  });

  const hooks = installKiroHooks({
    binary,
    hooksFile: options.hooksFile,
    scope: options.scope,
    cwd: options.cwd,
    force: options.force,
  });

  return {
    installed: mcp.installed,
    changed: mcp.changed || hooks.changed,
    mcp,
    hooks,
    files: [mcp.configFile, hooks.hooksFile],
  };
}
