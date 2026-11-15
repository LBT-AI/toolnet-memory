import { installFreebuffMcp, type InstallFreebuffMcpOptions } from './mcp-installer.js';

export type InstallFreebuffIntegrationOptions = InstallFreebuffMcpOptions;

export function installFreebuffIntegration(options: InstallFreebuffIntegrationOptions = {}) {
  const mcp = installFreebuffMcp(options);

  return {
    installed: mcp.installed,
    changed: mcp.changed,
    mcp,
    files: [mcp.configFile],
  };
}
