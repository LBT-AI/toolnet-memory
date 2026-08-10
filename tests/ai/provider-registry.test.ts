import { describe, expect, it } from 'vitest';

import {
  AI_PROVIDER_DEFINITIONS,
  getAiProviderDefinition,
  isAiProviderId,
} from '../../src/ai/registry.js';

describe('AI provider registry', () => {
  it('contains all supported providers', () => {
    expect(AI_PROVIDER_DEFINITIONS.map((item) => item.id)).toEqual([
      'openai-compatible',
      'alibaba',
      'openrouter',
      'groq',
      'deepseek',
      'nvidia',
      'gemini',
      'huggingface',
      'ollama',
      'custom',
      'cloudflare',
    ]);
  });

  it('resolves known providers', () => {
    expect(getAiProviderDefinition('cloudflare').label).toBe('Cloudflare Workers AI');

    expect(getAiProviderDefinition('deepseek').label).toBe('DeepSeek');

    expect(getAiProviderDefinition('nvidia').label).toBe('NVIDIA NIM');

    expect(isAiProviderId('gemini')).toBe(true);
    expect(isAiProviderId('deepseek')).toBe(true);
    expect(isAiProviderId('nvidia')).toBe(true);
    expect(isAiProviderId('invalid')).toBe(false);
  });
});
