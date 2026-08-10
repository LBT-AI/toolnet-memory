import { loadAiConfig } from '../ai/config.js';

import type { EmbeddingProvider } from './provider.js';

import { HuggingFaceEmbeddingProvider } from './remote.js';

import { HashEmbeddingProvider } from './local.js';

import { OpenAiCompatibleEmbeddingProvider } from './openai-compatible.js';

export class ResilientEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'resilient';

  constructor(
    private readonly primary: EmbeddingProvider | null,

    private readonly fallback = new HashEmbeddingProvider()
  ) {}

  async embed(text: string): Promise<number[]> {
    if (this.primary) {
      try {
        return await this.primary.embed(text);
      } catch (error) {
        console.warn(
          '[embedding] primary failed, fallback enabled:',
          error instanceof Error ? error.message : error
        );
      }
    }

    return this.fallback.embed(text);
  }

  async embedMany(texts: string[]): Promise<number[][]> {
    if (this.primary) {
      try {
        return await this.primary.embedMany(texts);
      } catch (error) {
        console.warn(
          '[embedding] primary failed, fallback enabled:',
          error instanceof Error ? error.message : error
        );
      }
    }

    return this.fallback.embedMany(texts);
  }
}

function createRemoteEmbeddingProvider(): EmbeddingProvider | null {
  const config = loadAiConfig().embedding;

  if (config.provider === 'local') {
    return null;
  }

  if (config.provider === 'huggingface') {
    if (!config.apiKey || !config.model) {
      return null;
    }

    return new HuggingFaceEmbeddingProvider({
      token: config.apiKey,

      model: config.model,
    });
  }

  /*
   * Providers exposing an
   * OpenAI-compatible embeddings
   * endpoint share one adapter.
   */
  if (config.baseUrl && config.model) {
    return new OpenAiCompatibleEmbeddingProvider({
      apiKey: config.apiKey,

      baseUrl: config.baseUrl,

      model: config.model,
    });
  }

  return null;
}

export function createEmbeddingProvider(): EmbeddingProvider {
  return new ResilientEmbeddingProvider(createRemoteEmbeddingProvider());
}
