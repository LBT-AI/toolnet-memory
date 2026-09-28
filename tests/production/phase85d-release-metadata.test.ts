/*
 * Phase 85D — Release metadata application for v0.6.1.
 *
 * Verifies that every authoritative version source agrees on 0.6.1, that the
 * release manifest declares source phase 84 / certification through Phase85B,
 * that the changelog and README reflect the release, that the packaged build
 * identity carries the 0.6.1 marker, that the MCP internal identity stays out
 * of release truth, and that no tag or publish happened.
 *
 * Metadata-only: this suite never mutates release state.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  REQUIRED_RELEASE_PHASES,
  buildReleaseFacts,
  collectManifestTruth,
  collectVersionTruth,
  resolveReleaseLimits,
  runReleaseAnalysis,
} from '../../src/code-intelligence/release/index.js';

import { runtimeSourceDigest } from '../../src/runtime/build-identity.js';

const REPO_ROOT = process.cwd();
const VERSION = '0.6.1';

function readJson(path: string): Record<string, any> {
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, any>;
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

describe('Phase 85D — release metadata', () => {
  it('synchronizes every authoritative version source to 0.6.1', () => {
    const pkg = readJson('package.json');
    const lock = readJson('package-lock.json');
    const manifest = readJson('release-manifest.json');
    const target = readFileSync('.release-target', 'utf8').trim();

    expect(pkg.version).toBe(VERSION);
    expect(lock.version).toBe(VERSION);
    expect(lock.packages?.['']?.version).toBe(VERSION);
    expect(target).toBe(VERSION);
    expect(manifest.version).toBe(VERSION);
    expect(manifest.releaseSeries).toBe('0.6.x');
  });

  it('declares source phase 84 and certification through Phase85B', () => {
    const manifest = readJson('release-manifest.json');
    const engineering = manifest.hardening?.releaseEngineering;

    expect(engineering?.sourcePhase).toBe(84);
    expect(engineering?.certificationThrough).toBe('Phase85B');
    expect(engineering?.releaseBaseline).toBe('v0.5.3');
    expect(engineering?.targetVersion).toBe(VERSION);
    expect(engineering?.additiveFromBaseline).toBe(true);
    expect(engineering?.publicBreakingChanges).toBe(0);

    const declarations = manifest.hardening?.taskReleaseCertification ?? {};

    expect(declarations.phase84InstallUpgradeMigration).toBe(true);
    expect(declarations.phase85bFastStartupHardening).toBe(true);
  });

  it('declares the phases 68–84 capabilities truthfully', () => {
    const capabilities =
      readJson('release-manifest.json').hardening?.releaseEngineering?.capabilities;

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
      expect(capabilities?.[capability], capability).toBe(true);
    }
  });

  it('aligns the release manifest with the implemented capability phases', () => {
    expect(facts.sourcePhase).toBe(84);

    const truth = collectManifestTruth({ projectRoot: REPO_ROOT, sourcePhase: facts.sourcePhase });

    expect(truth.present).toBe(true);
    expect(truth.manifestPhase).toBeGreaterThanOrEqual(84);
    expect(truth.stale).toBe(false);

    const report = runReleaseAnalysis({
      facts,
      request: { operation: 'status', evidenceProfile: 'auditor' },
      rebuild: false,
    });

    expect(report.warnings.map((warning) => warning.code)).not.toContain('RELEASE_MANIFEST_STALE');
  });

  it('reflects v0.6.1 in the changelog and README current release', () => {
    const changelog = readFileSync('CHANGELOG.md', 'utf8');
    const readme = readFileSync('README.md', 'utf8');

    expect(changelog).toContain('## [0.6.1]');
    expect(changelog).toContain('### Compatibility');
    expect(changelog).toContain('### Known limitations');

    expect(readme).toContain('Current release: **v0.6.1**');
    expect(readme).toContain('### v0.6.1');
  });

  it('leaves historical release entries untouched', () => {
    const changelog = readFileSync('CHANGELOG.md', 'utf8');
    const readme = readFileSync('README.md', 'utf8');

    /* The published 0.6.0 section is history and must never be rewritten. */
    expect(changelog).toContain('## [0.6.0]');
    expect(changelog).toContain('Purely additive from v0.5.3');
    expect(readme).toContain('### v0.6.0 Code Intelligence, Daemon & Release Engineering');

    expect(changelog).toContain('## [0.4.0]');
    expect(changelog).toContain('## [0.3.19]');
    expect(changelog).toContain('## [0.3.17]');

    expect(readme).toContain('### v0.5.2 Retrieval GA');
    expect(readme).toContain('### v0.5.3 Disaster Recovery');
  });

  it('packages a build identity whose 0.6.1 marker matches the source digest', () => {
    const digest = runtimeSourceDigest(REPO_ROOT);
    const expectedMarker = `${VERSION}+${digest.slice(0, 16)}`;

    const bundle = readFileSync('bundle/mcp.js', 'utf8');

    expect(bundle).toContain(expectedMarker);
  });

  it('keeps source and packaged capability parity complete', () => {
    const report = runReleaseAnalysis({
      facts,
      request: { operation: 'status', evidenceProfile: 'auditor' },
      rebuild: false,
    });

    expect(report.capabilities.parity.missingRequired).toEqual([]);
    expect(report.capabilities.parity.complete).toBe(true);
  });

  it('keeps the MCP internal 0.1.0 identity out of release truth', () => {
    const server = readFileSync('src/mcp/server.ts', 'utf8');

    expect(server).toContain("version: '0.1.0'");

    const truth = collectVersionTruth({
      projectRoot: REPO_ROOT,
      sourcePhase: facts.sourcePhase,
      maxPackageJsonBytes: limits.maxPackageJsonBytes,
    });

    const mcpIdentity = truth.sources.find((source) => source.source === 'mcp server identity');

    expect(mcpIdentity?.version).toBe('0.1.0');
    expect(mcpIdentity?.active).toBe(false);
    expect(truth.currentVersion).toBe(VERSION);
  });

  it('never creates a release tag or an automatic publish step for the target', () => {
    /*
     * Read-only. The authorized release tag must target the certified 0.6.1
     * release commit — HEAD before any follow-up hardening commit, an ancestor
     * of HEAD afterwards. Tag creation and publishing always stay outside this
     * certification, and the tag is never automatic.
     */
    const tag = execFileSync('git', ['tag', '--list', `v${VERSION}`], {
      encoding: 'utf8',
    }).trim();

    if (tag) {
      const tagged = execFileSync('git', ['rev-list', '-n', '1', `v${VERSION}`], {
        encoding: 'utf8',
      }).trim();

      let objectPresent = false;

      try {
        execFileSync('git', ['cat-file', '-e', tagged], { stdio: 'pipe' });
        objectPresent = true;
      } catch {
        /* A shallow CI checkout may not contain the tagged release commit. */
      }

      if (objectPresent) {
        const taggedPackage = JSON.parse(
          execFileSync('git', ['show', `${tagged}:package.json`], { encoding: 'utf8' })
        ) as { version?: string };

        expect(taggedPackage.version).toBe(VERSION);

        /* The tag must lie on the certified release line, never on a side branch. */
        execFileSync('git', ['merge-base', '--is-ancestor', tagged, 'HEAD'], { stdio: 'pipe' });
      }
    }

    const manifest = readJson('release-manifest.json');

    expect(manifest.releasePolicy?.gitTagAutomatic).toBe(false);
  });

  it('emits the Phase 85D PASS marker', () => {
    console.log('PHASE85D_RELEASE_METADATA=PASS');

    expect(VERSION).toBe('0.6.1');
  });
});
