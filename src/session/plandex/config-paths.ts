import { homedir } from 'node:os';
import { join } from 'node:path';

export function plandexConfigPaths(home: string): string[] {
  return [join(home, '.plandex'), join(home, 'plandex-server'), join(home, '.config', 'plandex')];
}

export function plandexBaseDir(): string {
  return process.env.PLANDEX_BASE_DIR ?? join(homedir(), 'plandex-server');
}
