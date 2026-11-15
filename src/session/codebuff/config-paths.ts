import { homedir } from 'node:os';

import { join, resolve } from 'node:path';

export interface CodebuffConfigPathOptions {
  home?: string;

  cwd?: string;
}

/**
 * Resolve Codebuff's config directory.
 *
 * Codebuff reads user config from ~/.config/manicode by default and honours
 * CODEBUFF_CONFIG_DIR when it is set to an absolute path.
 */
export function codebuffHomeDirectory(options: CodebuffConfigPathOptions = {}): string {
  const override = process.env.CODEBUFF_CONFIG_DIR;

  if (override && override.trim()) {
    return resolve(override);
  }

  return join(options.home ?? homedir(), '.config', 'manicode');
}

export function codebuffProjectMcpFile(options: CodebuffConfigPathOptions = {}): string {
  return join(options.cwd ?? process.cwd(), '.agents', 'mcp.json');
}

export function codebuffGlobalMcpFile(options: CodebuffConfigPathOptions = {}): string {
  return join(options.home ?? homedir(), '.agents', 'mcp.json');
}

export function codebuffDetectionPaths(options: CodebuffConfigPathOptions = {}): string[] {
  return [codebuffHomeDirectory(options), codebuffGlobalMcpFile(options)];
}
