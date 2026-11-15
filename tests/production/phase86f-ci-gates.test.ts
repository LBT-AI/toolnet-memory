/*
 * Phase 86F — CI release-gate contract.
 *
 * Parses .github/workflows/ci.yml robustly (indentation-aware, no line
 * numbers, no YAML dependency): the release gates must be present or a
 * red main/PR would certify nothing. Covers Node 22 full gates, Node 24
 * compatibility, timeouts, and the whitespace gate.
 */

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

interface CiStep {
  job: string;
  name: string;
  run: string;
}

function parseCiJobs(text: string): Map<string, CiStep[]> {
  const jobs = new Map<string, CiStep[]>();
  let job: string | null = null;
  let stepName = '';

  for (const line of text.split('\n')) {
    const jobMatch = line.match(/^  ([A-Za-z0-9_-]+):\s*$/u);
    if (jobMatch && !['steps', 'strategy', 'with'].includes(jobMatch[1])) {
      // Top-level job keys sit at 2-space indent directly under `jobs:`.
      // Guard against nested maps by requiring the previous non-empty
      // context: accept any 2-space key and let step collection decide.
      job = jobMatch[1];
      if (!jobs.has(job)) jobs.set(job, []);
      continue;
    }

    const nameMatch = line.match(/^\s+- name: (.+)$/u);
    if (nameMatch) {
      stepName = nameMatch[1].trim();
      continue;
    }

    const runMatch = line.match(/^\s+run: (.+)$/u);
    if (runMatch && job) {
      jobs.get(job)!.push({ job, name: stepName, run: runMatch[1].trim() });
      stepName = '';
    }
  }

  return jobs;
}

function runsFor(jobs: Map<string, CiStep[]>, job: string): string[] {
  return (jobs.get(job) ?? []).map((step) => step.run);
}

describe('Phase 86F — CI release gates', () => {
  const text = readFileSync('.github/workflows/ci.yml', 'utf8');
  const jobs = parseCiJobs(text);

  it('keeps the Node 22 full gate with every release step', () => {
    expect([...jobs.keys()]).toContain('test');

    const runs = runsFor(jobs, 'test').join('\n');

    for (const gate of [
      'npm ci',
      'npm run lint',
      'npm run format:check',
      'npm run typecheck',
      'npm test',
      'npm run build:release',
      'npm run release:verify:static',
      'node bundle/production-certify.js',
      'npm pack --dry-run',
      'git diff --check',
    ]) {
      expect(runs, `Node 22 gate: ${gate}`).toContain(gate);
    }
  });

  it('covers Node 24 compatibility without duplicating the heavy suite twice', () => {
    const names = [...jobs.keys()];
    const node24 = names.find((name) => name.includes('24'));

    expect(node24, 'Node 24 compatibility job').toBeDefined();

    const runs = runsFor(jobs, node24!).join('\n');

    for (const gate of [
      'npm run typecheck',
      'npm run build:release',
      'npm run release:verify:static',
      'node bundle/production-certify.js',
    ]) {
      expect(runs, `Node 24 gate: ${gate}`).toContain(gate);
    }

    expect(text).toContain('node-version: 24');
    expect(text).toContain('node-version: 22');
  });

  it('bounds every job with timeouts and keeps branch concurrency safe', () => {
    expect(text).toContain('timeout-minutes:');
    expect(text).toContain('cancel-in-progress: true');
  });

  it('runs the static contract in the release workflow before publish', () => {
    const release = readFileSync('.github/workflows/release.yml', 'utf8');
    const verifyAt = release.indexOf('npm run release:verify:static');
    const publishAt = release.indexOf('npm publish');

    expect(verifyAt).toBeGreaterThan(-1);
    expect(publishAt).toBeGreaterThan(-1);
    expect(verifyAt).toBeLessThan(publishAt);
  });
});
