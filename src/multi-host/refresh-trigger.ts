import { spawn } from 'node:child_process';

export interface ProjectRefreshTriggerOptions {
  binary?: string;
}

function normalized(value: string | undefined): string {
  return (value ?? '').trim();
}

/**
 * Fire-and-forget projection refresh.
 *
 * Important:
 * - no network work runs inside the lifecycle hook
 * - no waiting for remote storage
 * - no daemon
 * - no shell
 * - failure must never break the coding agent
 */
export function triggerProjectBackgroundRefresh(
  projectRoot: string,
  options: ProjectRefreshTriggerOptions = {}
): boolean {
  const root = normalized(projectRoot);

  if (!root) {
    return false;
  }

  const binary = normalized(options.binary ?? process.env.TOOLNET_MEMORY_BIN) || 'toolnet-memory';

  try {
    const child = spawn(binary, ['background:refresh', '--project', root, '--quiet'], {
      detached: true,

      stdio: 'ignore',

      env: process.env,
    });

    /*
     * ENOENT and other async spawn failures
     * are deliberately fail-open.
     */
    child.on('error', () => {
      // ToolNet must never break the parent CLI.
    });

    child.unref();

    return true;
  } catch {
    return false;
  }
}
