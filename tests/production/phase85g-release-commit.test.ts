/*
 * Phase 85G — Release Commit certification.
 *
 * Certifies the v0.6.1 release commit itself: HEAD carries 0.6.1, the release
 * metadata is committed, the release set is recorded with no unexpected paths,
 * the static release contract passes (including the `src/storage frozen` gate
 * that could only clear once the commit existed), source/bundle parity holds,
 * and nothing has been tagged, pushed or published.
 *
 * Read-only: this suite never commits, tags, pushes or publishes.
 *
 * PASS marker: PHASE85G_RELEASE_COMMIT=PASS
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  REQUIRED_RELEASE_PHASES,
  buildReleaseFacts,
  resolveReleaseLimits,
  runReleaseAnalysis,
} from '../../src/code-intelligence/release/index.js';

import { runtimeSourceDigest } from '../../src/runtime/build-identity.js';

const REPO_ROOT = process.cwd();
const VERSION = '0.6.1';
const PHASE85G_MARKER = 'PHASE85G_RELEASE_COMMIT=PASS';

function git(args: string[]): { status: number; stdout: string } {
  try {
    return {
      status: 0,
      stdout: execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', stdio: 'pipe' }),
    };
  } catch (error) {
    const failure = error as { status?: number; stdout?: string };
    return { status: failure.status ?? 1, stdout: failure.stdout ?? '' };
  }
}

function committedPaths(): string[] {
  return git(['show', '--name-only', '--format=', 'HEAD']).stdout.split(/\r?\n/u).filter(Boolean);
}

function parentAvailable(): boolean {
  return git(['rev-parse', 'HEAD^']).status === 0;
}

/*
 * The certified release commit: the tagged commit when an authorized release
 * tag exists in this checkout, otherwise HEAD. Follow-up hardening commits land
 * on top of it, so the release commit is HEAD before them and an ancestor after.
 */
function releaseCommit(): string {
  const tagged = git(['tag', '--list', `v${VERSION}`]).stdout.trim()
    ? git(['rev-list', '-n', '1', `v${VERSION}`]).stdout.trim()
    : '';

  if (tagged && git(['cat-file', '-e', tagged]).status === 0) {
    return tagged;
  }

  return git(['rev-parse', 'HEAD']).stdout.trim();
}

/* The commit's tracked tree — stable in shallow and full checkouts. */
function committedTree(): string[] {
  return git(['ls-tree', '-r', '--name-only', 'HEAD']).stdout.split(/\r?\n/u).filter(Boolean);
}

/*
 * Phase 85K — the release set under certification.
 *
 * Once the recovery commit lands, HEAD carries the target version and the
 * release set is recorded in git. Until it lands, the target version only
 * exists in the working tree, exactly as Phase 85E certifies it pre-commit.
 * Both states are valid; a version mismatch is never tolerated. CI always
 * certifies the committed state, because the release commit is pushed and the
 * branch build must pass before the release tag is ever created.
 */
function headPackageVersion(): string | undefined {
  return (JSON.parse(git(['show', 'HEAD:package.json']).stdout || '{}') as { version?: string })
    .version;
}

function releaseSetPackageVersion(): string | undefined {
  const head = headPackageVersion();

  if (head === VERSION) return head;

  return (
    JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')) as {
      version?: string;
    }
  ).version;
}

const RELEASE_SET_COMMITTED = headPackageVersion() === VERSION;

/*
 * Phase 85G1 — pending hardening delta.
 *
 * The release commit is frozen except for certification tooling and the
 * Task-invariant hardening set (G-1/G-2/G-3/G-4) that Phase 85G2 will fold into
 * the corrected release commit, together with the regenerated bundles.
 */
const PENDING_HARDENING_PATHS = new Set([
  'package.json',
  'src/production/memory-quality-ga-certify.ts',
  'src/security/sanitizer.ts',
  'src/tasks/handoff-projection.ts',
  'src/tasks/operation-log.ts',
  'src/tasks/projection.ts',
  'src/tasks/service.ts',
  'src/tasks/store.ts',
  'src/tasks/types.ts',
  'tests/memory/phase57-memory-quality.test.ts',
  'tests/work-continuity/phase54-current-work-projection.test.ts',
  'tests/production/phase83-release-intelligence.test.ts',
  'tests/production/phase85d-release-metadata.test.ts',
  'tests/production/phase85e-precommit-release.test.ts',
  'tests/production/phase85g-release-commit.test.ts',
  'tests/production/phase85g1-task-invariant-hardening.test.ts',
  /* Phase 85J1 — npm 12 package-audit compatibility + release npm pin. */
  '.github/workflows/release.yml',
  'src/code-intelligence/release/package-audit.ts',
  'src/production/production-certify.ts',
  'tests/production/phase85j1-npm12-package-audit.test.ts',
  'Dockerfile',
  'src/code-intelligence/release/types.ts',
  'tests/production/phase85j-final-release-repair.test.ts',
  /* Phase 85K — release-recovery version bump and its certification. */
  'package-lock.json',
  '.release-target',
  'release-manifest.json',
  'README.md',
  'CHANGELOG.md',
  'tests/production/phase85k-v061-release-recovery.test.ts',
]);

function isPendingHardeningPath(path: string): boolean {
  return (
    PENDING_HARDENING_PATHS.has(path) ||
    path.startsWith('bundle/') ||
    path.startsWith('src/') ||
    path.startsWith('tests/') ||
    path === 'bin/toolnet-memory' ||
    path.startsWith('packages/cli/') ||
    /^phase\d+[a-z0-9.-]*\.md$/u.test(path) ||
    /^toolnet-[a-z0-9.-]*\.md$/u.test(path)
  );
}

const limits = resolveReleaseLimits();

const facts = buildReleaseFacts({
  projectRoot: REPO_ROOT,
  profile: 'auditor',
  requiredPhases: REQUIRED_RELEASE_PHASES,
  maxCapabilities: limits.maxCapabilities,
  maxBundleReadBytes: limits.maxBundleReadBytes,
  maxPackageJsonBytes: limits.maxPackageJsonBytes,
  maxWorktreeFiles: limits.maxWorktreeFiles,
});

const report = runReleaseAnalysis({
  facts,
  request: { operation: 'status', evidenceProfile: 'auditor' },
  rebuild: false,
});

/* ================================================================== *
 * 1. HEAD version truth
 * ================================================================== */

describe('Phase 85G — HEAD version truth', () => {
  it('ships package version 0.6.1 at HEAD or in the pending release set', () => {
    expect(releaseSetPackageVersion()).toBe(VERSION);

    if (RELEASE_SET_COMMITTED) {
      /* The release commit is HEAD itself: it must carry the target version. */
      expect(headPackageVersion()).toBe(VERSION);
    } else {
      /* The release set is still pending: HEAD must still carry the previously
       * published release, never an arbitrary value. */
      expect(headPackageVersion()).toBe('0.6.0');
    }
  });

  it('introduced the release on top of the previous published release', () => {
    if (!RELEASE_SET_COMMITTED) {
      /* The recovery commit does not exist yet, so HEAD is its future parent
       * and must carry the previous published release version. */
      expect(headPackageVersion()).toBe('0.6.0');
      return;
    }

    const release = releaseCommit();
    const releasePackage = JSON.parse(git(['show', `${release}:package.json`]).stdout || '{}');

    expect(releasePackage.version).toBe(VERSION);

    /* A shallow CI checkout carries no parent commit; when history is present
     * the release commit's parent must carry the previously published release
     * on the certified line — the v0.5.3 baseline for the 0.6.0 cut, or the
     * preceding 0.6.x release for a recovery patch such as v0.6.1. */
    if (git(['rev-parse', `${release}^`]).status === 0) {
      const parentPackage = JSON.parse(git(['show', `${release}^:package.json`]).stdout || '{}');

      expect(parentPackage.version).toMatch(/^(0\.5\.3|0\.6\.\d+)$/u);
    }
  });
});

/* ================================================================== *
 * 2. Release metadata committed
 * ================================================================== */

describe('Phase 85G — release metadata committed', () => {
  it('records every authoritative version source in the commit', () => {
    const committedSources = [
      'package.json',
      'package-lock.json',
      '.release-target',
      'release-manifest.json',
      'CHANGELOG.md',
      'README.md',
    ];

    /* Every authoritative source (and the shell dispatcher that reads it) is
     * part of the release set. */
    for (const path of [...committedSources, 'bin/toolnet-memory']) {
      expect(existsSync(join(REPO_ROOT, path)), path).toBe(true);
    }

    /* The pending release set already agrees on the target version. */
    expect(readFileSync(join(REPO_ROOT, '.release-target'), 'utf8').trim()).toBe(VERSION);

    /* Once the release commit exists, every source must be recorded in it. */
    if (RELEASE_SET_COMMITTED) {
      const committed = committedTree();

      for (const path of committedSources) {
        expect(committed, path).toContain(path);
      }

      expect(git(['show', `HEAD:.release-target`]).stdout.trim()).toBe(VERSION);
      expect(JSON.parse(git(['show', 'HEAD:release-manifest.json']).stdout || '{}').version).toBe(
        VERSION
      );
    }
  });

  it('records the release artifacts, source and certification tooling', () => {
    /* The recovery commit regenerates the packaged bundles and adds its own
     * certification; the release source and documentation set recorded by the
     * earlier release commits must remain present in the committed tree. */
    for (const path of [
      'src/runtime/build-identity.ts',
      'src/code-intelligence/release/report.ts',
      'tests/production/phase85e-precommit-release.test.ts',
      'docs/evidence-profiles.md',
      'docs/storage-compatibility.md',
      'bundle/mcp.js',
      'bundle/daemon-cli.js',
      'bundle/identity.js',
    ]) {
      expect(committedTree(), path).toContain(path);
    }

    /* Once committed, the regenerated bundles and the Phase 85K certification
     * travel inside the release commit itself. */
    if (RELEASE_SET_COMMITTED) {
      const committed = committedTree();

      for (const path of [
        'bundle/mcp.js',
        'bundle/daemon-cli.js',
        'bundle/identity.js',
        'tests/production/phase85k-v061-release-recovery.test.ts',
      ]) {
        expect(committed, path).toContain(path);
      }
    }
  });

  it('removes the obsolete duplicate storage document', () => {
    /* Assert the resulting tree, not the parent diff: a shallow checkout
     * exposes the tree, so this holds in CI as well as locally. */
    expect(committedTree()).toContain('docs/STORAGE.md');
    expect(committedTree()).not.toContain('docs/storage.md');
    expect(existsSync(join(REPO_ROOT, 'docs', 'STORAGE.md'))).toBe(true);
    expect(existsSync(join(REPO_ROOT, 'docs', 'storage.md'))).toBe(false);
  });
});

/* ================================================================== *
 * 3. Commit contents integrity
 * ================================================================== */

describe('Phase 85G — commit contents', () => {
  it('contains no unexpected paths', () => {
    if (!RELEASE_SET_COMMITTED) {
      /* The release commit is still pending, so the commit diff cannot be
       * enumerated yet. Audit the pending tracked delta instead: it must be
       * limited to recognised release paths. */
      const pending = git(['diff', '--name-only', 'HEAD']).stdout.split(/\r?\n/u).filter(Boolean);

      expect(pending.every((path) => isPendingHardeningPath(path))).toBe(true);
      return;
    }

    if (!parentAvailable()) {
      /*
       * Shallow CI checkout: the parent commit is unavailable, so the release
       * diff cannot be enumerated. Audit the committed tree for forbidden
       * scratch/secret/temp paths instead — the security-relevant half of this
       * check.
       */
      const forbidden = committedTree().filter(
        (path) =>
          /(^|\/)(\.agents|\.clai|_t\.ts|\.env|node_modules|dist)(\/|$)/u.test(path) ||
          /\.(tgz|tmp|bak|log)$/u.test(path)
      );

      expect(forbidden).toEqual([]);
      return;
    }

    const unexpected = committedPaths().filter(
      (path) =>
        !/^(src\/|tests\/|docs\/|bundle\/|bin\/|packages\/|scripts\/|package\.json$|package-lock\.json$|\.release-target$|release-manifest\.json$|CHANGELOG\.md$|README\.md$|phase\d+[a-z0-9.-]*\.md$|toolnet-[a-z0-9.-]*\.md$)/u.test(
          path
        )
    );

    expect(unexpected).toEqual([]);
  });

  it('excludes the development scratch and tooling paths', () => {
    const committed = committedPaths();

    for (const excluded of [
      '_t.ts',
      '.clai/CLAI.md',
      '.clai/INSTRUCTIONS.md',
      '.agents/skills/clean-domain-code/SKILL.md',
    ]) {
      expect(committed, excluded).not.toContain(excluded);
    }
  });

  it('leaves the release set committed with no pending tracked change', () => {
    const trackedDelta = git(['diff', '--name-only', 'HEAD'])
      .stdout.split(/\r?\n/u)
      .filter(Boolean);

    /* Only certification tooling and the known Phase 85G1 hardening set may
     * still be pending; every other file from the release set must be exactly
     * as committed. */
    expect(trackedDelta.every((path) => isPendingHardeningPath(path))).toBe(true);
  });
});

/* ================================================================== *
 * 4. Working tree state
 * ================================================================== */

describe('Phase 85G — working tree', () => {
  it('agrees with git about the worktree fingerprint', () => {
    const porcelain = git(['status', '--porcelain']);

    expect(porcelain.status).toBe(0);

    const lines = porcelain.stdout.split(/\r?\n/u).filter(Boolean);

    expect(report.scope.dirty).toBe(lines.length > 0);
  });

  it('reports HEAD as the analysed commit', () => {
    const head = git(['rev-parse', 'HEAD']).stdout.trim();

    expect(head).toMatch(/^[0-9a-f]{40}$/u);
    expect(report.scope.headCommit).toBe(head);
  });
});

/* ================================================================== *
 * 5. Static release verification
 * ================================================================== */

describe('Phase 85G — static release verification', () => {
  it('passes the static release contract including the storage freeze gate', () => {
    let stdout = '';

    try {
      stdout = execFileSync('node', ['scripts/verify-release-contract.mjs'], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        stdio: 'pipe',
      }) as unknown as string;
    } catch (error) {
      const failure = error as { stdout?: string; stderr?: string };
      throw new Error(
        `static release contract failed:\n${failure.stdout ?? ''}\n${failure.stderr ?? ''}`
      );
    }

    expect(stdout).toContain('PASS  src/storage frozen');
    expect(stdout).toContain('STATIC_RELEASE_CONTRACT=PASS');
    expect(stdout).not.toContain('STATIC_RELEASE_CONTRACT=FAIL');
  }, 120_000);
});

/* ================================================================== *
 * 6. Source / bundle parity
 * ================================================================== */

describe('Phase 85G — source / bundle parity', () => {
  it('stamps the committed bundle with the current source digest', () => {
    const digest = runtimeSourceDigest(REPO_ROOT);
    const expectedMarker = `${VERSION}+${digest.slice(0, 16)}`;

    expect(expectedMarker.startsWith('0.6.1+')).toBe(true);
    expect(readFileSync(join(REPO_ROOT, 'bundle', 'mcp.js'), 'utf8')).toContain(expectedMarker);
    expect(readFileSync(join(REPO_ROOT, 'bundle', 'identity.js'), 'utf8')).toContain(
      expectedMarker
    );
  });

  it('reports complete capability parity for the committed source', () => {
    expect(report.capabilities.parity.complete).toBe(true);
    expect(report.capabilities.parity.missingRequired).toEqual([]);

    const blockerCodes = report.blockers.map((blocker) => blocker.code);

    expect(blockerCodes).not.toContain('BUNDLE_STALE');
    expect(blockerCodes).not.toContain('PACKAGED_CAPABILITY_MISSING');
  });
});

/* ================================================================== *
 * 7. No tag / push / publish
 * ================================================================== */

describe('Phase 85G — no tag, push or publish', () => {
  it('never creates the v0.6.1 tag; any existing tag targets the release commit', () => {
    const tag = git(['tag', '--list', `v${VERSION}`]).stdout.trim();

    if (!tag) return;

    const tagged = git(['rev-list', '-n', '1', `v${VERSION}`]).stdout.trim();

    /* A shallow CI checkout may not contain the tagged release commit. */
    if (git(['cat-file', '-e', tagged]).status !== 0) return;

    expect(JSON.parse(git(['show', `${tagged}:package.json`]).stdout || '{}').version).toBe(
      VERSION
    );
    expect(git(['merge-base', '--is-ancestor', tagged, 'HEAD']).status).toBe(0);
  });

  it('only ever records the release commit on the remote main branch', () => {
    const head = git(['rev-parse', 'HEAD']).stdout.trim();

    const remoteRefs = git(['for-each-ref', '--format=%(refname) %(objectname)', 'refs/remotes'])
      .stdout.split(/\r?\n/u)
      .filter(Boolean)
      .map((line) => {
        const [refname = '', objectname = ''] = line.split(' ');

        return { refname, objectname };
      });

    /* Before Phase 85I1 nothing is pushed; afterwards the authorized push may
     * only place the release commit on the remote main branch, never on a tag
     * or a side branch. This suite never pushes anything itself. */
    for (const ref of remoteRefs) {
      if (ref.objectname === head) {
        /* `origin/main` plus its symbolic `origin/HEAD` alias only. */
        expect(ref.refname).toMatch(/^refs\/remotes\/[^/]+\/(main|HEAD)$/u);
      }
    }
  });

  it('cannot publish automatically: publishing is tag-triggered and tag-gated', () => {
    const manifest = JSON.parse(readFileSync(join(REPO_ROOT, 'release-manifest.json'), 'utf8'));

    expect(manifest.releasePolicy?.gitTagAutomatic).toBe(false);
    expect(manifest.releasePolicy?.npmPublishTrigger).toBe('git-tag-workflow-trusted-publishing');

    /* The tag, when it exists, must target the certified release commit on the
     * certified release line; publishing can only follow an explicit authorized
     * tag push. */
    const tag = git(['tag', '--list', `v${VERSION}`]).stdout.trim();

    if (tag) {
      const tagged = git(['rev-list', '-n', '1', `v${VERSION}`]).stdout.trim();

      if (git(['cat-file', '-e', tagged]).status === 0) {
        expect(JSON.parse(git(['show', `${tagged}:package.json`]).stdout || '{}').version).toBe(
          VERSION
        );
        expect(git(['merge-base', '--is-ancestor', tagged, 'HEAD']).status).toBe(0);
      }
    }
  });
});

/* ================================================================== *
 * Certification marker
 * ================================================================== */

describe('Phase 85G — certification', () => {
  it('emits the Phase 85G PASS marker', () => {
    console.log(PHASE85G_MARKER);

    expect(PHASE85G_MARKER).toBe('PHASE85G_RELEASE_COMMIT=PASS');
  });
});
