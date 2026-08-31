import { installKiloMcp, type InstallKiloMcpOptions } from './mcp-installer.js';

export interface InstallKiloIntegrationOptions {
  binary?: string;

  configFile?: string;

  force?: boolean;
}

export function installKiloIntegration(options: InstallKiloIntegrationOptions = {}) {
  const binary = options.binary ?? 'toolnet-memory';

  const mcp = installKiloMcp({
    binary,
    configFile: options.configFile,
    force: options.force,
  });

  return {
    installed: mcp.installed,
    changed: mcp.changed,
    mcp,
    files: [mcp.configFile],
  };
}
