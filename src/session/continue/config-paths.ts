import { homedir } from 'node:os';

import { join } from 'node:path';

export interface ContinueConfigPathOptions {
  home?: string;
}

/** ~/.continue/ */
export function continueDirectory(options: ContinueConfigPathOptions = {}): string {
  return join(options.home ?? homedir(), '.continue');
}

/** ~/.continue/config.yaml */
export function continueConfigFile(options: ContinueConfigPathOptions = {}): string {
  return join(continueDirectory(options), 'config.yaml');
}

/** ~/.continue/sessions/ */
export function continueSessionsDirectory(options: ContinueConfigPathOptions = {}): string {
  return join(continueDirectory(options), 'sessions');
}

export function continueDetectionPaths(options: ContinueConfigPathOptions = {}): string[] {
  return [continueDirectory(options), continueConfigFile(options)];
}
