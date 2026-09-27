import { isAbsolute, relative, resolve } from 'node:path';

/*
 * Coverage path inputs are project-relative, POSIX-style paths
 * (same convention as RepositoryScanResult.files).
 *
 * Absolute paths are allowed only when they stay inside the project root.
 * Any path that escapes the root is rejected.
 */
export function assertPathsWithinRoot(rootPath: string, paths: readonly string[]): void {
  const root = resolve(rootPath);

  for (const value of paths) {
    if (!value || value.trim() === '') {
      throw new Error('Coverage path cannot be empty');
    }

    const normalized = value.replaceAll('\\', '/');

    const candidate = isAbsolute(normalized) ? resolve(normalized) : resolve(root, normalized);

    const rel = relative(root, candidate);

    const escapes = rel === '..' || rel.startsWith(`..${'/'.repeat(1)}`) || isAbsolute(rel);

    if (escapes) {
      throw new Error(`Coverage path escapes project root: ${value}`);
    }
  }
}

export function normalizeCoveragePaths(rootPath: string, paths: readonly string[]): string[] {
  const root = resolve(rootPath);

  return paths.map((value) => {
    const normalized = value.replaceAll('\\', '/');

    const candidate = isAbsolute(normalized) ? resolve(normalized) : resolve(root, normalized);

    const rel = relative(root, candidate);

    return rel.replaceAll('\\', '/');
  });
}

export function pathInScope(paths: readonly string[], candidates: readonly string[]): boolean {
  if (paths.length === 0) {
    return true;
  }

  const set = new Set(paths.map((value) => value.replaceAll('\\', '/')));

  return candidates.some((candidate) => set.has(candidate.replaceAll('\\', '/')));
}
