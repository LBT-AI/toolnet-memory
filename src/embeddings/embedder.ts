import { loadAiConfig } from '../ai/config.js';

import type { EmbeddingProvider } from './provider.js';

import { GeminiEmbeddingProvider } from './gemini.js';
import { HashEmbeddingProvider } from './local.js';
import { OpenAiCompatibleEmbeddingProvider } from './openai-compatible.js';
import { HuggingFaceEmbeddingProvider } from './remote.js';

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

function cloudflareBaseUrl(accountId: string): string {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`;
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

  if (config.provider === 'gemini') {
    if (!config.apiKey || !config.model) {
      return null;
    }

    return new GeminiEmbeddingProvider({
      apiKey: config.apiKey,
      model: config.model,
      baseUrl: config.baseUrl,
    });
  }

  let baseUrl = config.baseUrl;

  if (config.provider === 'cloudflare' && !baseUrl && config.accountId) {
    baseUrl = cloudflareBaseUrl(config.accountId);
  }

  /*
   * Alibaba / OpenRouter / NVIDIA / Ollama /
   * Cloudflare / Custom / generic OpenAI endpoints
   * use the same OpenAI-compatible embeddings adapter.
   */
  if (baseUrl && config.model) {
    return new OpenAiCompatibleEmbeddingProvider({
      apiKey: config.apiKey,
      baseUrl,
      model: config.model,
    });
  }

  return null;
}

export function createEmbeddingProvider(): EmbeddingProvider {
  return new ResilientEmbeddingProvider(createRemoteEmbeddingProvider());
}
