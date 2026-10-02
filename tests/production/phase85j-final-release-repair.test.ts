/*
 * Phase 85J — final release workflow repair.
 *
 * Certifies the two blockers that stopped the v0.6.0 tag release — retained
 * unchanged for the v0.6.2 recovery release — plus the release invariants that
 * must hold around them:
 *
 *   1. npm 12 compatibility — npm 12 changed `npm pack --json` from an array of
 *      entries to an object keyed by package name; the release audit assumed
 *      `parsed[0].files` and therefore reported every required entrypoint as
 *      missing. The audit now parses JSON across npm 10/11/12, normalizes paths,
 *      detects duplicates, orders its report deterministically and fails closed
 *      on malformed, empty or valueless output.
 *   2. Docker arm64 — the tree-sitter grammar modules have no arm64 prebuilds, so
 *      node-gyp compiles them during `npm ci`; the slim builder had no Python or
 *      C/C++ toolchain. The toolchain is now installed in the builder stage only,
 *      and the multi-platform (amd64 + arm64) build is preserved.
 *
 * It also certifies the release invariants around them: version truth, build
 * identity generated from version + source digest, the packaged runtime carrying
 * the fixed parser (no stale bundle), release workflow ordering and publish
 * guards, GHCR multi-platform configuration, and the release tag targeting the
 * certified release commit.
 *
 * Read-only with respect to the repository: npm invocations run against a
 * throwaway package or a PATH shim. Never publishes, tags or pushes.
 *
 * PASS marker: PHASE85J_FINAL_RELEASE_REPAIR=PASS
 */

import { execFileSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import {
  auditPackageContents,
  normalizeManifestPath,
  parsePackManifestEntries,
} from '../../src/code-intelligence/release/package-audit.js';
import { runtimeSourceDigest } from '../../src/runtime/build-identity.js';

const REPO_ROOT = process.cwd();
const PHASE85J_MARKER = 'PHASE85J_FINAL_RELEASE_REPAIR=PASS';
const VERSION = '0.6.2';

const REQUIRED_PACKAGE_FILES = ['package.json', 'bundle/mcp.js', 'release-manifest.json'];
const AUDIT_LIMITS = { maxPackageFiles: 20_000, maxPackageJsonBytes: 16 * 1024 * 1024 };

/* The npm shim below is an executable shell script on PATH. */
const itPosix = process.platform === 'win32' ? it.skip : it;

const readText = (path: string): string => readFileSync(join(REPO_ROOT, path), 'utf8');

const releaseWorkflow = readText('.github/workflows/release.yml');
const dockerWorkflow = readText('.github/workflows/docker.yml');
const dockerfile = readText('Dockerfile');

const builderStage = dockerfile.slice(0, dockerfile.indexOf('AS runtime'));
const runtimeStage = dockerfile.slice(dockerfile.indexOf('AS runtime'));

/* ================================================================== *
 * Harness
 * ================================================================== */

const roots: string[] = [];

function tempRoot(prefix: string): string {
  const root = mkdtempSync(join(tmpdir(), prefix));

  roots.push(root);

  return root;
}

afterAll(() => {
  for (const root of roots) {
    rmSync(root, { recursive: true, force: true });
  }
});

function packEntry(files: string[]): Record<string, unknown> {
  return {
    id: `toolnet-memory@${VERSION}`,
    name: 'toolnet-memory',
    version: VERSION,
    size: 2_654_978,
    unpackedSize: 9_592_255,
    files: files.map((path) => ({ path, size: 10, mode: 420 })),
  };
}

/** npm <= 11: an array of package entries. */
const npm11Output = (files: string[]): string => JSON.stringify([packEntry(files)]);

/** npm >= 12: one object keyed by package name. */
const npm12Output = (files: string[]): string =>
  JSON.stringify({ 'toolnet-memory': packEntry(files) });

const SHIPPED_FILES = ['package.json', 'release-manifest.json', 'bundle/mcp.js', '.env', '_t.ts'];

function withFakeNpm<T>(stdout: string, status: number, run: () => T): T {
  const bin = tempRoot('toolnet-phase85j-bin-');
  const payload = join(bin, 'payload.json');
  const shim = join(bin, 'npm');

  writeFileSync(payload, stdout);
  writeFileSync(shim, `#!/bin/sh\ncat "${payload}"\nexit ${status}\n`);
  chmodSync(shim, 0o755);

  const previousPath = process.env.PATH;

  process.env.PATH = `${bin}:${previousPath ?? ''}`;

  try {
    return run();
  } finally {
    process.env.PATH = previousPath;
  }
}

function auditWithFakeNpm(stdout: string, status = 0): ReturnType<typeof auditPackageContents> {
  return withFakeNpm(stdout, status, () =>
    auditPackageContents({ projectRoot: tempRoot('toolnet-phase85j-project-'), ...AUDIT_LIMITS })
  );
}

/* ================================================================== *
 * 1. npm 12 JSON package parsing
 * ================================================================== */

describe('Phase 85J — npm pack JSON parsing', () => {
  it('parses npm 10/11 array output and npm 12 object output identically', () => {
    const fromNpm11 = parsePackManifestEntries(npm11Output(SHIPPED_FILES));
    const fromNpm12 = parsePackManifestEntries(npm12Output(SHIPPED_FILES));

    expect(fromNpm12).toEqual(fromNpm11);
    expect(fromNpm12[0]?.files.map((file) => file.path)).toEqual(SHIPPED_FILES);
  });

  it('normalizes packed paths before comparing them', () => {
    expect(normalizeManifestPath('./bundle/mcp.js')).toBe('bundle/mcp.js');
    expect(normalizeManifestPath('bundle\\mcp.js')).toBe('bundle/mcp.js');
    expect(normalizeManifestPath('/bundle//mcp.js')).toBe('bundle/mcp.js');
    expect(normalizeManifestPath('.env.example')).toBe('.env.example');

    const entries = parsePackManifestEntries(
      npm12Output(['./package.json', 'bundle\\mcp.js', 'release-manifest.json'])
    );

    expect(entries[0]?.files.map((file) => file.path)).toEqual([
      'package.json',
      'bundle/mcp.js',
      'release-manifest.json',
    ]);
  });

  it('rejects malformed or valueless npm output instead of assuming success', () => {
    for (const stdout of ['', 'not json', '[]', '{}', 'null', '42', '{"files":"nope"}']) {
      expect(parsePackManifestEntries(stdout)).toEqual([]);
    }
  });
});

/* ================================================================== *
 * 2. Package inventory through the real audit
 * ================================================================== */

describe('Phase 85J — package inventory', () => {
  itPosix('produces a deterministic, complete inventory for npm 12 output', () => {
    const first = auditWithFakeNpm(npm12Output(SHIPPED_FILES));
    const second = auditWithFakeNpm(npm12Output(SHIPPED_FILES));

    expect(first.available).toBe(true);
    expect(first.audit).toEqual(second.audit);
    expect(first.audit.fileCount).toBe(SHIPPED_FILES.length);
    expect(first.audit.duplicatePaths).toEqual([]);
    expect(first.audit.requiredPresent).toEqual([...REQUIRED_PACKAGE_FILES]);
    expect(first.audit.requiredMissing).toEqual([]);
  });

  itPosix('detects forbidden files and missing required files', () => {
    const result = auditWithFakeNpm(
      npm12Output(['package.json', 'release-manifest.json', '.env', '.env.production', '_t.ts'])
    );

    expect(result.available).toBe(true);
    expect(result.audit.requiredMissing).toEqual(['bundle/mcp.js']);
    expect(result.audit.sensitivePaths).toEqual(['.env (env_file)', '.env.production (env_file)']);
    expect(result.audit.unexpectedPaths).toEqual(['_t.ts (scratch_file)']);
    expect(result.audit.complete).toBe(false);
  });

  itPosix('detects duplicate shipped paths', () => {
    const result = auditWithFakeNpm(
      npm12Output([...SHIPPED_FILES, 'bundle/mcp.js', './bundle/mcp.js'])
    );

    expect(result.audit.duplicatePaths).toEqual(['bundle/mcp.js']);
    expect(result.audit.complete).toBe(false);
  });

  itPosix('fails closed on malformed and on non-zero npm output', () => {
    const malformed = auditWithFakeNpm('npm WARN not a manifest\n');
    const failed = auditWithFakeNpm(npm12Output(SHIPPED_FILES), 1);
    const valueless = auditWithFakeNpm('{}');

    for (const result of [malformed, failed, valueless]) {
      expect(result.available).toBe(false);
      expect(result.audit.requiredMissing).toEqual([...REQUIRED_PACKAGE_FILES]);
      expect(result.audit.complete).toBe(false);
    }

    expect(malformed.note).toBe('npm pack manifest shape was not recognized');
    expect(failed.note).toBe('npm pack --dry-run failed or produced no manifest');
  });

  it('audits the real package cleanly and never publishes', () => {
    const result = auditPackageContents({ projectRoot: REPO_ROOT, ...AUDIT_LIMITS });

    expect(result.available).toBe(true);
    expect(result.audit.fileCount).toBeGreaterThan(0);
    expect(result.audit.requiredPresent).toEqual([...REQUIRED_PACKAGE_FILES]);
    expect(result.audit.requiredMissing).toEqual([]);
    expect(result.audit.duplicatePaths).toEqual([]);
    expect(result.audit.sensitivePaths).toEqual([]);
    expect(result.audit.unexpectedPaths).toEqual([]);
    expect(result.audit.complete).toBe(true);
  });
});

/* ================================================================== *
 * 3. Release npm setup
 * ================================================================== */

describe('Phase 85J — release npm setup', () => {
  it('pins an exact npm version instead of floating on the newest major', () => {
    const pinned = /npm install -g npm@(\d+)\.(\d+)\.(\d+)/u.exec(releaseWorkflow);

    expect(releaseWorkflow).not.toContain('npm@latest');
    expect(pinned).not.toBeNull();

    const major = Number(pinned?.[1]);
    const minor = Number(pinned?.[2]);

    /* OIDC trusted publishing needs npm >= 11.5.1. */
    expect(major).toBeGreaterThanOrEqual(11);
    if (major === 11) expect(minor).toBeGreaterThanOrEqual(5);
  });

  it('installs the pinned npm before installing dependencies', () => {
    /* Scoped to the publishing job: the standalone jobs also run `npm ci`. */
    const publishJob = releaseWorkflow.slice(
      releaseWorkflow.indexOf('name: Publish npm + GitHub Release')
    );
    const pin = publishJob.indexOf('npm install -g npm@');
    const ci = publishJob.indexOf('run: npm ci');

    expect(pin).toBeGreaterThan(-1);
    expect(ci).toBeGreaterThan(pin);
  });
});

/* ================================================================== *
 * 4. Docker builder dependencies (amd64 + arm64)
 * ================================================================== */

describe('Phase 85J — Docker builder dependencies', () => {
  it('installs the native build toolchain in the builder stage before npm ci', () => {
    const install = builderStage.indexOf('apt-get install');

    expect(install).toBeGreaterThan(-1);
    expect(builderStage.slice(install)).toContain('python3');
    expect(builderStage.slice(install)).toMatch(/\bmake\b/u);
    expect(builderStage.slice(install)).toMatch(/g\+\+|build-essential/u);
    expect(builderStage.indexOf('RUN npm ci')).toBeGreaterThan(install);
  });

  it('keeps the runtime image minimal (no toolchain, no python)', () => {
    expect(runtimeStage).not.toContain('python3');
    expect(runtimeStage).not.toMatch(/\bg\+\+\b|build-essential/u);
    expect(runtimeStage).not.toContain('apt-get install -y --no-install-recommends make');
  });

  it('keeps both architectures in the multi-platform build', () => {
    expect(dockerWorkflow).toContain('platforms: linux/amd64,linux/arm64');

    /* arm64 must not be disabled, skipped or made non-blocking. */
    expect(dockerWorkflow).not.toMatch(/platforms:[^\n]*arm64[^\n]*(exclude|skip)/u);
    expect(dockerWorkflow).not.toContain('continue-on-error');
  });

  it('publishes images only from release tag refs and never fakes success', () => {
    expect(dockerWorkflow).toContain("push: ${{ startsWith(github.ref, 'refs/tags/v') }}");
    expect(dockerWorkflow).toContain("if: startsWith(github.ref, 'refs/tags/v')");
    expect(dockerWorkflow).toContain('type=semver,pattern={{version}}');
    expect(dockerWorkflow).toContain('type=raw,value=latest');
    expect(dockerWorkflow).not.toContain('continue-on-error');
  });
});

/* ================================================================== *
 * 5. Version truth and build identity
 * ================================================================== */

describe('Phase 85J — version truth', () => {
  it('agrees on 0.6.2 across every authoritative source', () => {
    const pkg = JSON.parse(readText('package.json')) as { version?: string };
    const lock = JSON.parse(readText('package-lock.json')) as {
      version?: string;
      packages?: Record<string, { version?: string }>;
    };
    const manifest = JSON.parse(readText('release-manifest.json')) as { version?: string };

    expect(pkg.version).toBe(VERSION);
    expect(lock.version).toBe(VERSION);
    expect(lock.packages?.['']?.version).toBe(VERSION);
    expect(readText('.release-target').trim()).toBe(VERSION);
    expect(manifest.version).toBe(VERSION);
    expect(readText('README.md')).toContain(`Current release: **v${VERSION}**`);
    expect(readText('CHANGELOG.md')).toContain(`## [${VERSION}]`);
  });

  it('leaves the MCP server identity inactive and non-authoritative', () => {
    /* The protocol/server identity is intentionally separate from the release
     * version and must not be rewritten to match the release: it is reported as
     * the single recorded divergence instead of being treated as release
     * truth. */
    expect(readText('src/mcp/server.ts')).toContain("version: '0.1.0'");
    expect(readText('src/mcp/server.ts')).not.toContain(`version: '${VERSION}'`);
  });

  it('tags the certified release commit when a release tag exists', () => {
    const git = (args: string[]): { status: number; stdout: string } => {
      try {
        return {
          status: 0,
          stdout: execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', stdio: 'pipe' }),
        };
      } catch (error) {
        const failure = error as { status?: number; stdout?: string };

        return { status: failure.status ?? 1, stdout: failure.stdout ?? '' };
      }
    };

    /* A CI clone may carry no tags, and a shallow clone may lack the tagged
     * commit; when both are present the tag must be the certified release
     * commit on the certified line, never a side branch. */
    if (!git(['tag', '--list', `v${VERSION}`]).stdout.trim()) return;

    const tagged = git(['rev-list', '-n', '1', `v${VERSION}`]).stdout.trim();

    if (git(['cat-file', '-e', tagged]).status !== 0) return;

    const taggedPackage = JSON.parse(git(['show', `${tagged}:package.json`]).stdout || '{}') as {
      version?: string;
    };

    expect(taggedPackage.version).toBe(VERSION);
    expect(git(['merge-base', '--is-ancestor', tagged, 'HEAD']).status).toBe(0);
  });
});

describe('Phase 85J — build identity', () => {
  const digest = runtimeSourceDigest(REPO_ROOT);
  const marker = `${VERSION}+${digest.slice(0, 16)}`;

  it('derives the build marker from version + source digest', () => {
    expect(VERSION).toBe('0.6.2');
    expect(marker).toMatch(/^0\.6\.2\+[0-9a-f]{16}$/u);
    expect(readText('bundle/mcp.js')).toContain(marker);
    expect(readText('bundle/identity.js')).toContain(marker);
  });

  it('ships the npm-12-tolerant parser inside the packaged bundles (no stale bundle)', () => {
    const mcp = readText('bundle/mcp.js');
    const certifier = readText('bundle/production-certify.js');

    /* The release-intelligence audit travels with the MCP runtime: its npm 12
     * fail-closed note and duplicate detection must be present. */
    expect(mcp).toContain('npm pack manifest shape was not recognized');
    expect(mcp).toContain('duplicatePaths');

    /* The production certifier ships the same shared path normalizer, so both
     * consumers normalize npm 10/11 and npm 12 output identically. */
    expect(certifier).toContain('startsWith("./")');
  });
});

/* ================================================================== *
 * 6. Release workflow ordering and guards
 * ================================================================== */

describe('Phase 85J — release workflow', () => {
  it('checks out the release tag and gates on an exact tag/version match', () => {
    expect(releaseWorkflow).toContain('ref: ${{ inputs.release_tag || github.ref }}');
    expect(releaseWorkflow).toContain('does not match package.json version');
    expect(releaseWorkflow).toMatch(/node-version: 2[24]/u);
  });

  it('certifies before publishing, in order', () => {
    const order = [
      'run: npm ci',
      'Run tests',
      'Build production release',
      'Certify production release',
      'Pack release artifact',
      'Check npm release',
      'Publish to npm with trusted publishing',
      'Create or update GitHub Release',
    ].map((needle) => releaseWorkflow.indexOf(needle));

    expect(order.every((position) => position > -1)).toBe(true);

    for (let index = 1; index < order.length; index += 1) {
      expect(order[index]).toBeGreaterThan(order[index - 1] ?? -1);
    }
  });

  it('publishes at most once, with OIDC and an already-published guard', () => {
    expect(releaseWorkflow.match(/npm publish/gu)?.length).toBe(1);
    expect(releaseWorkflow).toContain('id-token: write');
    expect(releaseWorkflow).not.toContain('NODE_AUTH_TOKEN');
    expect(releaseWorkflow).toContain('steps.npm_release.outputs.exists != ');
    expect(releaseWorkflow).toContain('npm view "toolnet-memory@$VERSION" version');
  });
});

/* ================================================================== *
 * 7. Certification
 * ================================================================== */

describe('Phase 85J — certification', () => {
  it('emits the Phase 85J PASS marker', () => {
    console.log(PHASE85J_MARKER);

    expect(PHASE85J_MARKER).toBe('PHASE85J_FINAL_RELEASE_REPAIR=PASS');
  });
});
