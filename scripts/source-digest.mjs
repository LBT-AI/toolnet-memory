/*
 * Phase 84D1 — source digest for the packaged build marker.
 *
 * A build script must be able to answer "which source is this artifact built
 * from?" without trusting the package version, which does not change across
 * phased work. The digest below is that answer.
 *
 * There is one deliberate duplicate of this algorithm:
 * `src/runtime/build-identity.ts#runtimeSourceDigest`. The runtime copy cannot
 * import this file (scripts/ is not published) and this file cannot import the
 * TypeScript one (build scripts run under plain node). The two are held in
 * agreement by `tests/production/phase84d1-packaged-build-identity.test.ts`,
 * which compares the marker a packaged artifact reports against the marker the
 * TypeScript implementation computes for the same source. If they ever drift,
 * that test fails rather than the drift going unnoticed.
 */

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * Deterministic digest over every regular file under `<root>/src`.
 *
 * Code-unit path order, CRLF normalized: the same source digests identically on
 * every platform. Conservative on purpose — any source change changes the
 * digest, including a file that does not reach a given bundle.
 */
export function runtimeSourceDigest(root) {
  const files = [];

  const walk = (directory) => {
    let entries;

    try {
      entries = readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = join(directory, entry.name);

      if (entry.isDirectory()) {
        walk(full);
        continue;
      }

      if (entry.isFile()) {
        files.push(full);
      }
    }
  };

  walk(join(root, 'src'));

  const posix = (file) => relative(root, file).split(sep).join('/');

  files.sort((left, right) => {
    const leftPath = posix(left);
    const rightPath = posix(right);

    return leftPath < rightPath ? -1 : leftPath > rightPath ? 1 : 0;
  });

  const hash = createHash('sha256');

  for (const file of files) {
    hash.update(posix(file));
    hash.update('\n');
    hash.update(readFileSync(file, 'utf8').replace(/\r\n/gu, '\n'));
    hash.update('\n');
  }

  return hash.digest('hex');
}

/** The build marker a packaged runtime is built with. */
export function buildMarkerFor(version, sourceDigest) {
  return `${version}+${sourceDigest.slice(0, 16)}`;
}
