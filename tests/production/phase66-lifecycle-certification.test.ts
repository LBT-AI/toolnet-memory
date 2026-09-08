import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { certifyLifecycleDriftControl } from '../../src/production/lifecycle-certify.js';

describe('Phase 66 production lifecycle certification', () => {
  it('passes lifecycle, drift, retention and rollback certification', () => {
    const result = certifyLifecycleDriftControl();
    expect(result, JSON.stringify(result, null, 2)).toMatchObject({
      passed: true,
      staleRuleProtected: true,
      staleObservationArchivedCandidate: true,
      canonicalMemoryUntouched: true,
      telemetryAgeRetention: true,
      telemetryCorruptRepair: true,
      telemetryBounded: true,
      adaptiveExpiredRuleRemoved: true,
      adaptiveBenchmarkPass: true,
      projectionDriftDetected: true,
    });
  });

  it('wires lifecycle health into doctor and status', () => {
    const doctor = readFileSync('src/production/doctor.ts', 'utf8');
    const status = readFileSync('src/production/status-cli.ts', 'utf8');
    expect(doctor).toContain('inspectLifecycleDrift');
    expect(doctor).toContain('Lifecycle & Drift');
    expect(status).toContain('inspectLifecycleDrift');
    expect(status).toContain("'Lifecycle'");
  });

  it('makes lifecycle drift a production release gate', () => {
    const source = readFileSync('src/production/production-certify.ts', 'utf8');
    expect(source).toContain('certifyLifecycleDriftControl');
    expect(source).toContain("'phase66-lifecycle-drift'");
  });

  it('does not add a destructive public Memory prune command', () => {
    const bin = readFileSync('bin/toolnet-memory', 'utf8');
    expect(bin).not.toContain('memory:prune)');
    expect(bin).not.toContain('memory:delete-stale)');
    expect(bin).not.toContain('lifecycle:apply)');
  });
});
