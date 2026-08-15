import { homedir } from 'node:os';

import { join } from 'node:path';

export function toolNetServiceSocketPath(): string {
  return process.env.TOOLNET_SERVICE_SOCKET ?? join(homedir(), '.toolnet', 'run', 'service.sock');
}
