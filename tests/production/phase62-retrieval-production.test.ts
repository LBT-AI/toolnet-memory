import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { PRODUCTION_PACK_REQUIRED_FILES } from '../../src/production/production-certify.js';
import { certifyPhase62Benchmark } from '../../src/production/retrieval-production-certify.js';

describe('Phase 62 production retrieval certification', () => {
  it('makes memory-query.js a required production package file', () => {
    expect(PRODUCTION_PACK_REQUIRED_FILES).toContain('bundle/memory-query.js');
  });

  it('runs the strict Phase 62 benchmark inside production certification', () => {
    const result = certifyPhase62Benchmark();
    expect(result.report.benchmarkVersion).toBe('phase62-v2');
    expect(result.report.totalCases).toBe(65);
    expect(result.report.passedCases).toBe(65);
    expect(result.gate.failures).toEqual([]);
    expect(result.gate.passed).toBe(true);
  });

  it('wires both benchmark and packaged ask smoke into production certify', () => {
    const source = readFileSync('src/production/production-certify.ts', 'utf8');
    expect(source).toContain('certifyRetrievalProduction');
    expect(source).toContain("'phase62-retrieval-quality'");
    expect(source).toContain("'phase62-packaged-ask'");
  });

  it('live certification uses the real packaged binary and no source tree', () => {
    const source = readFileSync('src/production/retrieval-production-certify.ts', 'utf8');
    expect(source).toContain("join(runtimeRoot, 'bin', 'toolnet-memory')");
    expect(source).toContain("'ask'");
    expect(source).toContain("'--debug-route'");
    expect(source).toContain("'--json'");
    expect(source).toContain("!existsSync(join(runtimeRoot, 'src'))");
  });

  it('adds no new public retrieval command', () => {
    const bin = readFileSync('bin/toolnet-memory', 'utf8');
    expect(bin).not.toContain('retrieval:benchmark)');
    expect(bin).not.toContain('retrieval:eval)');
    expect(bin).not.toContain('retrieval:certify)');
  });
});
