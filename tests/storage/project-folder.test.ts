import { describe, expect, it } from 'vitest';

import { sanitizeProjectFolder } from '../../src/storage/project/folder.js';

describe('Project Storage Folder', () => {
  it('creates readable safe folder names', () => {
    expect(sanitizeProjectFolder('Zalo App')).toBe('Zalo_App');

    expect(sanitizeProjectFolder('Mercedes')).toBe('Mercedes');

    expect(sanitizeProjectFolder('Botcheck')).toBe('Botcheck');
  });
});
