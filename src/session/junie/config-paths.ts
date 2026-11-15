import { homedir } from 'node:os';

import { join } from 'node:path';

export interface JunieConfigPathOptions {
  home?: string;

  cwd?: string;
}

/** ~/.junie/ */
export function junieDirectory(options: JunieConfigPathOptions = {}): string {
  return join(options.home ?? homedir(), '.junie');
}

/**
 * ~/.junie/config.json
 *
 * Junie ignores hooks from the default project-local config file, so the
 * ToolNet hook is installed at user scope.
 */
export function junieConfigFile(options: JunieConfigPathOptions = {}): string {
  return join(junieDirectory(options), 'config.json');
}

/** <project>/.toolnet/junie/session.json — active session marker. */
export function junieSessionStateFile(cwd: string = process.cwd()): string {
  return join(cwd, '.toolnet', 'junie', 'session.json');
}

export function junieDetectionPaths(options: JunieConfigPathOptions = {}): string[] {
  return [junieConfigFile(options)];
}
