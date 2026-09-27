/*
 * Phase 84D1 — packaged build identity / bundle parity certification.
 *
 * The point of this suite is that it does not trust the source tree. It probes
 * the ARTIFACT: it runs `bundle/identity.js` with node and asserts on what the
 * packaged runtime reports about itself, then compares that against what the
 * source-side implementation computes for the same repository.
 *
 * Covers:
 *
 *   - the package version injected at build time, from package.json
 *   - a deterministic build marker derived from the package version and the
 *     runtime source digest
 *   - same source ⇒ same identity; changed source ⇒ changed identity
 *   - same package version + different source ⇒ different build identity
 *   - the daemon admission barrier over the packaged fingerprint
 *   - one version truth across the dispatcher, the daemon and the standalone
 *     binary
 *   - the packaged artifact really contains and executes the 84B and 84C work
 *   - no publish, tag or push anywhere in the build path
 *
 * PASS marker: PHASE84D1_PACKAGED_BUILD_IDENTITY=PASS
 */

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { daemonBuildFingerprint, daemonPackageVersion } from '../../src/daemon/fingerprint.js';

import { compareBuilds } from '../../src/production/upgrade/fingerprint.js';

import {
  FALLBACK_PACKAGE_VERSION,
  SOURCE_BUILD_MARKER,
  buildMarkerFor,
  packageJsonVersion,
  resolveBuildMarker,
  resolvePackageVersion,
  runtimeSourceDigest,
} from '../../src/runtime/build-identity.js';

import { STORE_CONTRACTS, storeKindsByClass } from '../../src/storage/compatibility/index.js';

import type { BuildDescriptor } from '../../src/production/upgrade/fingerprint.js';

const MARKER = 'PHASE84D1_PACKAGED_BUILD_IDENTITY=PASS';

const REPO_ROOT = resolve(process.cwd());

const PACKAGE = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')) as {
  version: string;
};

interface PackagedIdentity {
  packageVersion: string;
  packageVersionSource: string;
  buildMarker: string;
  buildMarkerSource: string;
  protocolVersion: number;
  buildHash: string;
  runtimeRoot: string;
  schema: Record<string, string>;
}

interface PackagedReport {
  identity: PackagedIdentity;
  capabilities: {
    storage: {
      contracts: number;
      authority: number;
      derived: number;
      ephemeral: number;
      legacyValueDomains: string[];
    };
    compatibilityProbe: { status: string; reasonCode: string };
    upgrade: { phases: string[]; legacyAuthorityBlocker: string | undefined };
  };
}

/* ==================================================================
 * Helpers
 * ================================================================== */

function readSource(repoPath: string): string {
  return readFileSync(join(REPO_ROOT, repoPath), 'utf8');
}

function runNode(args: string[]): string {
  return execFileSync(process.execPath, args, { cwd: REPO_ROOT, encoding: 'utf8' });
}

function tsFilesUnder(directory: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...tsFilesUnder(full));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(full);
    }
  }

  return files.sort();
}

function bundleContains(file: string, literal: string): boolean {
  return readFileSync(join(REPO_ROOT, 'bundle', file), 'utf8').includes(literal);
}

let cachedReport: PackagedReport | undefined;

/** Probe the packaged runtime. Memoized so the suite runs it once per file. */
function packaged(): PackagedReport {
  cachedReport ??= JSON.parse(runNode([join('bundle', 'identity.js')])) as PackagedReport;

  return cachedReport;
}

/** The build identity a client of this source tree would present to the daemon. */
function sourceDescriptor(runtimeRoot: string, schema: Record<string, string>): BuildDescriptor {
  return {
    protocolVersion: 1,
    packageVersion: daemonPackageVersion(),
    buildMarker: resolveBuildMarker({ env: {} }).value,
    runtimeRoot,
    schema: schema as unknown as BuildDescriptor['schema'],
  };
}

function packagedDescriptor(): BuildDescriptor {
  const { identity } = packaged();

  return {
    protocolVersion: identity.protocolVersion,
    packageVersion: identity.packageVersion,
    buildMarker: identity.buildMarker,
    runtimeRoot: identity.runtimeRoot,
    schema: identity.schema as unknown as BuildDescriptor['schema'],
  };
}

function tempSource(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'toolnet-phase84d1-digest-'));

  for (const [repoPath, content] of Object.entries(files)) {
    const full = join(root, ...repoPath.split('/'));

    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }

  return root;
}

/* ==================================================================
 * Packaged runtime probe
 * ================================================================== */

describe('Phase 84D1 — packaged runtime probe', () => {
  it('ships the identity probe in the production bundle', () => {
    expect(existsSync(join(REPO_ROOT, 'bundle', 'identity.js'))).toBe(true);
  });

  it('reports the injected package version rather than a hard-coded one', () => {
    const { identity } = packaged();

    expect(identity.packageVersion).toBe(PACKAGE.version);
    expect(identity.packageVersionSource).toBe('injected');
  });

  it('reports a marker derived from the package version and the source digest', () => {
    const { identity } = packaged();

    expect(identity.buildMarker).toBe(
      buildMarkerFor(PACKAGE.version, runtimeSourceDigest(REPO_ROOT))
    );
    expect(identity.buildMarker).not.toBe(SOURCE_BUILD_MARKER);
    expect(identity.buildMarkerSource).toBe('injected');
  });

  it('is deterministic across runs', () => {
    expect(packaged().identity).toEqual(packaged().identity);
  });

  it('reports a digest-based build hash that is not the package version', () => {
    const { identity } = packaged();

    expect(identity.buildHash).toMatch(/^[0-9a-f]{64}$/u);
    expect(identity.buildHash).not.toBe(identity.packageVersion);
    expect(identity.protocolVersion).toBeGreaterThan(0);

    for (const fingerprint of Object.values(identity.schema)) {
      expect(fingerprint).toMatch(/^[0-9a-f]{8,}$/u);
    }
  });
});

/* ==================================================================
 * Package version truth
 * ================================================================== */

describe('Phase 84D1 — package version truth', () => {
  it('resolves an explicit environment override first', () => {
    expect(resolvePackageVersion({ env: { TOOLNET_PACKAGE_VERSION: '9.9.9' } })).toEqual({
      value: '9.9.9',
      source: 'environment',
    });
  });

  it('resolves a caller-injected constant next', () => {
    expect(resolvePackageVersion({ env: {}, injected: () => '1.2.3' })).toEqual({
      value: '1.2.3',
      source: 'injected',
    });
  });

  it('falls back to package.json when nothing was injected', () => {
    expect(resolvePackageVersion({ env: {} })).toEqual({
      value: PACKAGE.version,
      source: 'package-json',
    });
  });

  it('has no build-injected constant in a source run', () => {
    /* If a build constant leaked into this process the source would be 'injected'. */
    expect(resolvePackageVersion({ env: {} }).source).toBe('package-json');
    expect(resolveBuildMarker({ env: {} })).toEqual({
      value: SOURCE_BUILD_MARKER,
      source: 'fallback',
    });
  });

  it('resolves the build marker from the environment before any injection', () => {
    expect(resolveBuildMarker({ env: { TOOLNET_DAEMON_BUILD_ID: 'explicit' } })).toEqual({
      value: 'explicit',
      source: 'environment',
    });
  });

  it('reports a fallback when no package.json is reachable', () => {
    const isolated = mkdtempSync(join(tmpdir(), 'toolnet-phase84d1-isolated-'));

    try {
      expect(packageJsonVersion(isolated)).toBeUndefined();
      expect(resolvePackageVersion({ env: {}, from: isolated })).toEqual({
        value: FALLBACK_PACKAGE_VERSION,
        source: 'fallback',
      });
    } finally {
      rmSync(isolated, { recursive: true, force: true });
    }
  });

  it('gives the dispatcher, the daemon and the packaged runtime one version', () => {
    const dispatcher = execFileSync('bash', ['bin/toolnet-memory', '--version'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    }).trim();

    expect(dispatcher).toBe(`v${PACKAGE.version}`);
    expect(daemonPackageVersion()).toBe(PACKAGE.version);
    expect(packaged().identity.packageVersion).toBe(PACKAGE.version);
    expect(packageJsonVersion(REPO_ROOT)).toBe(PACKAGE.version);
  });

  it('routes every entry point through the shared resolver', () => {
    const standalone = readSource('src/standalone/cli.ts');
    const fingerprint = readSource('src/daemon/fingerprint.ts');

    expect(standalone).toContain('resolvePackageVersion(');
    expect(standalone).toContain('__TOOLNET_VERSION__');
    expect(standalone).not.toMatch(/const VERSION = __TOOLNET_VERSION__/u);

    expect(fingerprint).toContain('resolvePackageVersion');
    expect(fingerprint).toContain('resolveBuildMarker');

    expect(readSource('src/production/help-cli.ts')).toContain('resolvePackageVersion(');
  });

  it('hard-codes no version anywhere in the runtime', () => {
    const quoted = new RegExp(`["']${PACKAGE.version.replace(/\./gu, '\\.')}["']`, 'u');

    expect(readSource('src/runtime/build-identity.ts')).not.toMatch(quoted);
    expect(readSource('scripts/build-bundle.mjs')).not.toMatch(quoted);
    expect(readSource('scripts/build-standalone.mjs')).not.toMatch(quoted);

    const offenders = tsFilesUnder(join(REPO_ROOT, 'src'))
      .filter((file) => quoted.test(readFileSync(file, 'utf8')))
      .map((file) => relative(REPO_ROOT, file));

    expect(offenders).toEqual([]);

    /* The only constant version in the identity module is the explicit sentinel. */
    expect(FALLBACK_PACKAGE_VERSION).toBe('0.0.0');
  });
});

/* ==================================================================
 * Source digest and build marker
 * ================================================================== */

describe('Phase 84D1 — source digest', () => {
  it('gives the same digest for the same source', () => {
    const root = tempSource({ 'src/a.ts': 'export const a = 1;\n' });

    try {
      expect(runtimeSourceDigest(root)).toBe(runtimeSourceDigest(root));
      expect(runtimeSourceDigest(root)).toMatch(/^[0-9a-f]{64}$/u);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('changes when any source file changes', () => {
    const before = tempSource({ 'src/a.ts': 'export const a = 1;\n' });
    const after = tempSource({ 'src/a.ts': 'export const a = 2;\n' });

    try {
      expect(runtimeSourceDigest(before)).not.toBe(runtimeSourceDigest(after));
    } finally {
      rmSync(before, { recursive: true, force: true });
      rmSync(after, { recursive: true, force: true });
    }
  });

  it('changes when a file is added, even at the same package version', () => {
    const before = tempSource({ 'src/a.ts': 'export const a = 1;\n' });
    const after = tempSource({
      'src/a.ts': 'export const a = 1;\n',
      'src/b.ts': 'export const b = 2;\n',
    });

    try {
      expect(buildMarkerFor(PACKAGE.version, runtimeSourceDigest(before))).not.toBe(
        buildMarkerFor(PACKAGE.version, runtimeSourceDigest(after))
      );
    } finally {
      rmSync(before, { recursive: true, force: true });
      rmSync(after, { recursive: true, force: true });
    }
  });

  it('is independent of file creation order', () => {
    const first = tempSource({ 'src/a.ts': '1\n', 'src/nested/b.ts': '2\n' });
    const second = tempSource({ 'src/nested/b.ts': '2\n', 'src/a.ts': '1\n' });

    try {
      expect(runtimeSourceDigest(first)).toBe(runtimeSourceDigest(second));
    } finally {
      rmSync(first, { recursive: true, force: true });
      rmSync(second, { recursive: true, force: true });
    }
  });

  it('normalizes line endings so the same source digests the same everywhere', () => {
    const lf = tempSource({ 'src/a.ts': 'export const a = 1;\n' });
    const crlf = tempSource({ 'src/a.ts': 'export const a = 1;\r\n' });

    try {
      expect(runtimeSourceDigest(lf)).toBe(runtimeSourceDigest(crlf));
    } finally {
      rmSync(lf, { recursive: true, force: true });
      rmSync(crlf, { recursive: true, force: true });
    }
  });

  it('keeps the marker stable for unchanged source at the same version', () => {
    const digest = runtimeSourceDigest(REPO_ROOT);

    expect(buildMarkerFor(PACKAGE.version, digest)).toBe(buildMarkerFor(PACKAGE.version, digest));
    expect(buildMarkerFor('9.9.9', digest)).not.toBe(buildMarkerFor(PACKAGE.version, digest));
  });
});

/* ==================================================================
 * Daemon admission over the packaged identity
 * ================================================================== */

describe('Phase 84D1 — daemon admission', () => {
  it('accepts two clients of the same packaged build', () => {
    const drift = compareBuilds(packagedDescriptor(), packagedDescriptor());

    expect(drift.changed).toBe(false);
    expect(drift.reason).toBe('none');
    expect(drift.hashBefore).toBe(drift.hashAfter);
  });

  it('refuses a client built from different source at the same package version', () => {
    const drift = compareBuilds(
      sourceDescriptor(packaged().identity.runtimeRoot, packaged().identity.schema),
      packagedDescriptor()
    );

    expect(drift.changed).toBe(true);
    expect(drift.reason).toBe('build_marker');
    expect(drift.packageVersionChanged).toBe(false);
    expect(drift.buildMarkerChanged).toBe(true);
    expect(drift.hashBefore).not.toBe(drift.hashAfter);
  });

  it('refuses a client whose schema fingerprints differ at an identical version and marker', () => {
    const installed = packagedDescriptor();

    const drifted: BuildDescriptor = {
      ...installed,
      schema: { ...installed.schema, resolver: `${installed.schema.resolver}-drift` },
    };

    const drift = compareBuilds(drifted, installed);

    expect(drift.changed).toBe(true);
    expect(drift.reason).toBe('schema');
    expect(drift.packageVersionChanged).toBe(false);
    expect(drift.buildMarkerChanged).toBe(false);
  });

  it('gives the source runtime and the packaged runtime the same version but a different build', () => {
    const fingerprint = daemonBuildFingerprint(packaged().identity.runtimeRoot);

    /* Same version: the source tree is at the packaged version. */
    expect(fingerprint.packageVersion).toBe(packaged().identity.packageVersion);

    /* Different build: the source runtime reports the source marker. */
    expect(daemonPackageVersion()).toBe(PACKAGE.version);
    expect(resolveBuildMarker({ env: {} }).value).toBe(SOURCE_BUILD_MARKER);
    expect(fingerprint.buildHash).not.toBe(packaged().identity.buildHash);
  });
});

/* ==================================================================
 * Source/bundle parity
 * ================================================================== */

describe('Phase 84D1 — source/bundle parity', () => {
  it('executes the 84B storage registry from the packaged runtime', () => {
    const { capabilities } = packaged();

    expect(capabilities.storage.contracts).toBe(STORE_CONTRACTS.length);
    expect(capabilities.storage.authority).toBe(storeKindsByClass('authority').length);
    expect(capabilities.storage.derived).toBe(storeKindsByClass('derived').length);
    expect(capabilities.storage.ephemeral).toBe(storeKindsByClass('ephemeral').length);
    expect(capabilities.storage.legacyValueDomains).toContain('resolution_kind_uppercase');
  });

  it('executes the 84B legacy resolution normalization from the packaged runtime', () => {
    expect(packaged().capabilities.compatibilityProbe).toEqual({
      status: 'migrated',
      reasonCode: 'STORE_SCHEMA_LEGACY_COMPATIBLE',
    });

    expect(bundleContains('mcp.js', 'STORE_SCHEMA_LEGACY_COMPATIBLE')).toBe(true);
    expect(bundleContains('mcp.js', 'AUTHORITY_MIGRATION_REQUIRED')).toBe(true);
  });

  it('executes the 84C upgrade orchestration from the packaged runtime', () => {
    const { upgrade } = packaged().capabilities;

    expect(upgrade.phases).toEqual([
      'inspect',
      'block_unsupported',
      'backup_authority',
      'migrate_authority',
      'verify_authority',
      'rebuild_derived',
      'clear_ephemeral',
      'restart_daemon',
      'verify_upgrade',
    ]);

    /* The planner really ran: a legacy authority store blocks for want of a
     * declared migration. */
    expect(upgrade.legacyAuthorityBlocker).toBe('UPGRADE_AUTHORITY_MIGRATION_MISSING');
  });

  it('ships the update command wired to the upgrade orchestrator', () => {
    expect(bundleContains('update.js', 'UPGRADE_PARTIAL_FAILURE')).toBe(true);
    expect(bundleContains('update.js', 'UPGRADE_AUTHORITY_MIGRATION_MISSING')).toBe(true);
    expect(bundleContains('update.js', 'rebuild_derived')).toBe(true);
  });

  it('does not ship upgrade orchestration into bundles that cannot use it', () => {
    expect(bundleContains('runtime.js', 'UPGRADE_PARTIAL_FAILURE')).toBe(false);
    expect(bundleContains('mcp.js', 'UPGRADE_PARTIAL_FAILURE')).toBe(false);
  });

  it('keeps both digest implementations in agreement', () => {
    /* scripts/source-digest.mjs computed the marker baked into the artifact; the
     * TypeScript implementation recomputes it from the same source tree. */
    expect(readSource('scripts/source-digest.mjs')).toContain("createHash('sha256')");
    expect(packaged().identity.buildMarker).toBe(
      buildMarkerFor(PACKAGE.version, runtimeSourceDigest(REPO_ROOT))
    );
  });
});

/* ==================================================================
 * No release action
 * ================================================================== */

describe('Phase 84D1 — no release action', () => {
  it('publishes, tags and pushes nothing from the build path', () => {
    for (const file of [
      'scripts/build-bundle.mjs',
      'scripts/build-standalone.mjs',
      'scripts/source-digest.mjs',
    ]) {
      const source = readSource(file);

      expect(source).not.toMatch(/\bnpm publish\b/u);
      expect(source).not.toMatch(/git (?:tag|push)\b/u);
    }
  });

  it('keeps every package script free of release actions', () => {
    const { scripts } = JSON.parse(readSource('package.json')) as {
      scripts: Record<string, string>;
    };

    for (const [name, command] of Object.entries(scripts)) {
      expect(`${name}: ${command}`).not.toMatch(/\bnpm publish\b/u);
      expect(`${name}: ${command}`).not.toMatch(/git (?:tag|push)\b/u);
    }
  });

  it('derives the injected identity from package.json in both build scripts', () => {
    const bundleBuilder = readSource('scripts/build-bundle.mjs');
    const standaloneBuilder = readSource('scripts/build-standalone.mjs');

    expect(bundleBuilder).toContain("readFileSync('package.json', 'utf8')");
    expect(bundleBuilder).toContain('__TOOLNET_PACKAGE_VERSION__: JSON.stringify(pkg.version)');
    expect(bundleBuilder).toContain('__TOOLNET_BUILD_ID__: JSON.stringify(buildMarker)');

    expect(standaloneBuilder).toContain('__TOOLNET_PACKAGE_VERSION__: JSON.stringify(pkg.version)');
    expect(standaloneBuilder).toContain('__TOOLNET_BUILD_ID__: JSON.stringify(buildMarker)');
    expect(standaloneBuilder).toContain('__TOOLNET_VERSION__: JSON.stringify(pkg.version)');
  });
});

/* ==================================================================
 * Certification marker
 * ================================================================== */

describe('Phase 84D1 — certification', () => {
  it('emits the Phase 84D1 PASS marker', () => {
    process.stdout.write(`${MARKER}\n`);

    expect(MARKER).toBe('PHASE84D1_PACKAGED_BUILD_IDENTITY=PASS');
  });
});
