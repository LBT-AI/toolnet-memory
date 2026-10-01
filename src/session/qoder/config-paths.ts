import { existsSync } from 'node:fs';

import { homedir } from 'node:os';

import { join } from 'node:path';

export interface QoderConfigPathOptions {
  home?: string;

  projectRoot?: string;
}

export function qoderSettingsFile(options: QoderConfigPathOptions = {}): string {
  const home = options.home ?? homedir();

  if (existsSync(join(home, '.qoder-cn'))) {
    return join(home, '.qoder-cn', 'settings.json');
  }

  return join(home, '.qoder', 'settings.json');
}

export function qoderDetectionPaths(options: QoderConfigPathOptions = {}): string[] {
  const home = options.home ?? homedir();

  return [join(home, '.qoder-cn'), join(home, '.qoder')];
}
