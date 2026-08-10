import { getAiProviderDefinition, isAiProviderId } from './registry.js';

import type { AiProviderConfig, AiProviderId } from './types.js';

export interface CanonicalModelConfig {
  provider: AiProviderId;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  accountId?: string;
}

export interface ToolNetAiConfig {
  llm: CanonicalModelConfig;

  embedding: {
    provider: AiProviderId | 'local';
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    accountId?: string;
  };

  legacy: {
    llm: boolean;
    embedding: boolean;
  };
}

function env(key: string): string | undefined {
  const value = process.env[key]?.trim();

  return value || undefined;
}

function first(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => Boolean(value?.trim()));
}

function providerFromLegacy(): AiProviderId | undefined {
  if (env('GROQ_API_KEY')) {
    return 'groq';
  }

  if (env('OPENROUTER_API_KEY')) {
    return 'openrouter';
  }

  if (env('ALIBABA_API_KEY') || env('DASHSCOPE_API_KEY')) {
    return 'alibaba';
  }

  if (env('GEMINI_API_KEY') || env('GOOGLE_API_KEY')) {
    return 'gemini';
  }

  if (env('CLOUDFLARE_API_TOKEN') && env('CLOUDFLARE_ACCOUNT_ID')) {
    return 'cloudflare';
  }

  if (env('HF_TOKEN')) {
    return 'huggingface';
  }

  if (env('OLLAMA_MODEL') || env('OLLAMA_BASE_URL')) {
    return 'ollama';
  }

  return undefined;
}

export function resolveAiProviderId(): AiProviderId {
  const configured = env('TOOLNET_LLM_PROVIDER');

  if (configured && isAiProviderId(configured)) {
    return configured;
  }

  return providerFromLegacy() ?? 'openai-compatible';
}

function resolveLegacyLlmConfig(id: AiProviderId): CanonicalModelConfig {
  const definition = getAiProviderDefinition(id);

  switch (id) {
    case 'alibaba':
      return {
        provider: id,

        apiKey: first(env('ALIBABA_API_KEY'), env('DASHSCOPE_API_KEY')),

        baseUrl: first(
          env('ALIBABA_BASE_URL'),
          env('DASHSCOPE_BASE_URL'),
          definition.defaultBaseUrl
        ),

        model: first(env('ALIBABA_MODEL'), env('DASHSCOPE_MODEL')),
      };

    case 'openrouter':
      return {
        provider: id,

        apiKey: env('OPENROUTER_API_KEY'),

        baseUrl: first(env('OPENROUTER_BASE_URL'), definition.defaultBaseUrl),

        model: env('OPENROUTER_MODEL'),
      };

    case 'groq':
      return {
        provider: id,

        apiKey: env('GROQ_API_KEY'),

        baseUrl: first(env('GROQ_BASE_URL'), definition.defaultBaseUrl),

        model: env('GROQ_MODEL'),
      };

    case 'gemini':
      return {
        provider: id,

        apiKey: first(env('GEMINI_API_KEY'), env('GOOGLE_API_KEY')),

        baseUrl: first(env('GEMINI_BASE_URL'), definition.defaultBaseUrl),

        model: env('GEMINI_MODEL'),
      };

    case 'huggingface':
      return {
        provider: id,

        apiKey: env('HF_TOKEN'),

        baseUrl: first(env('HF_INFERENCE_BASE_URL'), definition.defaultBaseUrl),

        model: first(env('HF_LLM_MODEL'), env('HF_MODEL')),
      };

    case 'ollama':
      return {
        provider: id,

        apiKey: env('OLLAMA_API_KEY'),

        baseUrl: first(env('OLLAMA_BASE_URL'), definition.defaultBaseUrl),

        model: env('OLLAMA_MODEL'),
      };

    case 'cloudflare':
      return {
        provider: id,

        accountId: env('CLOUDFLARE_ACCOUNT_ID'),

        apiKey: env('CLOUDFLARE_API_TOKEN'),

        baseUrl: env('CLOUDFLARE_AI_BASE_URL'),

        model: env('CLOUDFLARE_MODEL'),
      };

    case 'custom':
      return {
        provider: id,

        apiKey: env('CUSTOM_AI_API_KEY'),

        baseUrl: env('CUSTOM_AI_BASE_URL'),

        model: env('CUSTOM_AI_MODEL'),
      };

    case 'openai-compatible':
    default:
      return {
        provider: 'openai-compatible',

        apiKey: first(env('OPENAI_API_KEY'), env('MODEL_API_KEY')),

        baseUrl: first(env('OPENAI_BASE_URL'), env('MODEL_BASE_URL')),

        model: first(env('OPENAI_MODEL'), env('MODEL_NAME')),
      };
  }
}

function resolveCanonicalLlm(): CanonicalModelConfig {
  const configured = env('TOOLNET_LLM_PROVIDER');

  const provider = configured && isAiProviderId(configured) ? configured : resolveAiProviderId();

  const definition = getAiProviderDefinition(provider);

  const legacy = resolveLegacyLlmConfig(provider);

  return {
    provider,

    apiKey: first(env('TOOLNET_LLM_API_KEY'), legacy.apiKey),

    baseUrl: first(env('TOOLNET_LLM_BASE_URL'), legacy.baseUrl, definition.defaultBaseUrl),

    model: first(env('TOOLNET_LLM_MODEL'), legacy.model, definition.defaultModel),

    accountId: first(env('TOOLNET_LLM_ACCOUNT_ID'), legacy.accountId),
  };
}

function resolveEmbeddingProvider(): AiProviderId | 'local' {
  const configured = env('TOOLNET_EMBEDDING_PROVIDER');

  if (configured === 'local') {
    return 'local';
  }

  if (configured && isAiProviderId(configured)) {
    return configured;
  }

  /*
   * Legacy ToolNet embedding
   * was Hugging Face-based.
   */
  if (env('HF_TOKEN') || env('HF_EMBEDDING_MODEL')) {
    return 'huggingface';
  }

  return 'local';
}

function resolveCanonicalEmbedding() {
  const provider = resolveEmbeddingProvider();

  if (provider === 'local') {
    return {
      provider: 'local' as const,

      model: first(env('TOOLNET_EMBEDDING_MODEL'), env('LOCAL_EMBEDDING_MODEL')),
    };
  }

  const definition = getAiProviderDefinition(provider);

  let legacyKey: string | undefined;

  let legacyBaseUrl: string | undefined;

  let legacyModel: string | undefined;

  let legacyAccountId: string | undefined;

  switch (provider) {
    case 'huggingface':
      legacyKey = env('HF_TOKEN');

      legacyBaseUrl = env('HF_INFERENCE_BASE_URL');

      legacyModel = env('HF_EMBEDDING_MODEL');

      break;

    case 'openai-compatible':
      legacyKey = env('OPENAI_API_KEY');

      legacyBaseUrl = env('OPENAI_BASE_URL');

      legacyModel = env('OPENAI_EMBEDDING_MODEL');

      break;

    case 'cloudflare':
      legacyKey = env('CLOUDFLARE_API_TOKEN');

      legacyBaseUrl = env('CLOUDFLARE_AI_BASE_URL');

      legacyModel = env('CLOUDFLARE_EMBEDDING_MODEL');

      legacyAccountId = env('CLOUDFLARE_ACCOUNT_ID');

      break;

    default:
      legacyKey = resolveLegacyLlmConfig(provider).apiKey;

      legacyBaseUrl = resolveLegacyLlmConfig(provider).baseUrl;

      legacyModel = env(`${provider.toUpperCase().replace(/-/g, '_')}_EMBEDDING_MODEL`);
  }

  return {
    provider,

    apiKey: first(env('TOOLNET_EMBEDDING_API_KEY'), legacyKey),

    baseUrl: first(env('TOOLNET_EMBEDDING_BASE_URL'), legacyBaseUrl, definition.defaultBaseUrl),

    model: first(env('TOOLNET_EMBEDDING_MODEL'), legacyModel),

    accountId: first(env('TOOLNET_EMBEDDING_ACCOUNT_ID'), legacyAccountId),
  };
}

export function loadAiConfig(): ToolNetAiConfig {
  const llm = resolveCanonicalLlm();

  const embedding = resolveCanonicalEmbedding();

  return {
    llm,
    embedding,

    legacy: {
      llm: !env('TOOLNET_LLM_PROVIDER') && Boolean(providerFromLegacy()),

      embedding:
        !env('TOOLNET_EMBEDDING_PROVIDER') && Boolean(env('HF_TOKEN') || env('HF_EMBEDDING_MODEL')),
    },
  };
}

/*
 * Compatibility wrapper for the
 * existing Phase 3 provider factory.
 */
export function resolveAiProviderConfig(id = resolveAiProviderId()): AiProviderConfig {
  const config = loadAiConfig().llm;

  if (id === config.provider) {
    return {
      id,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model,
      accountId: config.accountId,
    };
  }

  const legacy = resolveLegacyLlmConfig(id);

  return {
    id,
    apiKey: legacy.apiKey,
    baseUrl: legacy.baseUrl,
    model: legacy.model,
    accountId: legacy.accountId,
  };
}
