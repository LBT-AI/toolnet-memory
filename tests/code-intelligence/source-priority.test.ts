import { describe, expect, it } from 'vitest';

import { codeSourceWeight } from '../../src/code-intelligence/semantic/source-priority.js';

describe('Semantic Source Priority', () => {
  it('prefers production source over tests', () => {
    expect(codeSourceWeight('src/storage/client.ts', 'hugging face storage')).toBe(1);

    expect(codeSourceWeight('tests/storage/client.test.ts', 'hugging face storage')).toBeLessThan(
      1
    );
  });

  it('does not penalize tests when user asks for tests', () => {
    expect(codeSourceWeight('tests/storage/client.test.ts', 'storage test')).toBe(1);
  });
});
