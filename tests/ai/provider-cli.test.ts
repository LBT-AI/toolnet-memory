import { describe, expect, it } from 'vitest';

import { AI_PROVIDER_DEFINITIONS } from '../../src/ai/registry.js';

describe('provider CLI registry', () => {
  it('contains expected multi-provider definitions', () => {
    const ids = AI_PROVIDER_DEFINITIONS.map((item) => item.id);

    expect(ids).toContain('openrouter');

    expect(ids).toContain('deepseek');

    expect(ids).toContain('nvidia');

    expect(ids).toContain('gemini');

    expect(ids).toContain('cloudflare');
  });
});
