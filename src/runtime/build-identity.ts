/*
 * Phase 84D1 — one build identity for every runtime.
 *
 * The shell dispatcher, the standalone binary and the local daemon previously
 * each answered "which build am I?" from a different place: the dispatcher read
 * package.json, the standalone build injected a version constant, and the daemon
 * walked up to the nearest package.json. Three sources is three answers waiting
 * to disagree, and that disagreement is exactly what a build barrier must not
 * have.
 *
 * Resolution is centralized here. The order is explicit, and every resolved
 * value carries which source produced it, so a mismatch is diagnosable instead
 * of mysterious.
 *
 * This module is pure apart from reading its own package.json, so it is safe in
 * a bundle, in a source checkout and in a single-file standalone executable.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Marker a source (non-packaged) runtime reports. */
export const SOURCE_BUILD_MARKER = 'source';

/** Version reported when nothing at all can be resolved. */
export const FALLBACK_PACKAGE_VERSION = '0.0.0';

/** Which input produced a resolved value. */
export type BuildIdentitySource = 'environment' | 'injected' | 'package-json' | 'fallback';

export interface ResolvedBuildValue {
  value: string;
  source: BuildIdentitySource;
}

/**
 * Build-time constants.
 *
 * The build scripts replace these identifiers, so in a packaged artifact they
 * are string literals; in a source run they are undeclared, which is why they
 * are only ever reached through a `typeof` guard — the one expression that is
 * safe on an undeclared identifier.
 */
declare const __TOOLNET_PACKAGE_VERSION__: string;
declare const __TOOLNET_BUILD_ID__: string;

export interface BuildIdentityInputs {
  env?: NodeJS.ProcessEnv;
  /**
   * A build-injected constant owned by the caller's own build.
   *
   * Used by the standalone binary, whose bundler injects `__TOOLNET_VERSION__`
   * rather than the npm bundle's constant. Called only when needed.
   */
  injected?: () => string | undefined;
  /** Directory to start the package.json search from. */
  from?: string;
}

function clean(value: string | undefined): string | undefined {
  return value !== undefined && value.trim() !== '' ? value.trim() : undefined;
}

function injectedPackageVersion(): string | undefined {
  return typeof __TOOLNET_PACKAGE_VERSION__ === 'string' ? __TOOLNET_PACKAGE_VERSION__ : undefined;
}

function injectedBuildId(): string | undefined {
  return typeof __TOOLNET_BUILD_ID__ === 'string' ? __TOOLNET_BUILD_ID__ : undefined;
}

/**
 * Package version declared by the nearest package.json, walking up from `from`.
 *
 * Bounded and never throwing: a missing or unreadable manifest means "no answer
 * here", not a crash inside a version lookup.
 */
export function packageJsonVersion(from?: string): string | undefined {
  let directory = resolve(from ?? dirname(fileURLToPath(import.meta.url)));

  for (let depth = 0; depth < 6; depth += 1) {
    const candidate = join(directory, 'package.json');

    if (existsSync(candidate)) {
      try {
        const parsed = JSON.parse(readFileSync(candidate, 'utf8')) as { version?: unknown };

        const version = clean(typeof parsed.version === 'string' ? parsed.version : undefined);

        if (version) {
          return version;
        }
      } catch {
        /* Unreadable manifest: keep walking to a readable one. */
      }
    }

    const parent = resolve(directory, '..');

    if (parent === directory) {
      break;
    }

    directory = parent;
  }

  return undefined;
}

/**
 * The package version this runtime reports.
 *
 * Order: explicit environment override (the documented escape hatch), the
 * caller's own build-injected constant, the injected constant of this build, the
 * nearest package.json, then a fallback.
 */
export function resolvePackageVersion(inputs: BuildIdentityInputs = {}): ResolvedBuildValue {
  const env = inputs.env ?? process.env;

  const fromEnvironment = clean(env.TOOLNET_PACKAGE_VERSION);

  if (fromEnvironment) {
    return { value: fromEnvironment, source: 'environment' };
  }

  const fromCaller = clean(inputs.injected?.());
  const fromInjection = fromCaller ?? clean(injectedPackageVersion());

  if (fromInjection) {
    return { value: fromInjection, source: 'injected' };
  }

  const fromPackageJson = packageJsonVersion(inputs.from);

  if (fromPackageJson) {
    return { value: fromPackageJson, source: 'package-json' };
  }

  return { value: FALLBACK_PACKAGE_VERSION, source: 'fallback' };
}

/**
 * The explicit build marker this runtime reports.
 *
 * A packaged build injects a marker derived from the package version and the
 * runtime source digest, so two artifacts built from different source can never
 * claim the same identity even when the version is unchanged. `source` means
 * "this is a source checkout, not a packaged artifact".
 */
export function resolveBuildMarker(inputs: BuildIdentityInputs = {}): ResolvedBuildValue {
  const env = inputs.env ?? process.env;

  const fromEnvironment = clean(env.TOOLNET_DAEMON_BUILD_ID);

  if (fromEnvironment) {
    return { value: fromEnvironment, source: 'environment' };
  }

  const fromInjection = clean(injectedBuildId());

  if (fromInjection) {
    return { value: fromInjection, source: 'injected' };
  }

  return { value: SOURCE_BUILD_MARKER, source: 'fallback' };
}

/* ------------------------------------------------------------------ */
/* Source digest                                                       */
/* ------------------------------------------------------------------ */

/**
 * Deterministic digest of a runtime source tree.
 *
 * The digest exists so a packaged artifact can prove WHICH source it was built
 * from without trusting the package version, which is unchanged across phased
 * work. It covers every regular file under `<root>/src`, in code-unit path
 * order, with CRLF normalized, so the same source always digests the same on
 * every platform.
 *
 * It is deliberately conservative: a change to any source file changes the
 * digest, including a file that does not reach a given bundle. Over-reporting
 * "this is a different runtime" is safe; under-reporting is not.
 */
export function runtimeSourceDigest(root: string): string {
  const files: string[] = [];

  const walk = (directory: string): void => {
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

  files.sort((left, right) => {
    const leftPath = relative(root, left).split(sep).join('/');
    const rightPath = relative(root, right).split(sep).join('/');

    return leftPath < rightPath ? -1 : leftPath > rightPath ? 1 : 0;
  });

  const hash = createHash('sha256');

  for (const file of files) {
    const posixPath = relative(root, file).split(sep).join('/');

    hash.update(posixPath);
    hash.update('\n');
    hash.update(readFileSync(file, 'utf8').replace(/\r\n/gu, '\n'));
    hash.update('\n');
  }

  return hash.digest('hex');
}

/**
 * The build marker a packaged runtime is built with.
 *
 * Shared vocabulary with `scripts/build-bundle.mjs` and
 * `scripts/build-standalone.mjs`; the certification suite compares the marker a
 * packaged artifact reports against this function, so the three can never drift
 * apart silently.
 */
export function buildMarkerFor(version: string, sourceDigest: string): string {
  return `${version}+${sourceDigest.slice(0, 16)}`;
}
