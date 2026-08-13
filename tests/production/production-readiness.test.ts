import { describe, expect, test } from 'vitest';

import {
  PRODUCTION_PACK_REQUIRED_FILES,
  validatePackedRuntimeFiles,
} from '../../src/production/production-certify.js';

describe('X3 Production Readiness', () => {
  test('accepts a package with all required production runtime files', () => {
    const result = validatePackedRuntimeFiles([
      ...PRODUCTION_PACK_REQUIRED_FILES,
      'README.md',
      '.env.example',
    ]);

    expect(result.passed).toBe(true);

    expect(result.missing).toEqual([]);

    expect(result.sourceFiles).toEqual([]);
  });

  test('rejects source-tree dependency in the npm package', () => {
    const result = validatePackedRuntimeFiles([...PRODUCTION_PACK_REQUIRED_FILES, 'src/index.ts']);

    expect(result.passed).toBe(false);

    expect(result.sourceFiles).toEqual(['src/index.ts']);
  });

  test('rejects an incomplete production package', () => {
    const result = validatePackedRuntimeFiles(['package.json', 'bin/toolnet-memory']);

    expect(result.passed).toBe(false);

    expect(result.missing.length).toBeGreaterThan(0);
  });
});
