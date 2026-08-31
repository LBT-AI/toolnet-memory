import { existsSync } from 'node:fs';

import { spawnSync } from 'node:child_process';

import { kiloHomeDirectory, kiloConfigFile } from './config-paths.js';

export interface KiloIntegrationStatus {
  installed: boolean;

  state: 'installed' | 'missing-config' | 'missing-binary';

  mcp: {
    configured: boolean;

    configFile: string;
  };

  errors: string[];
}

function kiloBinaryExists(): boolean {
  const result = spawnSync('sh', ['-lc', 'command -v kilo >/dev/null 2>&1'], {
    stdio: 'ignore',
  });
  return result.status === 0;
}

/**
 * Inspect Kilo integration status.
 *
 * Based on audit of Kilo-Org/kilocode:
 * - Binary: kilo (CLI) or kilo-code (VS Code extension)
 * - Config dir: ~/.config/kilo/
 * - Config file: ~/.config/kilo/kilo.jsonc
 */
export function inspectKiloIntegrationStatus(): KiloIntegrationStatus {
  const homeDir = kiloHomeDirectory();
  const configFile = kiloConfigFile();

  const homeExists = existsSync(homeDir);
  const configExists = existsSync(configFile);
  const binaryExists = kiloBinaryExists();

  const errors: string[] = [];

  if (!homeExists) {
    errors.push(`Config directory missing: ${homeDir}`);
  }

  if (!binaryExists) {
    errors.push('Kilo binary not found (kilo)');
  }

  const installed = homeExists && binaryExists;

  const state: KiloIntegrationStatus['state'] = !homeExists
    ? 'missing-config'
    : !binaryExists
      ? 'missing-binary'
      : 'installed';

  return {
    installed,
    state,
    mcp: {
      configured: configExists,
      configFile,
    },
    errors,
  };
}
