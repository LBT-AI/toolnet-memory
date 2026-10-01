import { homedir } from 'node:os';

import { join } from 'node:path';

export interface HermesConfigPathOptions {
  home?: string;
}

export function hermesConfigFile(options: HermesConfigPathOptions = {}): string {
  return join(options.home ?? homedir(), '.hermes', 'config.yaml');
}

export function hermesDetectionPaths(options: HermesConfigPathOptions = {}): string[] {
  return [join(options.home ?? homedir(), '.hermes')];
}
