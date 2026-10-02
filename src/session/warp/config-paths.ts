import { homedir } from 'node:os';
import { join } from 'node:path';

export function warpConfigPaths(): string[] {
  return [join(homedir(), '.warp')];
}
