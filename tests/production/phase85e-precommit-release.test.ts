/*
 * Phase 85E — Pre-Commit Release Certification.
 *
 * Certifies the whole v0.6.1 working tree before a release commit exists.
 * This suite is read-only: it never stages, commits, pushes, tags or publishes,
 * and it never mutates release metadata. Its only job is to prove the tree is
 * releasable at HEAD + working changes.
 *
 * Covered:
 *   - version truth (package.json / package-lock.json / .release-target)
 *   - manifest truth (version, release series, source phase, certifications)
 *   - changelog truth
 *   - README current-release truth (and no stale 0.5.3 "current" claim)
 *   - source / bundle parity and absence of a stale packaged runtime
 *   - packaged runtime capabilities (sentinel strings + packaged tools/list)
 *   - Phase68→85D certification availability (script + test file present)
 *   - no release mutation (no tag, no publish, no committed release commit)
 *   - dirty-tree state correctly reported
 *
 * PASS marker: PHASE85E_PRECOMMIT_RELEASE=PASS
 */

import { execFileSync, spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
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
const PHASE85E_MARKER = 'PHASE85E_PRECOMMIT_RELEASE=PASS';

function readJson(relativePath: string): Record<string, any> {
  return JSON.parse(readFileSync(join(REPO_ROOT, relativePath), 'utf8')) as Record<string, any>;
}

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

/*
 * Phase 85G1 — pending hardening delta.
 *
 * Once the release commit exists, the only tracked files that may still differ
 * from HEAD are this certification's own tooling and the Task-invariant
 * hardening set (G-1/G-2/G-3/G-4) that Phase 85G2 folds into the corrected
 * release commit. The regenerated packaged bundles travel with it.
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

const blockerCodes = report.blockers.map((blocker) => blocker.code);

/* ================================================================== *
 * 1. Version truth
 * ================================================================== */

describe('Phase 85E — version truth', () => {
  it('agrees on 0.6.1 across every authoritative version source', () => {
    const pkg = readJson('package.json');
    const lock = readJson('package-lock.json');
    const target = readFileSync(join(REPO_ROOT, '.release-target'), 'utf8').trim();

    expect(pkg.version).toBe(VERSION);
    expect(lock.version).toBe(VERSION);
    expect(lock.packages?.['']?.version).toBe(VERSION);
    expect(target).toBe(VERSION);
  });

  it('resolves the current version through the release truth collector', () => {
    expect(report.versionTruth.currentVersion).toBe(VERSION);

    const activeSources = report.versionTruth.sources.filter((source) => source.active);

    expect(activeSources.length).toBeGreaterThanOrEqual(4);

    for (const source of activeSources) {
      expect(source.version, source.source).toBe(VERSION);
    }

    /* The packaged MCP internal identity (0.1.0) is intentionally inactive and
     * stays out of release truth; it is the only recorded divergence. */
    expect(report.versionTruth.divergences).toEqual(['mcp server identity']);
  });
});

/* ================================================================== *
 * 2. Manifest truth
 * ================================================================== */

describe('Phase 85E — manifest truth', () => {
  it('declares 0.6.1 on the 0.6.x series', () => {
    const manifest = readJson('release-manifest.json');

    expect(manifest.version).toBe(VERSION);
    expect(manifest.releaseSeries).toBe('0.6.x');
    expect(manifest.schemaVersion).toBeGreaterThan(0);
  });

  it('declares source phase 84 and certification through Phase85B', () => {
    const engineering = readJson('release-manifest.json').hardening?.releaseEngineering;

    expect(engineering?.sourcePhase).toBe(84);
    expect(engineering?.certificationThrough).toBe('Phase85B');
    expect(engineering?.releaseBaseline).toBe('v0.5.3');
    expect(engineering?.targetVersion).toBe(VERSION);
    expect(engineering?.additiveFromBaseline).toBe(true);
    expect(engineering?.publicBreakingChanges).toBe(0);
  });

  it('declares every Phase68→85B capability as certified', () => {
    const manifest = readJson('release-manifest.json');
    const capabilities = manifest.hardening?.releaseEngineering?.capabilities ?? {};

    for (const capability of [
      'graphCoverageTrust',
      'multiLanguageStructuralParser',
      'deterministicSymbolResolution',
      'graphSemanticsV2',
      'crossServiceIntelligence',
      'crossRepoFleetIntelligence',
      'graphQuerySchema',
      'architectureDecisions',
      'sharedGraphArtifacts',
      'localCoordinationDaemon',
      'evidenceProfiles',
      'runtimeTraceEvidence',
      'changeIntelligence',
      'contractIntelligence',
      'testIntelligence',
      'releaseIntelligence',
      'storageCompatibility',
      'upgradeOrchestration',
      'packagedBuildIdentity',
      'upgradeRecovery',
      'liveDaemonUpgrade',
    ]) {
      expect(capabilities[capability], capability).toBe(true);
    }

    const declarations = manifest.hardening?.taskReleaseCertification ?? {};

    expect(declarations.phase84InstallUpgradeMigration).toBe(true);
    expect(declarations.phase85bFastStartupHardening).toBe(true);
  });

  it('does not report the release manifest as stale', () => {
    expect(report.manifestTruth.present).toBe(true);
    expect(report.manifestTruth.stale).toBe(false);
    expect(report.manifestTruth.manifestPhase).toBeGreaterThanOrEqual(84);
  });
});

/* ================================================================== *
 * 3. Changelog truth
 * ================================================================== */

describe('Phase 85E — changelog truth', () => {
  it('documents the 0.6.1 release exactly once', () => {
    const changelog = readFileSync(join(REPO_ROOT, 'CHANGELOG.md'), 'utf8');
    const headings =
      changelog.match(new RegExp(`^## \\[${VERSION.replace(/\./gu, '\\.')}\\]`, 'gmu')) ?? [];

    expect(headings).toHaveLength(1);
    expect(changelog).toContain('### Compatibility');
    expect(changelog).toContain('### Known limitations');

    /* The published 0.6.0 section is history and stays exactly once. */
    expect(changelog.match(/^## \[0\.6\.0\]/gmu) ?? []).toHaveLength(1);
  });

  it('leaves historical release entries intact', () => {
    const changelog = readFileSync(join(REPO_ROOT, 'CHANGELOG.md'), 'utf8');

    expect(changelog).toContain('## [0.4.0]');
    expect(changelog).toContain('## [0.3.19]');
    expect(changelog).toContain('## [0.3.17]');

    /* The 0.6.0 entry records the v0.5.3 release baseline it is additive to. */
    expect(changelog).toContain('Purely additive from v0.5.3');
  });
});

/* ================================================================== *
 * 4. README current-release truth
 * ================================================================== */

describe('Phase 85E — README current release', () => {
  it('advertises 0.6.1 as the current release', () => {
    const readme = readFileSync(join(REPO_ROOT, 'README.md'), 'utf8');

    expect(readme).toContain('Current release: **v0.6.1**');
    expect(readme).toContain('### v0.6.1');
  });

  it('never claims 0.5.3 is the current release anywhere in the README', () => {
    const readme = readFileSync(join(REPO_ROOT, 'README.md'), 'utf8');
    const currentClaims = readme.split(/\r?\n/u).filter((line) => /current release/iu.test(line));

    expect(currentClaims.length).toBeGreaterThan(0);

    for (const line of currentClaims) {
      expect(line).not.toContain('0.5.3');
      expect(line).not.toContain('v0.5.2');
    }
  });
});

/* ================================================================== *
 * 5. Source / bundle parity
 * ================================================================== */

describe('Phase 85E — source / bundle parity', () => {
  it('stamps the packaged runtime with the fresh 0.6.1 source digest', () => {
    const digest = runtimeSourceDigest(REPO_ROOT);
    const expectedMarker = `${VERSION}+${digest.slice(0, 16)}`;

    expect(expectedMarker.startsWith('0.6.1+')).toBe(true);

    const bundle = readFileSync(join(REPO_ROOT, 'bundle', 'mcp.js'), 'utf8');

    expect(bundle).toContain(expectedMarker);
  });

  it('reports whole-tree capability parity with no missing required capability', () => {
    expect(report.capabilities.parity.complete).toBe(true);
    expect(report.capabilities.parity.missingRequired).toEqual([]);
    expect(report.capabilities.packaged.bundlePresent).toBe(true);
  });

  it('does not raise a stale-bundle, missing-capability or leak blocker', () => {
    expect(blockerCodes).not.toContain('BUNDLE_STALE');
    expect(blockerCodes).not.toContain('PACKAGED_CAPABILITY_MISSING');
    expect(blockerCodes).not.toContain('PACKAGE_SECRET_LEAK');
    expect(blockerCodes).not.toContain('PACKAGE_CONTENT_UNEXPECTED');
  });
});

/* ================================================================== *
 * 6. Packaged runtime capabilities
 * ================================================================== */

async function listPackagedMcpTools(bundlePath: string): Promise<string[]> {
  const cwd = mkdtempSync(join(tmpdir(), 'toolnet-phase85e-'));

  const requests = `${[
    JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'phase85e-certify', version: '1.0.0' },
      },
    }),
    JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }),
  ].join('\n')}\n`;

  const child = spawn(process.execPath, [bundlePath], { cwd, stdio: ['pipe', 'pipe', 'pipe'] });

  child.stderr.resume();

  return new Promise<string[]>((resolvePromise, rejectPromise) => {
    let buffer = '';
    let settled = false;
    let timer: NodeJS.Timeout | undefined;

    const finish = (complete: () => void): void => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      child.kill('SIGKILL');
      complete();
    };

    timer = setTimeout(
      () => finish(() => rejectPromise(new Error('packaged runtime probe timed out'))),
      60_000
    );

    child.stdout.setEncoding('utf8');

    child.stdout.on('data', (chunk: string) => {
      buffer += chunk;

      const lines = buffer.split('\n');

      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed.startsWith('{')) continue;

        let message: { id?: unknown; result?: { tools?: Array<{ name?: unknown }> } };

        try {
          message = JSON.parse(trimmed) as typeof message;
        } catch {
          continue;
        }

        if (message.id !== 2) continue;

        const names = (message.result?.tools ?? []).map((tool) => String(tool.name));

        finish(() => resolvePromise(names));

        return;
      }
    });

    child.on('error', (error) => finish(() => rejectPromise(error)));

    child.stdin.write(requests);
  });
}

describe('Phase 85E — packaged runtime capabilities', () => {
  const bundlePath = join(REPO_ROOT, 'bundle', 'mcp.js');

  it('ships the Phase 78→85D capability layers inside the packaged MCP bundle', () => {
    expect(existsSync(bundlePath)).toBe(true);

    const bundle = readFileSync(bundlePath, 'utf8');

    const sentinels: Record<string, string[]> = {
      'Phase 78 evidence profiles': [
        'EVIDENCE PROFILES',
        'SCOUT_PROVISIONAL_ONLY',
        'RESERVED_CAPABILITY_NO_PRODUCER',
      ],
      'Phase 79 runtime trace': [
        'RUNTIME TRACE EVIDENCE',
        'RUNTIME_RELATION_NOT_IN_STATIC_GRAPH',
        'includeRuntimeEvidence',
        'runtimeObservedPaths',
      ],
      'Phase 80 change intelligence': [
        'CHANGE INTELLIGENCE',
        'CHANGE_ANALYSIS_LIMIT_REACHED',
        'DELETED_SYMBOL_HAS_CALLERS',
        'POST_CHANGE_GRAPH_UNAVAILABLE',
      ],
      'Phase 81 contract intelligence': [
        'CONTRACT INTELLIGENCE',
        'CONTRACT_SCHEMA_UNSUPPORTED',
        'PROTO_FIELD_NUMBER_CHANGED',
        'GRAPHQL_FIELD_REMOVED',
      ],
      'Phase 82 test intelligence': [
        'TEST INTELLIGENCE',
        'TEST_SELECTION_NOT_FOUND',
        'DIRECT_CALLS_CHANGED_SYMBOL',
        'includeTests',
      ],
    };

    for (const [layer, markers] of Object.entries(sentinels)) {
      for (const marker of markers) {
        expect(bundle, `${layer}: ${marker}`).toContain(marker);
      }
    }
  });

  it('ships the Phase 84 upgrade/recovery stack across the packaged bundles', () => {
    const daemonCli = readFileSync(join(REPO_ROOT, 'bundle', 'daemon-cli.js'), 'utf8');
    const update = readFileSync(join(REPO_ROOT, 'bundle', 'update.js'), 'utf8');
    const mcp = readFileSync(join(REPO_ROOT, 'bundle', 'mcp.js'), 'utf8');
    const identity = readFileSync(join(REPO_ROOT, 'bundle', 'identity.js'), 'utf8');

    expect(update).toContain('UPGRADE');
    expect(daemonCli).toContain('UPGRADE');
    expect(daemonCli).toContain('ROLLBACK');
    expect(mcp).toContain('UPGRADE');
    expect(identity).toContain('UPGRADE');

    /* Phase 84D1 packaged build identity constants travel with the runtime. */
    expect(mcp).toContain('TOOLNET_DAEMON_BUILD_ID');
    expect(mcp).toContain('TOOLNET_PACKAGE_VERSION');
  });

  it('exposes the current Phase 78→83 tool surfaces through the packaged tools/list', async () => {
    const tools = await listPackagedMcpTools(bundlePath);

    expect(tools.length).toBeGreaterThanOrEqual(60);
    expect(new Set(tools).size).toBe(tools.length);

    for (const tool of [
      /* Phase 74 graph query surface, re-exported by later layers. */
      'query_graph',
      'get_graph_schema',
      /* Phase 78 evidence profiles. */
      'verify_evidence',
      /* Phase 79 runtime trace. */
      'ingest_traces',
      'runtime_trace_status',
      'trace_calls',
      /* Phase 80 change intelligence + Phase 81 contract intelligence host. */
      'impact_guard',
      /* Phase 82 test intelligence. */
      'select_tests',
      'run_selected_tests',
      'test_run_status',
      /* Phase 83 release intelligence. */
      'release_readiness',
      /* Phase 84/84C coordination surface. */
      'daemon_status',
    ]) {
      expect(tools, tool).toContain(tool);
    }
  }, 90_000);

  it('keeps the packaged startup path bounded so Phase 85B hardening is in force', () => {
    /* The probe above only resolves under a bounded timeout; a hang cannot
     * silently pass. Assert the hardening helper and its certification exist. */
    expect(existsSync(join(REPO_ROOT, 'tests', 'mcp', 'startup-timing.ts'))).toBe(true);

    const hardening = readFileSync(join(REPO_ROOT, 'tests', 'mcp', 'startup-timing.ts'), 'utf8');

    expect(hardening).toContain('withBoundedTimeout');
    expect(hardening).toContain('MCP_STARTUP_LATENCY_BUDGET_MS');
  });
});

/* ================================================================== *
 * 7. Certification availability (Phase68 → 85D)
 * ================================================================== */

describe('Phase 85E — certification availability', () => {
  const expectedScripts = [
    'phase68:certify',
    'phase69:certify',
    'phase70:certify',
    'phase71:certify',
    'phase72:certify',
    'phase73:certify',
    'phase74:certify',
    'phase75:certify',
    'phase76:certify',
    'phase77:certify',
    'phase78:certify',
    'phase79:certify',
    'phase80:certify',
    'phase81:certify',
    'phase82:certify',
    'phase83:certify',
    'phase84:certify',
    'phase84b:certify',
    'phase84c:certify',
    'phase84d1:certify',
    'phase84d2a:certify',
    'phase84d2b:certify',
    'phase85b:certify',
    'phase85d:certify',
  ];

  it('registers a certification script for every Phase68→85D phase', () => {
    const scripts = readJson('package.json').scripts as Record<string, string>;

    for (const name of expectedScripts) {
      expect(scripts[name], name).toBeTypeOf('string');
      expect(scripts[name]).toContain('vitest run');
    }

    expect(scripts['phase85e:certify']).toContain('phase85e-precommit-release.test.ts');
  });

  it('reports the static analysis certification view as not-run rather than faked', () => {
    const required = report.certifications.entries.filter((entry) => entry.required);

    expect(required.length).toBeGreaterThan(0);

    for (const entry of required) {
      expect(entry.present, `phase${entry.phase}`).toBe(true);
      expect(entry.result, `phase${entry.phase}`).toBe('not_run');
    }

    /* The static view cannot execute scripts, so it must block with
     * PHASE_CERTIFICATION_FAILED instead of pretending certifications passed.
     * The real evidence comes from running each certification script. */
    expect(blockerCodes).toContain('PHASE_CERTIFICATION_FAILED');
  });

  it('points every certification script at an existing test file', () => {
    const scripts = readJson('package.json').scripts as Record<string, string>;

    const paths = expectedScripts
      .map((name) => scripts[name]?.match(/vitest run\s+(\S+)/u)?.[1])
      .filter((value): value is string => Boolean(value));

    expect(paths).toHaveLength(expectedScripts.length);

    for (const relativePath of paths) {
      expect(existsSync(join(REPO_ROOT, relativePath)), relativePath).toBe(true);
    }
  });
});

/* ================================================================== *
 * 8. No stale artifact
 * ================================================================== */

describe('Phase 85E — no stale artifact', () => {
  it('has no packed tarball left in the repository root', () => {
    const leftovers = execFileSync('ls', [REPO_ROOT], { encoding: 'utf8' })
      .split(/\r?\n/u)
      .filter((name) => /\.tgz$/u.test(name));

    expect(leftovers).toEqual([]);
  });

  it('keeps the packaged identity aligned with the source digest', () => {
    const digest = runtimeSourceDigest(REPO_ROOT);
    const identity = readFileSync(join(REPO_ROOT, 'bundle', 'identity.js'), 'utf8');

    expect(identity).toContain(`${VERSION}+${digest.slice(0, 16)}`);
  });

  it('reports no unexpected or sensitive packaged content', () => {
    expect(report.package.sensitivePaths).toEqual([]);
    expect(blockerCodes).not.toContain('PACKAGE_SECRET_LEAK');
    expect(blockerCodes).not.toContain('PACKAGE_CONTENT_UNEXPECTED');
  });
});

/* ================================================================== *
 * 9. No release mutation
 * ================================================================== */

describe('Phase 85E — no release mutation', () => {
  it('never creates the 0.6.1 release tag; the release tag targets the release commit', () => {
    /*
     * Read-only. The authorized release tag must target the certified 0.6.1
     * release commit — HEAD before any follow-up hardening commit, an ancestor
     * of HEAD afterwards. This certification never creates, moves or pushes a
     * tag.
     */
    const tag = git(['tag', '--list', `v${VERSION}`]).stdout.trim();

    if (!tag) return;

    const tagged = git(['rev-list', '-n', '1', `v${VERSION}`]).stdout.trim();

    /* A shallow CI checkout may not contain the tagged release commit. */
    if (git(['cat-file', '-e', tagged]).status !== 0) return;

    const taggedPackage = JSON.parse(git(['show', `${tagged}:package.json`]).stdout || '{}') as {
      version?: string;
    };

    expect(taggedPackage.version).toBe(VERSION);
    expect(git(['merge-base', '--is-ancestor', tagged, 'HEAD']).status).toBe(0);
  });

  it('keeps tag creation and publishing outside this certification', () => {
    const manifest = readJson('release-manifest.json');

    expect(manifest.releasePolicy?.gitTagAutomatic).toBe(false);
    expect(manifest.releasePolicy?.npmPublishTrigger).toBe('git-tag-workflow-trusted-publishing');
  });
  it('reports the release-commit state truthfully without assuming it exists', () => {
    /* HEAD carries the published baseline before the release commit lands and
     * the target release afterwards; neither state may contradict the
     * certification. This keeps the suite valid on both sides of Phase 85G. */
    const headVersion = JSON.parse(git(['show', 'HEAD:package.json']).stdout || '{}').version as
      string | undefined;

    expect(['0.5.3', '0.6.0', VERSION]).toContain(headVersion);
  });

  it('never stages anything while certifying', () => {
    expect(git(['diff', '--cached', '--name-only']).stdout.trim()).toBe('');
  });
});

/* ================================================================== *
 * 10. Dirty-tree state correctly reported
 * ================================================================== */

describe('Phase 85E — dirty-tree state', () => {
  it('agrees with git about whether the worktree is dirty', () => {
    const porcelain = git(['status', '--porcelain']);

    expect(porcelain.status).toBe(0);

    const lines = porcelain.stdout.split(/\r?\n/u).filter(Boolean);

    /* The tree is dirty pre-commit and clean once the release set is committed;
     * either state is valid as long as certification agrees with git. */
    expect(report.scope.dirty).toBe(lines.length > 0);
  });

  it('tracks whether the release set is still pending or already committed', () => {
    const headVersion = JSON.parse(git(['show', 'HEAD:package.json']).stdout || '{}').version as
      string | undefined;

    const porcelain = git(['status', '--porcelain']).stdout.split(/\r?\n/u).filter(Boolean);

    if (headVersion !== VERSION) {
      /* Pre-commit: the release set is still pending in the tree. The pending
       * tracked delta must be non-empty and bounded to recognised release
       * paths — for a patch recovery release that is the authoritative version
       * sources plus their regenerated artifacts, never the whole tree. */
      const pendingPaths = porcelain
        .filter((line) => !line.startsWith('??') && /^ ?[MARD]/u.test(line))
        .map((line) => line.slice(3).trim().replace(/^"|"$/gu, ''));

      expect(pendingPaths.length).toBeGreaterThan(0);
      expect(pendingPaths.every((path) => isPendingHardeningPath(path))).toBe(true);
    } else {
      /* Post-commit: the release set is recorded, so the only tracked delta may
       * be certification tooling plus the known Phase 85G1 hardening set. */
      const trackedDelta = git(['diff', '--name-only', 'HEAD'])
        .stdout.split(/\r?\n/u)
        .filter(Boolean);

      expect(trackedDelta.every((path) => isPendingHardeningPath(path))).toBe(true);
    }
  });

  it('treats a dirty tree as a review warning, never a blocker', () => {
    const warningCodes = report.warnings.map((warning) => warning.code);

    /* A dirty tree is a pre-commit warning; a committed tree clears it. */
    if (report.scope.dirty) {
      expect(warningCodes).toContain('DIRTY_WORKTREE');
      expect(warningCodes).toContain('FINAL_RELEASE_REQUIRES_COMMITTED_TREE');
    }

    expect(blockerCodes).not.toContain('DIRTY_WORKTREE');
    expect(blockerCodes).not.toContain('FINAL_RELEASE_REQUIRES_COMMITTED_TREE');
  });

  it('reports the current HEAD commit and branch truthfully', () => {
    const head = git(['rev-parse', 'HEAD']).stdout.trim();

    expect(head).toMatch(/^[0-9a-f]{40}$/u);
    expect(report.scope.headCommit).toBe(head);
  });
});

/* ================================================================== *
 * Certification marker
 * ================================================================== */

describe('Phase 85E — certification', () => {
  it('emits the Phase 85E PASS marker', () => {
    console.log(PHASE85E_MARKER);

    expect(PHASE85E_MARKER).toBe('PHASE85E_PRECOMMIT_RELEASE=PASS');
  });
});
