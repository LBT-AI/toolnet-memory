import { homedir } from 'node:os';

import { join } from 'node:path';

export interface BobConfigPathOptions {
  home?: string;

  projectRoot?: string;
}

export function bobGlobalSettingsFile(options: BobConfigPathOptions = {}): string {
  return join(options.home ?? homedir(), '.bob', 'settings', 'settings.json');
}

export function bobWorkspaceSettingsFile(projectRoot: string): string {
  return join(projectRoot, '.bob', 'settings.json');
}

export function bobDetectionPaths(options: BobConfigPathOptions = {}): string[] {
  return [join(options.home ?? homedir(), '.bob')];
}
