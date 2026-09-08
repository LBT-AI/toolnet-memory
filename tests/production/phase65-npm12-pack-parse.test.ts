import { describe, expect, test } from 'vitest';

import {
  PRODUCTION_PACK_REQUIRED_FILES,
  parsePackedFiles,
} from '../../src/production/production-certify.js';

describe('Phase 65 npm pack JSON parsing', () => {
  const paths = [...PRODUCTION_PACK_REQUIRED_FILES, 'README.md', '.env.example'];

  test('parses npm <= 11 array output shape', () => {
    const payload = JSON.stringify([
      {
        id: 'toolnet-memory@0.5.2',
        name: 'toolnet-memory',
        version: '0.5.2',
        files: paths.map((path) => ({ path, size: 10, mode: 420 })),
      },
    ]);
    const files = parsePackedFiles(payload);
    expect(files).toEqual(paths);
  });

  test('parses npm >= 12 name-keyed object output shape', () => {
    const payload = JSON.stringify({
      'toolnet-memory': {
        id: 'toolnet-memory@0.5.2',
        name: 'toolnet-memory',
        version: '0.5.2',
        files: paths.map((path) => ({ path, size: 10, mode: 420 })),
      },
    });
    const files = parsePackedFiles(payload);
    expect(files).toEqual(paths);
  });

  test('handles empty results gracefully', () => {
    expect(parsePackedFiles('[]')).toEqual([]);
    expect(parsePackedFiles('{}')).toEqual([]);
    expect(parsePackedFiles('not json')).toEqual([]);
  });
});
