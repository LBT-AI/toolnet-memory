import { resolveAiProviderConfig } from './config.js';

import { getAiProviderDefinition } from './registry.js';

import { CloudflareProvider } from './providers/cloudflare.js';

import { GeminiProvider } from './providers/gemini.js';

import { OpenAiCompatibleProvider } from './providers/openai-compatible.js';

import type { AiProvider, AiProviderConfig, AiProviderId } from './types.js';

export function createAiProvider(config: AiProviderConfig = resolveAiProviderConfig()): AiProvider {
  const definition = getAiProviderDefinition(config.id);

  switch (definition.transport) {
    case 'gemini':
      return new GeminiProvider(config);

    case 'cloudflare':
      return new CloudflareProvider(config);

    case 'openai-compatible':
    default:
      return new OpenAiCompatibleProvider(config);
  }
}

export function createAiProviderById(id: AiProviderId): AiProvider {
  return createAiProvider(resolveAiProviderConfig(id));
}
