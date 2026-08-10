import { afterEach, describe, expect, it } from 'vitest';

import { resolveAiProviderConfig, resolveAiProviderId } from '../../src/ai/config.js';

const KEYS = [
  'TOOLNET_LLM_PROVIDER',
  'TOOLNET_LLM_API_KEY',
  'TOOLNET_LLM_BASE_URL',
  'TOOLNET_LLM_MODEL',
  'HF_TOKEN',
  'GROQ_API_KEY',
  'GROQ_MODEL',
];

afterEach(() => {
  for (const key of KEYS) {
    delete process.env[key];
  }
});

describe('AI provider config', () => {
  it('keeps legacy HF users working', () => {
    process.env.HF_TOKEN = 'hf_test';

    expect(resolveAiProviderId()).toBe('huggingface');
  });

  it('uses selected provider', () => {
    process.env.TOOLNET_LLM_PROVIDER = 'groq';

    process.env.GROQ_API_KEY = 'test-key';

    process.env.GROQ_MODEL = 'test-model';

    const config = resolveAiProviderConfig();

    expect(config.id).toBe('groq');

    expect(config.apiKey).toBe('test-key');

    expect(config.model).toBe('test-model');

    expect(config.baseUrl).toBe('https://api.groq.com/openai/v1');
  });
});
