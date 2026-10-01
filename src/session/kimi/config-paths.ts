import { homedir } from 'node:os';

import { join } from 'node:path';

export interface KimiConfigPathOptions {
  home?: string;
}

export function kimiConfigFile(options: KimiConfigPathOptions = {}): string {
  return join(options.home ?? homedir(), '.kimi-code', 'config.toml');
}

export function kimiDetectionPaths(options: KimiConfigPathOptions = {}): string[] {
  return [join(options.home ?? homedir(), '.kimi-code')];
}
