import { homedir } from 'node:os';

import { join, resolve } from 'node:path';

export interface FreebuffConfigPathOptions {
  home?: string;

  cwd?: string;
}

/**
 * Resolve Freebuff's config directory.
 *
 * Freebuff reads user config from ~/.config/manicode by default and honours
 * FREEBUFF_CONFIG_DIR when it is set to an absolute path.
 */
export function freebuffHomeDirectory(options: FreebuffConfigPathOptions = {}): string {
  const override = process.env.FREEBUFF_CONFIG_DIR;

  if (override && override.trim()) {
    return resolve(override);
  }

  return join(options.home ?? homedir(), '.config', 'manicode');
}

export function freebuffProjectMcpFile(options: FreebuffConfigPathOptions = {}): string {
  return join(options.cwd ?? process.cwd(), '.agents', 'mcp.json');
}

export function freebuffGlobalMcpFile(options: FreebuffConfigPathOptions = {}): string {
  return join(options.home ?? homedir(), '.agents', 'mcp.json');
}

export function freebuffDetectionPaths(options: FreebuffConfigPathOptions = {}): string[] {
  return [freebuffHomeDirectory(options), freebuffGlobalMcpFile(options)];
}
