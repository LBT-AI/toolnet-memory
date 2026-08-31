import { installToolNetCliMcp, type InstallToolNetCliMcpOptions } from './mcp-installer.js';

export interface InstallToolNetCliIntegrationOptions {
  binary?: string;

  configFile?: string;

  force?: boolean;

  cwd?: string;
}

export function installToolNetCliIntegration(options: InstallToolNetCliIntegrationOptions = {}) {
  const binary = options.binary ?? 'toolnet-memory';

  const mcp = installToolNetCliMcp({
    binary,
    configFile: options.configFile,
    force: options.force,
    cwd: options.cwd,
  });

  return {
    installed: mcp.installed,
    changed: mcp.changed,
    mcp: {
      ...mcp,
      configured: mcp.installed,
    },
    files: [mcp.configFile],
  };
}
