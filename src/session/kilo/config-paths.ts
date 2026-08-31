import { homedir } from 'node:os';

import { join } from 'node:path';

export interface KiloConfigPathOptions {
  home?: string;

  kiloHome?: string;

  xdgConfigHome?: string;

  cwd?: string;
}

/**
 * Resolve Kilo home directory.
 *
 * Based on audit of Kilo-Org/kilocode:
 * - Global config: ~/.config/kilo/kilo.jsonc
 * - Project config: kilo.jsonc or .kilo/kilo.jsonc
 *
 * Priority:
 * 1. Explicit kiloHome option (tests/callers)
 * 2. KILO_HOME environment override
 * 3. XDG_CONFIG_HOME/kilo (XDG standard)
 * 4. ~/.config/kilo
 */
export function kiloHomeDirectory(options: KiloConfigPathOptions = {}): string {
  if (options.kiloHome) return options.kiloHome;

  if (process.env.KILO_HOME) return process.env.KILO_HOME;

  const xdg = options.xdgConfigHome ?? process.env.XDG_CONFIG_HOME;

  if (xdg) return join(xdg, 'kilo');

  return join(options.home ?? homedir(), '.config', 'kilo');
}

export function kiloConfigFile(options: KiloConfigPathOptions = {}): string {
  return join(kiloHomeDirectory(options), 'kilo.jsonc');
}

/**
 * Resolve Kilo project-level config.
 *
 * Kilo reads project config from:
 * - kilo.jsonc (project root)
 * - .kilo/kilo.jsonc (cleaner setup)
 */
export function kiloProjectConfigFile(options: KiloConfigPathOptions = {}): string {
  const cwd = options.cwd ?? process.cwd();
  return join(cwd, '.kilo', 'kilo.jsonc');
}

/**
 * Detection paths for Kilo.
 *
 * Looks for:
 * - ~/.config/kilo/ config directory
 * - ~/.config/kilo/kilo.jsonc
 */
export function kiloDetectionPaths(options: KiloConfigPathOptions = {}): string[] {
  const home = kiloHomeDirectory(options);
  const configFile = kiloConfigFile(options);

  return [home, configFile];
}
