import { homedir } from 'node:os';
import { join } from 'node:path';

export function openRouterConfigPaths(home: string): string[] {
  return [join(home, '.openrouter'), join(home, '.config', 'openrouter')];
}
