import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('Phase 65 release contract', () => {
  it('keeps every release version source synchronized', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
    const manifest = JSON.parse(readFileSync('release-manifest.json', 'utf8'));
    const target = readFileSync('.release-target', 'utf8').trim();
    const readme = readFileSync('README.md', 'utf8');
    expect(pkg.version).toBe(target);
    expect(lock.version).toBe(target);
    expect(lock.packages?.['']?.version).toBe(target);
    expect(manifest.version).toBe(target);
    expect(manifest.releaseSeries).toBe('0.5.x');
    expect(readme).toContain(`Current release: **v${target}**`);
    expect(readme).toContain('### v0.5.2 Retrieval GA');
  });

  it('declares Retrieval GA capability and certification', () => {
    const manifest = JSON.parse(readFileSync('release-manifest.json', 'utf8'));
    const retrieval = manifest.hardening?.retrievalSystem;
    const certification = manifest.hardening?.retrievalReleaseCertification;
    expect(retrieval).toMatchObject({
      ga: true,
      phase59IntentAwareRouter: true,
      phase60CompositePlanner: true,
      phase61QualityEvaluation: true,
      phase62ProductionBenchmark: true,
      phase63PrivacySafeTelemetry: true,
      phase64GuardedAdaptiveRouting: true,
      phase65GaCertification: true,
      benchmarkCases: 65,
      benchmarkExactAccuracy: 1,
      intentF1: 1,
      sourceF1: 1,
      unnecessarySourceReads: 0,
      missingSourceReads: 0,
      sourceBudgetViolations: 0,
      telemetryStoresQuestion: false,
      telemetryStoresAnswer: false,
      telemetryStoresQueryHash: false,
      adaptiveBenchmarkGated: true,
      requiresLlm: false,
    });
    expect(certification).toMatchObject({
      phase59: true,
      phase60: true,
      phase61: true,
      phase62: true,
      phase63: true,
      phase64: true,
      phase65: true,
      cliProductionSmoke: true,
      mcpEndToEnd: true,
      privacyCertification: true,
      adaptiveCertification: true,
      productionReleaseBlocking: true,
    });
  });

  it('blocks npm publication on production certification failure', () => {
    const workflow = readFileSync('.github/workflows/release.yml', 'utf8');
    const build = workflow.indexOf('name: Build production release');
    const certify = workflow.indexOf('name: Certify production release');
    const pack = workflow.indexOf('name: Pack release artifact');
    const publish = workflow.indexOf('name: Publish to npm with trusted publishing');
    expect(build).toBeGreaterThanOrEqual(0);
    expect(certify).toBeGreaterThan(build);
    expect(pack).toBeGreaterThan(certify);
    expect(publish).toBeGreaterThan(pack);
    expect(workflow).toContain('node bundle/production-certify.js');
    expect(workflow).toContain('npm publish --access public --tag latest');
  });

  it('keeps tag/version mismatch protection enabled', () => {
    const workflow = readFileSync('.github/workflows/release.yml', 'utf8');
    expect(workflow).toContain('Verify tag matches package version');
    expect(workflow).toContain('Tag $TAG does not match package.json version v$VERSION');
  });
});
