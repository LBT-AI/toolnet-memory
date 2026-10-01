import { homedir } from 'node:os';
import { join } from 'node:path';

export function aiderConfigPaths(home: string): string[] {
  return [
    join(home, '.aider.chat.history.md'),
    join(home, '.aider.conf.yaml'),
    join(home, '.aider.conf.yml'),
    join(home, '.aider.conf.json'),
  ];
}

export function aiderHistoryFile(cwd: string): string {
  return join(cwd, '.aider.chat.history.md');
}
