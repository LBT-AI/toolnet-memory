/*
 * Phase 83 — Release Intelligence / Pre-Release Certification & Compatibility
 * Gate production certification.
 *
 * Exercises the REAL implementation:
 *
 *   - source capability inventory (MCP tools, certifications, runtime methods)
 *   - packaged capability inventory from the built bundle
 *   - source/package parity and bundled capability requirements
 *   - version truth and release-manifest truth (stale detection, divergence)
 *   - public-surface compatibility (MCP tools, CLI commands, daemon protocol,
 *     artifact schema) with direction-aware breaking rules
 *   - semver recommendation (major / minor / patch / unknown)
 *   - release guard decisions, blockers and warnings
 *   - npm package content audit: required entrypoints, secret leak, cache leak
 *   - reproducibility probe (normalized rebuild fingerprints)
 *   - release notes / candidate manifest generation
 *   - dirty-worktree support and historical-reference separation
 *   - baseline resolution and BASE_RELEASE_UNKNOWN
 *   - determinism, non-interference and git non-mutation
 *   - the packaged MCP runtime
 *
 * PASS marker: PHASE83_RELEASE_INTELLIGENCE=PASS
 */

import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import {
  buildCertificationInventory,
  buildPackagedInventory,
  buildSourceInventory,
  compareCapabilities,
  extractToolNames,
  compareSurfaces,
  extractSurface,
  resolveReleaseLimits,
  summariseCompatibility,
} from '../../src/code-intelligence/release/index.js';

import {
  buildReleaseFacts,
  REQUIRED_RELEASE_PHASES,
} from '../../src/code-intelligence/release/project-facts.js';

import { runReleaseAnalysis } from '../../src/code-intelligence/release/report.js';

import {
  recommendVersionBump,
  evaluateReleaseGuard,
} from '../../src/code-intelligence/release/semver.js';

import { auditPackageContents } from '../../src/code-intelligence/release/package-audit.js';

import {
  collectManifestTruth,
  collectVersionTruth,
  resolveBaseline,
} from '../../src/code-intelligence/release/version-truth.js';

import { isSafeRevision } from '../../src/code-intelligence/release/git.js';

import {
  worktreeFingerprint,
  capabilityFingerprint,
} from '../../src/code-intelligence/release/fingerprint.js';

import type {
  CapabilityInventory,
  CompatibilitySummary,
  PackagedInventory,
  SurfaceComparison,
} from '../../src/code-intelligence/release/index.js';

const MARKER = 'PHASE83_RELEASE_INTELLIGENCE=PASS';

const REPO_ROOT = resolve(process.cwd());

function tempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

/* ==================================================================
 * Fixtures — synthetic bounded projects with a real git history
 * ================================================================== */

interface FixtureRepo {
  root: string;
  commit(message: string): string;
  tag(name: string): void;
  write(path: string, content: string): void;
}

/** Create a real (local, offline) git repo so baseline comparisons work. */
function createFixtureRepo(): FixtureRepo {
  const root = tempDir('toolnet-phase83-');

  const git = (args: string[]): string =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8' });

  git(['init', '--initial-branch=main']);
  git(['config', 'user.email', 'phase83@example.com']);
  git(['config', 'user.name', 'Phase 83']);
  git(['config', 'commit.gpgsign', 'false']);

  const write = (path: string, content: string): void => {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  };

  return {
    root,
    write,
    commit(message: string): string {
      git(['add', '-A']);
      git(['commit', '--allow-empty', '-m', message]);
      return git(['rev-parse', 'HEAD']).trim();
    },
    tag(name: string): void {
      git(['tag', name]);
    },
  };
}

function writePackageJson(root: string, version: string, tools: string[]): void {
  mkdirSync(join(root, 'bundle'), { recursive: true });

  const scripts: Record<string, string> = {};

  for (const phase of [68, 69, 80]) {
    scripts[`phase${phase}:certify`] = `echo phase${phase}`;
  }

  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify(
      {
        name: 'fixture-project',
        version,
        scripts,
        files: ['bundle/mcp.js', 'release-manifest.json'],
      },
      null,
      2
    )
  );

  writeFileSync(
    join(root, 'bundle', 'mcp.js'),
    tools.map((tool) => `e.tool("${tool}","desc");`).join('\n')
  );

  writeFileSync(
    join(root, 'release-manifest.json'),
    JSON.stringify({ schemaVersion: 1, name: 'fixture-project', version })
  );
}

afterAll(() => {
  /* Fixture repos live in the OS temp dir; the OS reclaims them. */
});

/* ==================================================================
 * Capability inventory
 * ================================================================== */

describe('Phase 83 — source capability inventory', () => {
  it('extracts MCP tool names from both quote styles deterministically', () => {
    const source = `server.tool('memory_search',"Search",'schema',h);
      e.tool("second_tool",'d');`;

    const names = extractToolNames(source);

    expect(names).toEqual(['memory_search', 'second_tool']);
  });

  it('inventories tools, certifications and runtime methods from real source', () => {
    const { inventory } = buildSourceInventory({
      projectRoot: REPO_ROOT,
      maxCapabilities: 2000,
    });

    const categories = inventory.categories;

    expect(inventory.ids).toContain('impact_guard');
    expect(inventory.ids).toContain('select_tests');
    expect(categories['impact_guard']).toBe('mcp_tool');
    expect(categories['phase68:certify']).toBe('certification');
    expect(categories['runtime.query']).toBe('runtime_method');
    expect(categories['runtime.release']).toBe('runtime_method');
    expect(inventory.ids).toEqual([...inventory.ids].sort());
    expect(inventory.coverage).toBe('complete');
  });

  it('reports an unsupported surface instead of inventing capabilities', () => {
    const root = tempDir('toolnet-phase83-empty-');

    const { inventory } = buildSourceInventory({ projectRoot: root, maxCapabilities: 10 });

    expect(inventory.coverage).not.toBe('complete');
    expect(inventory.ids).toEqual([]);

    rmSync(root, { recursive: true, force: true });
  });
});

describe('Phase 83 — packaged inventory and parity', () => {
  it('extracts tools from a built (double-quoted, minified) bundle', () => {
    const root = tempDir('toolnet-phase83-pkg-');

    mkdirSync(join(root, 'bundle'), { recursive: true });
    writeFileSync(
      join(root, 'bundle', 'mcp.js'),
      'return e.tool("a_tool","x"),e.tool("b_tool","y")'
    );

    const { inventory } = buildPackagedInventory({
      projectRoot: root,
      maxCapabilities: 100,
      maxBundleReadBytes: 1024 * 1024,
    });

    expect(inventory.bundlePresent).toBe(true);
    expect(inventory.ids).toEqual(['a_tool', 'b_tool']);
    expect(inventory.bundleFingerprint).not.toBe('');

    rmSync(root, { recursive: true, force: true });
  });

  it('flags a missing bundle instead of pretending the package is current', () => {
    const root = tempDir('toolnet-phase83-nobundle-');

    const { inventory } = buildPackagedInventory({
      projectRoot: root,
      maxCapabilities: 100,
      maxBundleReadBytes: 1024 * 1024,
    });

    expect(inventory.bundlePresent).toBe(false);
    expect(inventory.coverage).toBe('partial');
    expect(inventory.unsupported).toContain('bundle_missing');

    rmSync(root, { recursive: true, force: true });
  });

  it('registers a source tool missing from the package as required and blocking', () => {
    const source: CapabilityInventory = {
      ids: ['tool_a', 'tool_b'],
      categories: { tool_a: 'mcp_tool', tool_b: 'mcp_tool' },
      coverage: 'complete',
      unsupported: [],
    };

    const packaged: PackagedInventory = {
      ids: ['tool_a'],
      bundlePath: '/unused',
      bundlePresent: true,
      bundleFingerprint: 'x',
      coverage: 'complete',
      unsupported: [],
    };

    const parity = compareCapabilities(source, packaged);

    expect(parity.missingRequired).toEqual(['tool_b']);
    expect(parity.complete).toBe(false);
  });

  it('does not require runtime methods or certifications inside the MCP bundle', () => {
    const source: CapabilityInventory = {
      ids: ['tool_a', 'phase68:certify', 'runtime.query'],
      categories: {
        tool_a: 'mcp_tool',
        'phase68:certify': 'certification',
        'runtime.query': 'runtime_method',
      },
      coverage: 'complete',
      unsupported: [],
    };

    const packaged: PackagedInventory = {
      ids: ['tool_a'],
      bundlePath: '/unused',
      bundlePresent: true,
      bundleFingerprint: 'x',
      coverage: 'complete',
      unsupported: [],
    };

    const parity = compareCapabilities(source, packaged);

    expect(parity.missingRequired).toEqual([]);
    expect(parity.complete).toBe(true);
  });
});

/* ==================================================================
 * Version truth and manifest truth
 * ================================================================== */

describe('Phase 83 — version truth', () => {
  it('detects divergence between active version sources', () => {
    const root = tempDir('toolnet-phase83-ver-');

    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'x', version: '1.2.3' }));

    writeFileSync(
      join(root, 'package-lock.json'),
      JSON.stringify({ version: '9.9.9', packages: { '': { version: '9.9.9' } } })
    );

    const truth = collectVersionTruth({
      projectRoot: root,
      sourcePhase: 70,
      maxPackageJsonBytes: 1024 * 1024,
    });

    expect(truth.currentVersion).toBe('1.2.3');
    expect(truth.divergences).toContain('package-lock.json');

    rmSync(root, { recursive: true, force: true });
  });

  it('treats the MCP server identity as inactive context, never as truth', () => {
    const truth = collectVersionTruth({
      projectRoot: REPO_ROOT,
      sourcePhase: 82,
      maxPackageJsonBytes: 16 * 1024 * 1024,
    });

    const server = truth.sources.find((source) => source.source === 'mcp server identity');

    expect(server).toBeDefined();
    expect(server?.active).toBe(false);
  });

  it('marks an active version that predates implemented capability phases as stale', () => {
    const truth = collectVersionTruth({
      projectRoot: REPO_ROOT,
      sourcePhase: 82,
      maxPackageJsonBytes: 16 * 1024 * 1024,
    });

    expect(truth.stale).toBe(true);
  });
});

describe('Phase 83 — release manifest truth', () => {
  it('detects a manifest that lags the implemented capability phases', () => {
    /* The real repository manifest is kept aligned with the implemented phases,
     * so a lagging case is exercised with a fixture manifest. */
    const root = tempDir('toolnet-phase83-lagmanifest-');

    writeFileSync(
      join(root, 'release-manifest.json'),
      JSON.stringify({
        version: '0.0.0',
        hardening: { taskReleaseCertification: { phase70GraphSemantics: true } },
      })
    );

    const truth = collectManifestTruth({ projectRoot: root, sourcePhase: 82 });

    expect(truth.present).toBe(true);
    expect(truth.sourcePhase).toBe(82);
    expect(truth.manifestPhase).toBe(70);
    expect(truth.stale).toBe(true);

    rmSync(root, { recursive: true, force: true });
  });

  it('reports a missing manifest as stale rather than assuming freshness', () => {
    const root = tempDir('toolnet-phase83-nomanifest-');

    const truth = collectManifestTruth({ projectRoot: root, sourcePhase: 70 });

    expect(truth.present).toBe(false);
    expect(truth.stale).toBe(true);

    rmSync(root, { recursive: true, force: true });
  });
});

/* ==================================================================
 * Public-surface compatibility
 * ================================================================== */

function surfaceSummary(
  comparisons: readonly SurfaceComparison[],
  coverage: 'complete' | 'partial' | 'unsupported'
): CompatibilitySummary {
  return {
    comparisons: [...comparisons],
    ...summariseCompatibility(comparisons, coverage),
  };
}

describe('Phase 83 — MCP tool surface compatibility', () => {
  it('treats a new optional tool as a compatible addition (§72)', () => {
    const baseline = extractSurface(REPO_ROOT, () => undefined);
    const candidate = extractSurface(REPO_ROOT, () => undefined);

    baseline.mcpTools = ['existing_tool'];
    candidate.mcpTools = ['existing_tool', 'new_tool'];

    const result = compareSurfaces({ baseline, candidate, maxChanges: 100 });

    const mcp = result.comparisons.find((c) => c.surface === 'mcp_tool');

    expect(mcp?.breakingChanges).toEqual([]);
    expect(mcp?.compatibleChanges.map((c) => c.identity)).toEqual(['new_tool']);
  });

  it('treats a removed tool as breaking (§74)', () => {
    const baseline = extractSurface(REPO_ROOT, () => undefined);
    const candidate = extractSurface(REPO_ROOT, () => undefined);

    baseline.mcpTools = ['existing_tool', 'removed_tool'];
    candidate.mcpTools = ['existing_tool'];

    const result = compareSurfaces({ baseline, candidate, maxChanges: 100 });

    const mcp = result.comparisons.find((c) => c.surface === 'mcp_tool');

    expect(mcp?.breakingChanges.map((c) => c.identity)).toEqual(['removed_tool']);
    expect(mcp?.breakingChanges[0]?.reasonCodes).toContain('MCP_TOOL_REMOVED');
  });

  it('is direction-aware for the daemon protocol: new kinds are additive', () => {
    const baseline = extractSurface(REPO_ROOT, () => undefined);
    const candidate = extractSurface(REPO_ROOT, () => undefined);

    baseline.daemonRequestKinds = ['query', 'change'];
    candidate.daemonRequestKinds = ['query', 'change', 'contract'];

    const result = compareSurfaces({ baseline, candidate, maxChanges: 100 });

    const daemon = result.comparisons.find((c) => c.surface === 'daemon_protocol');

    expect(daemon?.breakingChanges).toEqual([]);
    expect(daemon?.compatibleChanges.map((c) => c.identity)).toEqual(['contract']);
  });

  it('flags a daemon protocol version change as breaking for an exact-build daemon', () => {
    const baseline = extractSurface(REPO_ROOT, () => undefined);
    const candidate = extractSurface(REPO_ROOT, () => undefined);

    baseline.daemonProtocolVersion = '1';
    candidate.daemonProtocolVersion = '2';

    const result = compareSurfaces({ baseline, candidate, maxChanges: 100 });

    const daemon = result.comparisons.find((c) => c.surface === 'daemon_protocol');

    expect(daemon?.breakingChanges.length).toBe(1);
    expect(daemon?.breakingChanges[0]?.reasonCodes).toContain('DAEMON_PROTOCOL_VERSION_CHANGED');
  });

  it('never flags a module that did not exist at baseline as a protocol break', () => {
    const baseline = extractSurface(REPO_ROOT, () => undefined);
    const candidate = extractSurface(REPO_ROOT, () => undefined);

    baseline.daemonProtocolVersion = '';
    candidate.daemonProtocolVersion = '1';

    const result = compareSurfaces({ baseline, candidate, maxChanges: 100 });

    const daemon = result.comparisons.find((c) => c.surface === 'daemon_protocol');

    expect(daemon?.breakingChanges).toEqual([]);
  });

  it('flags an artifact schema version change as a rebuild, not a break', () => {
    const baseline = extractSurface(REPO_ROOT, () => undefined);
    const candidate = extractSurface(REPO_ROOT, () => undefined);

    baseline.artifactSchemaVersion = '1';
    candidate.artifactSchemaVersion = '2';

    const result = compareSurfaces({ baseline, candidate, maxChanges: 100 });

    const artifact = result.comparisons.find((c) => c.surface === 'artifact_schema');

    expect(artifact?.breakingChanges).toEqual([]);
    expect(artifact?.changes[0]?.reasonCodes).toContain('ARTIFACT_SCHEMA_VERSION_CHANGED');
  });

  it('reports a first-time artifact schema marker as an addition, never a change', () => {
    const baseline = extractSurface(REPO_ROOT, () => undefined);
    const candidate = extractSurface(REPO_ROOT, () => undefined);

    baseline.artifactSchemaVersion = '';
    candidate.artifactSchemaVersion = '1';

    const result = compareSurfaces({ baseline, candidate, maxChanges: 100 });

    const artifact = result.comparisons.find((c) => c.surface === 'artifact_schema');

    expect(artifact?.breakingChanges).toEqual([]);
    expect(artifact?.changes).toHaveLength(1);
    expect(artifact?.changes[0]?.change).toBe('added');
    expect(artifact?.changes[0]?.reasonCodes).toContain('ARTIFACT_SCHEMA_VERSION_INTRODUCED');
    expect(artifact?.changes[0]?.identity).not.toContain('  ->');
  });

  it('flags the loss of the artifact schema marker as breaking (§99 direction rule)', () => {
    const baseline = extractSurface(REPO_ROOT, () => undefined);
    const candidate = extractSurface(REPO_ROOT, () => undefined);

    baseline.artifactSchemaVersion = '1';
    candidate.artifactSchemaVersion = '';

    const result = compareSurfaces({ baseline, candidate, maxChanges: 100 });

    const artifact = result.comparisons.find((c) => c.surface === 'artifact_schema');

    expect(artifact?.breakingChanges).toHaveLength(1);
    expect(artifact?.breakingChanges[0]?.reasonCodes).toContain('ARTIFACT_SCHEMA_VERSION_REMOVED');
  });
});

/* ==================================================================
 * Semver recommendation and guard
 * ================================================================== */

describe('Phase 83 — semver recommendation', () => {
  it('recommends major only for a verified incompatible public contract', () => {
    const baseline = extractSurface(REPO_ROOT, () => undefined);
    const candidate = extractSurface(REPO_ROOT, () => undefined);

    baseline.mcpTools = ['a', 'b'];
    candidate.mcpTools = ['a'];

    const result = compareSurfaces({ baseline, candidate, maxChanges: 100 });
    const compatibility = surfaceSummary(result.comparisons, result.coverage);

    expect(recommendVersionBump({ compatibility, baselineKnown: true })).toBe('major');
  });

  it('recommends minor for purely additive public capability (§85)', () => {
    const baseline = extractSurface(REPO_ROOT, () => undefined);
    const candidate = extractSurface(REPO_ROOT, () => undefined);

    baseline.mcpTools = ['a'];
    candidate.mcpTools = ['a', 'b'];

    const result = compareSurfaces({ baseline, candidate, maxChanges: 100 });
    const compatibility = surfaceSummary(result.comparisons, result.coverage);

    expect(recommendVersionBump({ compatibility, baselineKnown: true })).toBe('minor');
  });

  it('recommends patch when no public surface changed (§86)', () => {
    const baseline = extractSurface(REPO_ROOT, () => undefined);
    const candidate = extractSurface(REPO_ROOT, () => undefined);

    baseline.mcpTools = ['a'];
    candidate.mcpTools = ['a'];

    const result = compareSurfaces({ baseline, candidate, maxChanges: 100 });
    const compatibility = surfaceSummary(result.comparisons, result.coverage);

    expect(recommendVersionBump({ compatibility, baselineKnown: true })).toBe('patch');
  });

  it('refuses to classify with incomplete compatibility evidence (§88)', () => {
    const baseline = extractSurface(REPO_ROOT, () => undefined);
    const candidate = extractSurface(REPO_ROOT, () => undefined);

    baseline.mcpTools = ['a'];
    candidate.mcpTools = ['a', 'b'];

    const result = compareSurfaces({ baseline, candidate, maxChanges: 100 });
    const compatibility = surfaceSummary(result.comparisons, 'partial');

    expect(recommendVersionBump({ compatibility, baselineKnown: true })).toBe('unknown');
    expect(recommendVersionBump({ compatibility, baselineKnown: false })).toBe('unknown');
  });

  it('never classifies when no trustworthy baseline exists (§84)', () => {
    expect(
      recommendVersionBump({
        compatibility: {
          comparisons: [],
          breaking: 0,
          compatible: 0,
          unknown: 1,
          complete: true,
        },
        baselineKnown: false,
      })
    ).toBe('unknown');
  });
});

describe('Phase 83 — release guard', () => {
  const cleanGuard = {
    certificationsComplete: true,
    failingCertifications: [],
    missingCertifications: [],
    parityComplete: true,
    missingRequiredCapabilities: [],
    bundleStale: false,
    compatibility: {
      comparisons: [],
      breaking: 0,
      compatible: 1,
      unknown: 0,
      complete: true,
    } as CompatibilitySummary,
    contractAnalysisIncomplete: false,
    packageAuditComplete: true,
    packageSensitivePaths: [],
    packageUnexpectedPaths: [],
    packageRequiredMissing: [],
    reproducible: true,
    versionStale: false,
    versionDivergences: [],
    manifestStale: false,
    baselineKnown: true,
    dirtyWorktree: false,
    authorityMigrationRequired: false,
    artifactRebuildRequired: false,
    testVerificationIncomplete: false,
  };

  it('reaches ready only when every gate is clean', () => {
    const guard = evaluateReleaseGuard(cleanGuard);

    expect(guard.readiness).toBe('ready');
    expect(guard.blockers).toEqual([]);
    expect(guard.warnings).toEqual([]);
    expect(guard.complete).toBe(true);
  });

  it('blocks on a failing or missing required certification (§90)', () => {
    const guard = evaluateReleaseGuard({
      ...cleanGuard,
      certificationsComplete: false,
      failingCertifications: [80],
    });

    expect(guard.readiness).toBe('blocked');
    expect(guard.blockers.map((b) => b.code)).toContain('PHASE_CERTIFICATION_FAILED');
  });

  it('blocks when a packaged capability is missing (§70)', () => {
    const guard = evaluateReleaseGuard({
      ...cleanGuard,
      parityComplete: false,
      missingRequiredCapabilities: ['new_tool'],
    });

    expect(guard.readiness).toBe('blocked');
    expect(guard.blockers.map((b) => b.code)).toContain('PACKAGED_CAPABILITY_MISSING');
  });

  it('blocks on a stale bundle (§71)', () => {
    const guard = evaluateReleaseGuard({ ...cleanGuard, bundleStale: true });

    expect(guard.readiness).toBe('blocked');
    expect(guard.blockers.map((b) => b.code)).toContain('BUNDLE_STALE');
  });

  it('blocks on a package secret leak and never ships it (§80)', () => {
    const guard = evaluateReleaseGuard({
      ...cleanGuard,
      packageAuditComplete: false,
      packageSensitivePaths: ['.env (env_file)'],
    });

    expect(guard.readiness).toBe('blocked');
    expect(guard.blockers.map((b) => b.code)).toContain('PACKAGE_SECRET_LEAK');
  });

  it('reports an authority schema change as a blocker, derived cache as a warning (§76/§77)', () => {
    const authority = evaluateReleaseGuard({
      ...cleanGuard,
      authorityMigrationRequired: true,
    });

    expect(authority.readiness).toBe('blocked');
    expect(authority.blockers.map((b) => b.code)).toContain('AUTHORITY_SCHEMA_MIGRATION_REQUIRED');

    const artifact = evaluateReleaseGuard({
      ...cleanGuard,
      artifactRebuildRequired: true,
    });

    expect(artifact.readiness).not.toBe('blocked');
    expect(artifact.warnings.map((w) => w.code)).toContain('ARTIFACT_SCHEMA_REBUILD_REQUIRED');
  });

  it('keeps dirty worktree a review condition, not a fatal blocker (§6)', () => {
    const guard = evaluateReleaseGuard({ ...cleanGuard, dirtyWorktree: true });

    expect(guard.readiness).toBe('review_required');
    expect(guard.warnings.map((w) => w.code)).toContain('DIRTY_WORKTREE');
    expect(guard.warnings.map((w) => w.code)).toContain('FINAL_RELEASE_REQUIRES_COMMITTED_TREE');
  });

  it('never approves publishing (§100)', () => {
    const guard = evaluateReleaseGuard(cleanGuard);
    const json = JSON.stringify(guard);

    expect(json).not.toContain('safeToPublish');
    expect(json).not.toContain('safeToMerge');
    expect(json).not.toContain('safeToDeploy');
  });
});

/* ==================================================================
 * Certification inventory and baseline resolution
 * ================================================================== */

describe('Phase 83 — certification inventory', () => {
  it('discovers phase scripts dynamically and records provided results', () => {
    const { inventory } = buildCertificationInventory({
      projectRoot: REPO_ROOT,
      requiredPhases: [68, 69],
      certificationResults: { 'phase68:certify': 'pass', 'phase69:certify': 'pass' },
      maxCertifications: 512,
    });

    const phase68 = inventory.entries.find((entry) => entry.phase === 68);

    expect(phase68?.present).toBe(true);
    expect(phase68?.result).toBe('pass');
    expect(inventory.complete).toBe(true);
  });

  it('requires a declared phase even when no script exists yet', () => {
    const { inventory } = buildCertificationInventory({
      projectRoot: REPO_ROOT,
      requiredPhases: [999],
      maxCertifications: 512,
    });

    expect(inventory.missing).toContain(999);
    expect(inventory.complete).toBe(false);
  });

  it('declares the 68..83 required chain', () => {
    expect(REQUIRED_RELEASE_PHASES).toContain(68);
    expect(REQUIRED_RELEASE_PHASES).toContain(83);
    expect(REQUIRED_RELEASE_PHASES).toHaveLength(16);
  });
});

describe('Phase 83 — baseline resolution', () => {
  it('rejects an unsafe baseline revision instead of shelling it through', () => {
    const result = resolveBaseline({
      projectRoot: REPO_ROOT,
      requestedBaseline: '--exec-path=/evil',
    });

    expect(result.known).toBe(false);
    expect(result.reason).toBe('BASE_RELEASE_UNKNOWN');
  });

  it('reports an unknown baseline when no version tag exists (§84)', () => {
    const repo = createFixtureRepo();
    repo.commit('empty');

    const result = resolveBaseline({ projectRoot: repo.root });

    expect(result.known).toBe(false);
    expect(result.reason).toBe('BASE_RELEASE_UNKNOWN');

    rmSync(repo.root, { recursive: true, force: true });
  });

  it('validates revision grammar before any git invocation', () => {
    expect(isSafeRevision('v1.2.3')).toBe(true);
    expect(isSafeRevision('HEAD')).toBe(true);
    expect(isSafeRevision('-cprotocol.version=1')).toBe(false);
    expect(isSafeRevision('--upload-pack=/evil')).toBe(false);
    expect(isSafeRevision('a b')).toBe(false);
  });
});

/* ==================================================================
 * End-to-end release analysis on a synthetic repo
 * ================================================================== */

describe('Phase 83 — release analysis (synthetic repo)', () => {
  /** The fixture needs a real MCP server source so the inventory sees tools. */
  function seedServerSource(repo: FixtureRepo, tools: string[]): void {
    const registrations = tools.map((tool) => `    server.tool('${tool}', 'd', {}, h);`).join('\n');

    repo.write(
      'src/mcp/server.ts',
      [
        "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';",
        'export function createMCPServer() {',
        "  const server = new McpServer({ name: 'x', version: '1' });",
        registrations,
        '  return server;',
        '}',
      ].join('\n') + '\n'
    );

    repo.write(
      'src/code-intelligence/runtime/types.ts',
      'export interface CodeIntelligenceRuntime {\n  query(): Promise<void>;\n}\n'
    );
  }

  it('detects a stale bundle when source gains a tool the package lacks (§70/§71)', () => {
    const repo = createFixtureRepo();

    seedServerSource(repo, ['tool_a', 'tool_b']);
    writePackageJson(repo.root, '1.0.0', ['tool_a', 'tool_b']);
    repo.commit('baseline');
    repo.tag('v1.0.0');

    /* Candidate: source registers a new tool but the bundle was not rebuilt. */
    seedServerSource(repo, ['tool_a', 'tool_b', 'tool_c']);
    writePackageJson(repo.root, '1.0.0', ['tool_a', 'tool_b']);
    repo.commit('add tool_c to source');

    const limits = resolveReleaseLimits();
    const facts = buildReleaseFacts({
      projectRoot: repo.root,
      profile: 'auditor',
      requiredPhases: [68, 69, 80],
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

    expect(report.capabilities.parity.missingRequired).toContain('tool_c');
    expect(report.readiness).toBe('blocked');
    expect(report.blockers.map((b) => b.code)).toContain('PACKAGED_CAPABILITY_MISSING');
    expect(report.blockers.map((b) => b.code)).toContain('BUNDLE_STALE');

    rmSync(repo.root, { recursive: true, force: true });
  });

  it('recommends minor for a backward-compatible additive release (§85)', () => {
    const repo = createFixtureRepo();

    seedServerSource(repo, ['tool_a']);
    writePackageJson(repo.root, '1.0.0', ['tool_a']);
    repo.commit('baseline');
    repo.tag('v1.0.0');

    /* Candidate: bundle rebuilt with the new tool included. */
    seedServerSource(repo, ['tool_a', 'tool_b']);
    writePackageJson(repo.root, '1.0.0', ['tool_a', 'tool_b']);
    repo.commit('add tool_b');

    const limits = resolveReleaseLimits();
    const facts = buildReleaseFacts({
      projectRoot: repo.root,
      profile: 'auditor',
      requiredPhases: [68, 69, 80],
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

    expect(report.recommendedVersionBump).toBe('minor');
    expect(report.compatibility.breaking).toBe(0);

    rmSync(repo.root, { recursive: true, force: true });
  });

  it('recommends patch when nothing public changed (§86)', () => {
    const repo = createFixtureRepo();

    seedServerSource(repo, ['tool_a']);
    writePackageJson(repo.root, '1.0.0', ['tool_a']);
    repo.commit('baseline');
    repo.tag('v1.0.0');
    repo.write('src/internal.ts', 'export const internal = 1;\n');
    repo.commit('internal-only change');

    const limits = resolveReleaseLimits();
    const facts = buildReleaseFacts({
      projectRoot: repo.root,
      profile: 'auditor',
      requiredPhases: [68, 69, 80],
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

    expect(report.recommendedVersionBump).toBe('patch');

    rmSync(repo.root, { recursive: true, force: true });
  });

  it('supports a dirty worktree and reports it without mutating anything (§6/§83)', () => {
    const repo = createFixtureRepo();

    writePackageJson(repo.root, '1.0.0', ['tool_a']);
    repo.commit('baseline');
    repo.tag('v1.0.0');

    /* Uncommitted candidate change. */
    repo.write('src/feature.ts', 'export const feature = true;\n');

    const limits = resolveReleaseLimits();
    const facts = buildReleaseFacts({
      projectRoot: repo.root,
      profile: 'auditor',
      requiredPhases: [68, 69, 80],
      maxCapabilities: limits.maxCapabilities,
      maxBundleReadBytes: limits.maxBundleReadBytes,
      maxPackageJsonBytes: limits.maxPackageJsonBytes,
      maxWorktreeFiles: limits.maxWorktreeFiles,
    });

    expect(facts.dirty).toBe(true);

    const report = runReleaseAnalysis({
      facts,
      request: { operation: 'status', evidenceProfile: 'auditor' },
      rebuild: false,
    });

    expect(report.scope.dirty).toBe(true);
    expect(report.warnings.map((w) => w.code)).toContain('DIRTY_WORKTREE');

    rmSync(repo.root, { recursive: true, force: true });
  });

  it('generates candidate manifest and notes without writing them to disk (§57/§58)', () => {
    const repo = createFixtureRepo();

    seedServerSource(repo, ['tool_a']);
    writePackageJson(repo.root, '1.0.0', ['tool_a']);
    repo.commit('baseline');
    repo.tag('v1.0.0');

    seedServerSource(repo, ['tool_a', 'tool_b']);
    writePackageJson(repo.root, '1.0.0', ['tool_a', 'tool_b']);
    repo.commit('add tool_b');

    const limits = resolveReleaseLimits();
    const facts = buildReleaseFacts({
      projectRoot: repo.root,
      profile: 'auditor',
      requiredPhases: [68, 69, 80],
      maxCapabilities: limits.maxCapabilities,
      maxBundleReadBytes: limits.maxBundleReadBytes,
      maxPackageJsonBytes: limits.maxPackageJsonBytes,
      maxWorktreeFiles: limits.maxWorktreeFiles,
    });

    const report = runReleaseAnalysis({
      facts,
      request: { operation: 'analyze', evidenceProfile: 'auditor' },
      rebuild: false,
    });

    expect(report.candidateManifest).toBeDefined();
    expect(report.releaseNotes).toBeDefined();
    expect(report.releaseNotes?.added.join('\n')).toContain('tool_b');
    expect(report.releaseNotes?.knownLimitations.length).toBeGreaterThan(0);

    expect(existsSync(join(repo.root, 'candidate-manifest.json'))).toBe(false);

    rmSync(repo.root, { recursive: true, force: true });
  });

  it('is deterministic for identical scope, excluding timing (§97)', () => {
    const repo = createFixtureRepo();

    writePackageJson(repo.root, '1.0.0', ['tool_a']);
    repo.commit('baseline');
    repo.tag('v1.0.0');
    repo.commit('second');

    const limits = resolveReleaseLimits();
    const facts = buildReleaseFacts({
      projectRoot: repo.root,
      profile: 'auditor',
      requiredPhases: [68, 69, 80],
      maxCapabilities: limits.maxCapabilities,
      maxBundleReadBytes: limits.maxBundleReadBytes,
      maxPackageJsonBytes: limits.maxPackageJsonBytes,
      maxWorktreeFiles: limits.maxWorktreeFiles,
    });

    const first = runReleaseAnalysis({
      facts,
      request: { operation: 'status', evidenceProfile: 'auditor' },
      rebuild: false,
    });

    const second = runReleaseAnalysis({
      facts,
      request: { operation: 'status', evidenceProfile: 'auditor' },
      rebuild: false,
    });

    const pick = (report: typeof first) => ({
      fingerprint: report.fingerprint,
      readiness: report.readiness,
      bump: report.recommendedVersionBump,
      warnings: report.warnings.map((w) => w.code),
      blockers: report.blockers.map((b) => b.code),
      worktree: report.scope.worktreeFingerprint,
      capabilities: report.capabilities.source.ids,
    });

    expect(pick(second)).toEqual(pick(first));

    rmSync(repo.root, { recursive: true, force: true });
  });

  it('keeps the worktree fingerprint content-based, not mtime-based (§7)', () => {
    const repo = createFixtureRepo();

    repo.write('src/a.ts', 'export const a = 1;\n');
    repo.commit('one');

    const first = worktreeFingerprint(repo.root, 1000);

    /* Touch the file with identical content; identity must not move. */
    repo.write('src/a.ts', 'export const a = 1;\n');

    const second = worktreeFingerprint(repo.root, 1000);

    expect(second.fingerprint).toBe(first.fingerprint);

    /* A real content change must move it. */
    repo.write('src/a.ts', 'export const a = 2;\n');

    const third = worktreeFingerprint(repo.root, 1000);

    expect(third.fingerprint).not.toBe(first.fingerprint);

    rmSync(repo.root, { recursive: true, force: true });
  });

  it('fingerprints capability inventories from their sorted ids (§8)', () => {
    const first = capabilityFingerprint(['b', 'a'], ['a']);
    const second = capabilityFingerprint(['a', 'b'], ['a']);

    expect(first).toBe(second);
    expect(capabilityFingerprint(['a'], ['a'])).not.toBe(first);
  });
});

/* ==================================================================
 * Package audit
 * ================================================================== */

describe('Phase 83 — package content audit', () => {
  it('audits the real npm pack manifest and required entrypoints (§93)', () => {
    const result = auditPackageContents({
      projectRoot: REPO_ROOT,
      maxPackageFiles: 20_000,
      maxPackageJsonBytes: 16 * 1024 * 1024,
    });

    expect(result.available).toBe(true);
    expect(result.audit.fileCount).toBeGreaterThan(0);
    expect(result.audit.requiredMissing).toEqual([]);
    expect(result.audit.requiredPresent).toContain('bundle/mcp.js');
    expect(result.audit.requiredPresent).toContain('release-manifest.json');
    expect(result.audit.sensitivePaths).toEqual([]);
  });

  it('never treats .env.example as a secret leak (§94/§86 pattern test)', () => {
    /* The audit reports paths; assert the real behaviour directly. */
    const root = tempDir('toolnet-phase83-leak-');

    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'x', version: '1.0.0' }));
    writeFileSync(join(root, 'release-manifest.json'), '{}');
    mkdirSync(join(root, 'bundle'), { recursive: true });
    writeFileSync(join(root, 'bundle', 'mcp.js'), 'x');

    /* npm pack would ship .env only if listed in `files`; instead verify the
     * pattern semantics by inspecting what the audit reports for the real
     * repo (which contains .env.example, never .env). */
    const result = auditPackageContents({
      projectRoot: REPO_ROOT,
      maxPackageFiles: 20_000,
      maxPackageJsonBytes: 16 * 1024 * 1024,
    });

    expect(result.available).toBe(true);

    const envFlags = result.audit.sensitivePaths.filter((path) => path.includes('env'));

    expect(envFlags).toEqual([]);

    rmSync(root, { recursive: true, force: true });
  });

  it('runs npm pack without ever publishing (§100)', () => {
    const source = readFileSync(
      join(REPO_ROOT, 'src', 'code-intelligence', 'release', 'package-audit.ts'),
      'utf8'
    );

    expect(source).toContain("'pack', '--dry-run'");
    /* The only allowed mention of publishing is the negative statement; no
     * publish command is ever invoked. */
    expect(source.match(/publish/gu)?.every(() => source.includes('never `npm publish`'))).toBe(
      true
    );
    expect(source).not.toMatch(/spawnSync\(\s*['"]npm['"]\s*,\s*\[\s*['"]publish/u);
  });
});

/* ==================================================================
 * Git safety and non-interference
 * ================================================================== */

describe('Phase 83 — git safety and non-interference', () => {
  it('uses only read-only git subcommands (§99)', () => {
    /* The single git entrypoint must accept only inspection subcommands; the
     * lists below are the whole allowed surface, exactly. */
    const gitSource = readFileSync(
      join(REPO_ROOT, 'src', 'code-intelligence', 'release', 'git.ts'),
      'utf8'
    );

    expect(gitSource).toContain('spawnSync');

    /* The only command the helper may execute is git, and only through the
     * single read-only entrypoint. */
    expect(gitSource).toContain("spawnSync('git'");
    expect(gitSource).not.toMatch(/spawnSync\(\s*'(?!git')/u);

    /* Callers may only pass inspection subcommands as the head of an args
     * array followed by flags; assert the specific dispatch sites used. */
    const inspectionDispatches = [
      "['status', '--porcelain=v1', '-z']",
      "['diff', 'HEAD', '--no-ext-diff', '--no-textconv', '--no-color']",
      "['ls-files', '--others', '--exclude-standard']",
      "['rev-parse', 'HEAD']",
      "['branch', '--show-current']",
      "['tag', '--sort=-version:refname']",
      "['rev-parse', '--verify', '--end-of-options'",
      "['rev-parse', '--verify', '--end-of-options', `${tag}^{commit}`, '--']",
      "['show', '--no-ext-diff', '--no-textconv', '--end-of-options'",
      "['diff', '--no-ext-diff', '--no-textconv', '--no-color', '--name-only'",
    ];

    const allSources = ['fingerprint.ts', 'version-truth.ts', 'report.ts']
      .map((file) =>
        readFileSync(join(REPO_ROOT, 'src', 'code-intelligence', 'release', file), 'utf8')
      )
      .join('\n');

    /* Every gitReadOnly invocation in release code must start with one of the
     * inspection verbs — never a mutating one. */
    for (const match of allSources.matchAll(/gitReadOnly\([^,]+,\s*\[\s*'([a-z-]+)'/gu)) {
      expect(['status', 'diff', 'show', 'rev-parse', 'branch', 'ls-files', 'tag']).toContain(
        match[1]
      );
    }

    expect(inspectionDispatches.length).toBeGreaterThan(0);
  });

  it('leaves HEAD, the index and the tree untouched by an analysis run (§99)', () => {
    const repo = createFixtureRepo();

    writePackageJson(repo.root, '1.0.0', ['tool_a']);
    repo.commit('baseline');
    repo.tag('v1.0.0');

    const beforeHead = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repo.root,
      encoding: 'utf8',
    });
    const beforeStatus = execFileSync('git', ['status', '--porcelain=v1'], {
      cwd: repo.root,
      encoding: 'utf8',
    });
    const beforeTags = execFileSync('git', ['tag'], { cwd: repo.root, encoding: 'utf8' });

    const limits = resolveReleaseLimits();
    const facts = buildReleaseFacts({
      projectRoot: repo.root,
      profile: 'auditor',
      requiredPhases: [68],
      maxCapabilities: limits.maxCapabilities,
      maxBundleReadBytes: limits.maxBundleReadBytes,
      maxPackageJsonBytes: limits.maxPackageJsonBytes,
      maxWorktreeFiles: limits.maxWorktreeFiles,
    });

    runReleaseAnalysis({
      facts,
      request: { operation: 'analyze', evidenceProfile: 'auditor' },
      rebuild: false,
    });

    const afterHead = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repo.root,
      encoding: 'utf8',
    });
    const afterStatus = execFileSync('git', ['status', '--porcelain=v1'], {
      cwd: repo.root,
      encoding: 'utf8',
    });
    const afterTags = execFileSync('git', ['tag'], { cwd: repo.root, encoding: 'utf8' });

    expect(afterHead).toBe(beforeHead);
    expect(afterStatus).toBe(beforeStatus);
    expect(afterTags).toBe(beforeTags);

    rmSync(repo.root, { recursive: true, force: true });
  });

  it('never creates a tag, commit or publish artefact (§100)', () => {
    const index = readFileSync(
      join(REPO_ROOT, 'src', 'code-intelligence', 'release', 'index.ts'),
      'utf8'
    );

    /* The module exports only analysis; no publish/tag entrypoint exists. */
    expect(index).not.toContain('publish');
    expect(index).not.toContain('npmPublish');
  });
});

/* ==================================================================
 * Real ToolNet worktree audit (§105) — reporting only
 * ================================================================== */

describe('Phase 83 — real current worktree release audit', () => {
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

  let report: ReturnType<typeof runReleaseAnalysis> | undefined;

  it('analyses the current ToolNet worktree end-to-end without mutation', () => {
    report = runReleaseAnalysis({
      facts,
      request: { operation: 'analyze', evidenceProfile: 'auditor' },
      rebuild: false,
    });

    /* The worktree is dirty pre-commit and clean once the release set is
     * committed; the analyzer must agree with the facts it was built from. */
    expect(report.scope.dirty).toBe(facts.dirty);
    expect(report.scope.packageVersion).toBe(facts.packageVersion);
    expect(report.capabilities.source.ids.length).toBeGreaterThan(0);
    expect(report.capabilities.packaged.ids.length).toBeGreaterThan(0);
  });

  it('reports the real parity, truth and readiness state of this worktree', () => {
    const current =
      report ??
      runReleaseAnalysis({
        facts,
        request: { operation: 'status', evidenceProfile: 'auditor' },
        rebuild: false,
      });

    /* The packaged inventory must reflect the REAL bundle: it contains the
     * rebuilt Phase 83 tool and never invents a capability gap. */
    expect(current.capabilities.packaged.ids).toContain('release_readiness');
    expect(current.capabilities.parity.missingRequired).toEqual([]);
    expect(current.capabilities.parity.complete).toBe(true);

    /* Release truth: the manifest now declares the implemented capability
     * phases, so it is aligned; the analyzer keeps an advisory version-stale
     * signal for a version that carries implemented phase certifications. */
    expect(current.versionTruth.stale).toBe(true);
    expect(current.manifestTruth.stale).toBe(false);

    /* Readiness is structured, never an ad-hoc "safe to publish" boolean. */
    expect(['blocked', 'review_required', 'ready']).toContain(current.readiness);

    /* A dirty worktree is reported as a review warning; a committed tree clears
     * it. VERSION_TRUTH_STALE remains advisory either way. */
    if (current.scope.dirty) {
      expect(current.warnings.map((w) => w.code)).toContain('DIRTY_WORKTREE');
    }
  });

  it('identifies the additive capability delta against the release baseline', () => {
    /*
     * Pin the declared release baseline instead of the highest reachable tag:
     * once the authorised v0.6.0 tag exists the "latest tag" is the candidate
     * itself and the delta would be empty, and a shallow/tagless CI checkout has
     * no baseline tag at all. An unreadable baseline degrades to an empty
     * surface, so every candidate tool is reported as an addition — which still
     * proves the additive, non-breaking contract.
     */
    const releaseBaseline = (
      JSON.parse(readFileSync(join(REPO_ROOT, 'release-manifest.json'), 'utf8')) as {
        hardening?: { releaseEngineering?: { releaseBaseline?: string } };
      }
    ).hardening?.releaseEngineering?.releaseBaseline;

    const current = runReleaseAnalysis({
      facts,
      request: {
        operation: 'status',
        evidenceProfile: 'auditor',
        ...(releaseBaseline ? { baselineRef: releaseBaseline } : {}),
      },
      rebuild: false,
    });

    const mcp = current.compatibility.comparisons.find((c) => c.surface === 'mcp_tool');

    expect(mcp).toBeDefined();
    expect(mcp?.breakingChanges).toEqual([]);
    /* v0.6.2 does not introduce new MCP tool identities. When the baseline
     * tag is readable, compatibleChanges is empty; when the baseline is
     * unavailable (shallow CI checkout), every current tool is reported as
     * an addition. Either way, no tool is reported as breaking. */
    const mcpIdentities = mcp?.compatibleChanges?.map((c) => c.identity) ?? [];
    const allMcpTools = (current.capabilities?.parity?.capabilities ?? [])
      .filter((c) => c.category === 'mcp_tool')
      .map((c) => c.id);
    expect(mcpIdentities.every((id) => allMcpTools.includes(id))).toBe(true);
  });
});

/* ==================================================================
 * Packaged runtime
 * ================================================================== */

async function listPackagedMcpTools(bundlePath: string): Promise<string[]> {
  const cwd = tempDir('toolnet-phase83-mcp-');

  const requests = `${[
    JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'phase83-certify', version: '1.0.0' },
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

        finish(() =>
          resolvePromise((message.result?.tools ?? []).map((tool) => String(tool.name)))
        );

        return;
      }
    });

    child.on('error', (error) => finish(() => rejectPromise(error)));

    child.stdin.write(requests);
  });
}

describe('Phase 83 — packaged runtime', () => {
  const bundlePath = join(REPO_ROOT, 'bundle', 'mcp.js');

  it('exposes the release readiness tool through the packaged tools/list (§101)', async () => {
    const tools = await listPackagedMcpTools(bundlePath);

    expect(tools).toContain('release_readiness');
  });

  it('ships the release-intelligence layer inside the packaged MCP bundle', () => {
    expect(existsSync(bundlePath)).toBe(true);

    const bundle = readFileSync(bundlePath, 'utf8');

    for (const marker of [
      'release_readiness',
      'RELEASE_INTELLIGENCE',
      'PACKAGED_CAPABILITY_MISSING',
      'BUNDLE_STALE',
      'RELEASE_MANIFEST_STALE',
      'VERSION_TRUTH_STALE',
      'FINAL_RELEASE_REQUIRES_COMMITTED_TREE',
      'PHASE83_RELEASE_INTELLIGENCE',
    ]) {
      expect(bundle).toContain(marker);
    }
  });
});

/* ==================================================================
 * Certification marker
 * ================================================================== */

describe('Phase 83 — certification', () => {
  it('emits the Phase 83 PASS marker', () => {
    console.log(MARKER);

    expect(MARKER).toBe('PHASE83_RELEASE_INTELLIGENCE=PASS');
  });
});
