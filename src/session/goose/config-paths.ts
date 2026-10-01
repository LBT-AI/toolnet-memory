import { homedir } from 'node:os';

import { join } from 'node:path';

export interface GooseConfigPathOptions {
  home?: string;
}

export function goosePluginRoot(
  pluginName = 'toolnet-memory',
  options: GooseConfigPathOptions = {}
): string {
  return join(options.home ?? homedir(), '.agents', 'plugins', pluginName);
}

export function gooseHooksFile(
  pluginName = 'toolnet-memory',
  options: GooseConfigPathOptions = {}
): string {
  return join(goosePluginRoot(pluginName, options), 'hooks', 'hooks.json');
}

export function gooseDetectionPaths(options: GooseConfigPathOptions = {}): string[] {
  return [join(options.home ?? homedir(), '.agents', 'plugins')];
}
