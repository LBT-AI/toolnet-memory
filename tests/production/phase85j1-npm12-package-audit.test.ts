/*
 * Phase 85J1 — npm 12 package audit compatibility.
 *
 * Root cause this certifies: npm 12 changed the `--json` output of `npm pack`
 * (and `npm publish`) from an array of package entries to an object keyed by
 * package name. The release package audit read `parsed[0].files`, so under npm
 * 12 it saw an empty file list, reported every required entrypoint as missing
 * and raised a false PACKAGED_CAPABILITY_MISSING release blocker — which failed
 * the tag-triggered release pipeline before it could publish.
 *
 * What is certified here:
 *   1. One parser handles npm <= 11 array output (npm 10/11), npm >= 12
 *      name-keyed object output, and a bare single-entry object — machine
 *      readable only, never fragile text parsing.
 *   2. Malformed, empty, valueless or non-zero npm output fails closed instead
 *      of silently auditing an empty package.
 *   3. Both consumers (the release package audit and the production certifier)
 *      normalise through the same code path, so they cannot drift apart again.
 *   4. The real repository still audits clean under whichever npm is installed.
 *   5. Missing required files and sensitive/unexpected files are still detected.
 *   6. The release workflow pins its npm version instead of floating on
 *      npm@latest.
 *
 * Read-only with respect to the repository: every npm invocation runs against a
 * throwaway temp package (or a PATH shim). Never publishes, tags or pushes.
 *
 * PASS marker: PHASE85J1_NPM12_PACKAGE_AUDIT=PASS
 */

import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import {
  auditPackageContents,
  parsePackManifestEntries,
} from '../../src/code-intelligence/release/package-audit.js';
import {
  PRODUCTION_PACK_REQUIRED_FILES,
  parsePackedFiles,
  validatePackedRuntimeFiles,
} from '../../src/production/production-certify.js';

const REPO_ROOT = process.cwd();
const PHASE85J1_MARKER = 'PHASE85J1_NPM12_PACKAGE_AUDIT=PASS';

const REQUIRED_PACKAGE_FILES = ['package.json', 'bundle/mcp.js', 'release-manifest.json'];

const AUDIT_LIMITS = { maxPackageFiles: 20_000, maxPackageJsonBytes: 16 * 1024 * 1024 };

/* The npm shim below is an executable shell script on PATH, so the shim-driven
 * cases are POSIX only. */
const itPosix = process.platform === 'win32' ? it.skip : it;

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
    id: 'toolnet-memory@0.6.0',
    name: 'toolnet-memory',
    version: '0.6.0',
    size: 2_654_978,
    unpackedSize: 9_592_255,
    files: files.map((path) => ({ path, size: 10, mode: 420 })),
  };
}

/** npm <= 11 (npm 10 and 11): an array of package entries. */
function npm11Output(files: string[]): string {
  return JSON.stringify([packEntry(files)]);
}

/** npm >= 12: one object keyed by package name (same shape as npm publish). */
function npm12Output(files: string[]): string {
  return JSON.stringify({ 'toolnet-memory': packEntry(files) });
}

/**
 * Run `run` with a fake `npm` first on PATH that prints `stdout` and exits with
 * `status`. This drives the real audit through every output shape without
 * requiring a specific npm major to be installed.
 */
function withFakeNpm<T>(stdout: string, status: number, run: () => T): T {
  const bin = tempRoot('toolnet-phase85j1-bin-');
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
    auditPackageContents({ projectRoot: tempRoot('toolnet-phase85j1-project-'), ...AUDIT_LIMITS })
  );
}

const SHIPPED_FILES = ['package.json', 'release-manifest.json', 'bundle/mcp.js', '.env', '_t.ts'];

/* ================================================================== *
 * 1. Machine-readable parsing across npm majors
 * ================================================================== */

describe('Phase 85J1 — npm pack manifest parsing', () => {
  it('parses npm <= 11 array output (npm 10 / 11 shape)', () => {
    const entries = parsePackManifestEntries(npm11Output(SHIPPED_FILES));

    expect(entries).toHaveLength(1);
    expect(entries[0]?.files.map((file) => file.path)).toEqual(SHIPPED_FILES);
    expect(entries[0]?.unpackedSize).toBe(9_592_255);
  });

  it('parses npm >= 12 name-keyed object output (the regression)', () => {
    const entries = parsePackManifestEntries(npm12Output(SHIPPED_FILES));

    expect(entries).toHaveLength(1);
    expect(entries[0]?.files.map((file) => file.path)).toEqual(SHIPPED_FILES);
    expect(entries[0]?.name).toBe('toolnet-memory');
  });

  it('treats both npm majors as the same manifest', () => {
    expect(parsePackManifestEntries(npm12Output(SHIPPED_FILES))).toEqual(
      parsePackManifestEntries(npm11Output(SHIPPED_FILES))
    );
  });

  it('parses a bare single entry object carrying its own files array', () => {
    const entries = parsePackManifestEntries(JSON.stringify(packEntry(SHIPPED_FILES)));

    expect(entries).toHaveLength(1);
    expect(entries[0]?.files.map((file) => file.path)).toEqual(SHIPPED_FILES);
  });

  it('tolerates bare string file entries and drops unusable ones', () => {
    const payload = JSON.stringify({
      'toolnet-memory': { files: ['package.json', { size: 3 }, '', 42, { path: 'bundle/mcp.js' }] },
    });

    expect(parsePackManifestEntries(payload)[0]?.files.map((file) => file.path)).toEqual([
      'package.json',
      'bundle/mcp.js',
    ]);
  });

  it('fails closed on malformed, empty or unrecognized output', () => {
    const unusable = [
      '',
      'not json',
      'npm WARN using --force\n[]',
      '[]',
      '{}',
      'null',
      '42',
      '"package.json"',
      '[null]',
      '{"toolnet-memory":{}}',
      '{"files":"not-an-array"}',
    ];

    for (const stdout of unusable) {
      expect(parsePackManifestEntries(stdout)).toEqual([]);
    }
  });
});

/* ================================================================== *
 * 2. Both consumers share one normalization path
 * ================================================================== */

describe('Phase 85J1 — shared normalization across consumers', () => {
  it('resolves both npm shapes to the same file list in the production certifier', () => {
    const fromNpm11 = parsePackedFiles(npm11Output(SHIPPED_FILES));
    const fromNpm12 = parsePackedFiles(npm12Output(SHIPPED_FILES));
    const fromParser = parsePackManifestEntries(npm12Output(SHIPPED_FILES)).flatMap((entry) =>
      entry.files.map((file) => file.path)
    );

    expect(fromNpm11).toEqual(SHIPPED_FILES);
    expect(fromNpm12).toEqual(SHIPPED_FILES);
    expect(fromParser).toEqual(fromNpm12);
  });

  it('still detects a required entrypoint missing from the package', () => {
    const files = parsePackedFiles(npm12Output(['package.json', 'release-manifest.json']));
    const validation = validatePackedRuntimeFiles(files);

    expect(validation.passed).toBe(false);
    expect(validation.missing).toContain('bundle/mcp.js');
  });

  it('fails closed when the manifest cannot be parsed at all', () => {
    const validation = validatePackedRuntimeFiles(parsePackedFiles('npm WARN nothing here'));

    expect(validation.passed).toBe(false);
    expect(validation.missing).toEqual([...PRODUCTION_PACK_REQUIRED_FILES]);
  });
});

/* ================================================================== *
 * 3. Package audit across npm output shapes
 * ================================================================== */

describe('Phase 85J1 — package audit against each npm output shape', () => {
  itPosix('audits npm <= 11 output and still flags sensitive / unexpected files', () => {
    const result = auditWithFakeNpm(npm11Output(SHIPPED_FILES));

    expect(result.available).toBe(true);
    expect(result.audit.fileCount).toBe(SHIPPED_FILES.length);
    expect(result.audit.requiredPresent).toEqual([...REQUIRED_PACKAGE_FILES]);
    expect(result.audit.requiredMissing).toEqual([]);
    expect(result.audit.sensitivePaths).toContain('.env (env_file)');
    expect(result.audit.unexpectedPaths).toContain('_t.ts (scratch_file)');
  });

  itPosix('audits npm >= 12 output exactly like npm <= 11 output', () => {
    const fromNpm11 = auditWithFakeNpm(npm11Output(SHIPPED_FILES));
    const fromNpm12 = auditWithFakeNpm(npm12Output(SHIPPED_FILES));

    expect(fromNpm12.available).toBe(true);
    expect(fromNpm12.audit.fileCount).toBe(SHIPPED_FILES.length);
    expect(fromNpm12.audit.requiredMissing).toEqual([]);
    expect(fromNpm12.audit).toEqual(fromNpm11.audit);
  });

  itPosix('reports a required entrypoint missing from the package', () => {
    const result = auditWithFakeNpm(
      npm12Output(['package.json', 'release-manifest.json', 'bundle/other.js'])
    );

    expect(result.available).toBe(true);
    expect(result.audit.requiredMissing).toEqual(['bundle/mcp.js']);
    expect(result.audit.complete).toBe(false);
  });

  itPosix('fails closed on npm output that is not JSON', () => {
    const result = auditWithFakeNpm('npm WARN something\nnot a manifest\n');

    expect(result.available).toBe(false);
    expect(result.note).toBe('npm pack manifest shape was not recognized');
    expect(result.audit.fileCount).toBe(0);
    expect(result.audit.requiredMissing).toEqual([...REQUIRED_PACKAGE_FILES]);
    expect(result.audit.complete).toBe(false);
  });

  itPosix('fails closed on valueless npm output', () => {
    for (const stdout of ['[]', '{}', '{"toolnet-memory":{}}']) {
      const result = auditWithFakeNpm(stdout);

      expect(result.available).toBe(false);
      expect(result.note).toBe('npm pack manifest shape was not recognized');
      expect(result.audit.requiredMissing).toEqual([...REQUIRED_PACKAGE_FILES]);
    }
  });

  itPosix('fails closed on empty npm output', () => {
    const result = auditWithFakeNpm('');

    expect(result.available).toBe(false);
    expect(result.note).toBe('npm pack --dry-run failed or produced no manifest');
    expect(result.audit.requiredMissing).toEqual([...REQUIRED_PACKAGE_FILES]);
  });

  itPosix('fails closed when npm exits non-zero even with valid JSON', () => {
    const result = auditWithFakeNpm(npm12Output(SHIPPED_FILES), 1);

    expect(result.available).toBe(false);
    expect(result.note).toBe('npm pack --dry-run failed or produced no manifest');
    expect(result.audit.fileCount).toBe(0);
  });
});

/* ================================================================== *
 * 4. Real repository audit
 * ================================================================== */

describe('Phase 85J1 — real repository audit', () => {
  it('audits the real package cleanly under the installed npm', () => {
    const result = auditPackageContents({ projectRoot: REPO_ROOT, ...AUDIT_LIMITS });

    expect(result.available).toBe(true);
    expect(result.audit.fileCount).toBeGreaterThan(0);
    expect(result.audit.requiredMissing).toEqual([]);
    expect(result.audit.requiredPresent).toEqual([...REQUIRED_PACKAGE_FILES]);
    expect(result.audit.sensitivePaths).toEqual([]);
    expect(result.audit.complete).toBe(true);
    expect(result.truncated).toBe(false);
  });

  it('never publishes while auditing the package', () => {
    const source = readFileSync(
      join(REPO_ROOT, 'src', 'code-intelligence', 'release', 'package-audit.ts'),
      'utf8'
    );
    const spawn = /spawnSync\('npm',\s*\[([^\]]*)\]/u.exec(source);

    expect(spawn).not.toBeNull();
    expect(spawn?.[1]).toContain("'pack'");
    expect(spawn?.[1]).toContain("'--dry-run'");
    expect(spawn?.[1]).not.toContain('publish');
  });
});

/* ================================================================== *
 * 5. Release workflow npm pin
 * ================================================================== */

describe('Phase 85J1 — release workflow npm pin', () => {
  const workflow = readFileSync(join(REPO_ROOT, '.github', 'workflows', 'release.yml'), 'utf8');

  it('never floats on npm@latest', () => {
    expect(workflow).not.toContain('npm@latest');
    expect(workflow).not.toContain('install -g npm\n');
  });

  it('pins an exact npm version that still supports trusted publishing', () => {
    const pinned = /npm install -g npm@(\d+)\.(\d+)\.(\d+)/u.exec(workflow);

    expect(pinned).not.toBeNull();
    expect(Number(pinned?.[1])).toBeGreaterThanOrEqual(11);
  });

  it('keeps OIDC trusted publishing and never uses a static npm token', () => {
    expect(workflow).toContain('id-token: write');
    expect(workflow).toContain('npm publish --access public --tag latest');
    expect(workflow).not.toContain('NODE_AUTH_TOKEN');
  });
});

/* ================================================================== *
 * 6. Certification
 * ================================================================== */

describe('Phase 85J1 — certification', () => {
  it('emits the Phase 85J1 PASS marker', () => {
    console.log(PHASE85J1_MARKER);

    expect(PHASE85J1_MARKER).toBe('PHASE85J1_NPM12_PACKAGE_AUDIT=PASS');
  });
});
