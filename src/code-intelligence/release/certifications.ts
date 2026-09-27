/*
 * Phase 83 — certification inventory and build reproducibility.
 *
 * Certification scripts are discovered dynamically from package.json
 * (phaseNN:certify); the release gate requires the declared required phases to
 * have recorded PASS results. Reproducibility rebuilds the bundle twice and
 * compares normalized content fingerprints.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { contentFingerprint } from './fingerprint.js';

import type { CertificationEntry, CertificationInventory, ReproducibilityResult } from './types.js';

export interface CertificationInventoryInput {
  projectRoot: string;
  requiredPhases: number[];
  certificationResults?: Record<string, 'pass' | 'fail' | 'not_run'>;
  maxCertifications: number;
}

export interface CertificationInventoryResult {
  inventory: CertificationInventory;
  truncated: boolean;
}

/** Discover phase certification scripts and their recorded results. */
export function buildCertificationInventory(
  input: CertificationInventoryInput
): CertificationInventoryResult {
  const pkgPath = join(input.projectRoot, 'package.json');

  let scripts: Record<string, string> = {};

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { scripts?: Record<string, string> };

    scripts = pkg.scripts ?? {};
  } catch {
    scripts = {};
  }

  const phaseScripts = Object.keys(scripts)
    .filter((name) => /^phase\d+:certify$/u.test(name))
    .sort((left, right) => {
      const leftPhase = Number(/^phase(\d+):/u.exec(left)?.[1] ?? 0);
      const rightPhase = Number(/^phase(\d+):/u.exec(right)?.[1] ?? 0);

      return leftPhase - rightPhase;
    })
    .slice(0, input.maxCertifications);

  const required = new Set(input.requiredPhases);
  const entries: CertificationEntry[] = [];
  const failing: number[] = [];
  const missing: number[] = [];

  for (const script of phaseScripts) {
    const phase = Number(/^phase(\d+):certify$/u.exec(script)?.[1] ?? 0);
    const requiredEntry = required.has(phase);
    const recorded = input.certificationResults?.[script];

    const result: CertificationEntry['result'] =
      recorded ?? (requiredEntry ? 'not_run' : 'not_run');

    if (result === 'fail') failing.push(phase);

    if (requiredEntry && (result !== 'pass' || !scripts[script])) {
      missing.push(phase);
    }

    entries.push({
      phase,
      script,
      present: Boolean(scripts[script]),
      result,
      required: requiredEntry,
    });
  }

  /* A required phase with no script at all is missing. */
  for (const phase of input.requiredPhases) {
    if (!entries.some((entry) => entry.phase === phase)) {
      missing.push(phase);
      entries.push({
        phase,
        script: `phase${phase}:certify`,
        present: false,
        result: 'not_run',
        required: true,
      });
    }
  }

  entries.sort((left, right) => left.phase - right.phase);

  return {
    inventory: {
      entries,
      requiredPhases: input.requiredPhases.slice().sort((a, b) => a - b),
      failing,
      missing,
      complete: missing.length === 0 && failing.length === 0,
    },
    truncated: phaseScripts.length >= input.maxCertifications,
  };
}

export interface ReproducibilityInput {
  projectRoot: string;
  bundlePath: string;
  /** Extra command used by the project to rebuild the bundle. */
  buildCommand?: readonly string[];
}

export interface ReproducibilityBuild {
  result: ReproducibilityResult;
  firstBundleBytes: number;
}

/**
 * Rebuild the packaged bundle and compare normalized content fingerprints.
 * Esbuild output is deterministic for identical inputs, so byte equality (and
 * therefore identical normalized fingerprints) is expected; a divergence is a
 * reproducibility failure, never silently accepted.
 */
export function checkReproducibility(input: ReproducibilityInput): ReproducibilityBuild {
  const runBuild = (): { ok: boolean; fingerprint?: string; bytes: number } => {
    const build = spawnSync('node', ['scripts/build-bundle.mjs'], {
      cwd: input.projectRoot,
      encoding: 'utf8',
      timeout: 180_000,
      windowsHide: true,
    });

    if (build.status !== 0) {
      return { ok: false, bytes: 0 };
    }

    try {
      const content = readFileSync(input.bundlePath);

      return { ok: true, fingerprint: contentFingerprint(content), bytes: content.byteLength };
    } catch {
      return { ok: false, bytes: 0 };
    }
  };

  const first = runBuild();

  if (!first.ok) {
    return {
      result: {
        reproducible: false,
        normalized: true,
        note: 'first rebuild failed',
      },
      firstBundleBytes: 0,
    };
  }

  const second = runBuild();

  if (!second.ok) {
    return {
      result: {
        firstFingerprint: first.fingerprint,
        reproducible: false,
        normalized: true,
        note: 'second rebuild failed',
      },
      firstBundleBytes: first.bytes,
    };
  }

  return {
    result: {
      firstFingerprint: first.fingerprint,
      secondFingerprint: second.fingerprint,
      reproducible: first.fingerprint === second.fingerprint,
      normalized: true,
    },
    firstBundleBytes: first.bytes,
  };
}
