import { installCodebuffMcp, type InstallCodebuffMcpOptions } from './mcp-installer.js';

export type InstallCodebuffIntegrationOptions = InstallCodebuffMcpOptions;

export function installCodebuffIntegration(options: InstallCodebuffIntegrationOptions = {}) {
  const mcp = installCodebuffMcp(options);

  return {
    installed: mcp.installed,
    changed: mcp.changed,
    mcp,
    files: [mcp.configFile],
  };
}
