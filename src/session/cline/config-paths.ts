import { homedir } from 'node:os';
import { join } from 'node:path';

export function clineHooksDir(projectRoot?: string): string {
  if (projectRoot) {
    return join(projectRoot, '.cline', 'hooks');
  }
  return join(homedir(), 'Documents', 'Cline', 'Hooks');
}

export function clineConfigDir(): string {
  return join(homedir(), '.cline', 'data', 'settings');
}

export function clineDataDir(): string {
  return join(homedir(), '.cline', 'data');
}

export function clineSessionsDir(): string {
  return join(homedir(), '.cline', 'data', 'sessions');
}
