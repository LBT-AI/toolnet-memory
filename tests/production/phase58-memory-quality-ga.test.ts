import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { certifyMemoryQualityGA } from '../../src/production/memory-quality-ga-certify.js';
import { PRODUCTION_PACK_REQUIRED_FILES } from '../../src/production/production-certify.js';

describe('Phase 58 Memory Quality GA', () => {
  it('passes migration, restart, recovery, artifact and cross-host certification', async () => {
    const result = await certifyMemoryQualityGA();
    const failures = result.checks.filter((item) => !item.passed);
    expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
    expect(result.passed).toBe(true);
    expect(result.passedCount).toBe(result.total);
    expect(result.total).toBeGreaterThanOrEqual(7);
  });

  it('requires Phase 57 memory review in the production package', () => {
    expect(PRODUCTION_PACK_REQUIRED_FILES).toContain('bundle/memory-review.js');
  });

  it('wires Phase 58 into production certification', () => {
    const source = readFileSync('src/production/production-certify.ts', 'utf8');
    expect(source).toContain(
      "import { certifyMemoryQualityGA } from './memory-quality-ga-certify.js';"
    );
    expect(source).toContain("'phase58-memory-quality-ga'");
    expect(source).toContain('Phase 53-58 Memory Quality GA certification passes');
  });

  it('does not add a new public Phase 58 CLI command', () => {
    const bin = readFileSync('bin/toolnet-memory', 'utf8');
    expect(bin).not.toContain('phase58:');
    expect(bin).not.toContain('memory:certify)');
  });
});
