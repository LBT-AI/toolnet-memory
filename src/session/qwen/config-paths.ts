import { homedir } from 'node:os';

import { join } from 'node:path';

export interface QwenConfigPathOptions {
  home?: string;

  projectRoot?: string;
}

export function qwenHooksFile(options: QwenConfigPathOptions = {}): string {
  const projectRoot = options.projectRoot;

  if (projectRoot) {
    return join(projectRoot, '.qwen', 'hooks.json');
  }

  return join(options.home ?? homedir(), '.qwen', 'hooks.json');
}

export function qwenDetectionPaths(options: QwenConfigPathOptions = {}): string[] {
  return [join(options.home ?? homedir(), '.qwen')];
}
