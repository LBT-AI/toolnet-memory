import { isAbsolute, join, resolve, sep } from 'node:path';

/**
 * Local staging root for artifact build/download.
 *
 * Always inside the project's own `.toolnet` derived-cache directory. No caller
 * — least of all an MCP client — can supply a destination path.
 */
export function artifactStagingRoot(rootPath: string, override?: string): string {
  if (override) {
    return resolve(override);
  }
  return join(resolve(rootPath), '.toolnet', 'cache', 'artifacts', 'staging');
}

export function artifactStagingFile(
  stagingRoot: string,
  generation: string,
  extension = 'tgz'
): string {
  const safe = generation.replace(/[^A-Za-z0-9._-]/gu, '_');
  return join(stagingRoot, `${safe}.${extension}`);
}

/** Guard used by tests and diagnostics: a staging path never escapes its root. */
export function isInside(root: string, candidate: string): boolean {
  const base = resolve(root);
  const target = resolve(candidate);
  if (target === base) {
    return true;
  }
  return target.startsWith(`${base}${sep}`) && !isAbsolute(target.slice(base.length + 1));
}
