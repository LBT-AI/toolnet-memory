import { homedir } from 'node:os';
import { join } from 'node:path';

export function rovoConfigPaths(): string[] {
  return [join(homedir(), '.rovodev', 'config.yml'), join(homedir(), '.rovo', 'config.yml')];
}

export function rovoConfigFile(): string {
  return join(homedir(), '.rovodev', 'config.yml');
}
