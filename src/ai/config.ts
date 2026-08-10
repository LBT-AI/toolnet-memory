import { getAiProviderDefinition, isAiProviderId } from './registry.js';

import type { AiProviderConfig, AiProviderId } from './types.js';

function env(key: string): string | undefined {
  const value = process.env[key]?.trim();

  return value || undefined;
}

export function resolveAiProviderId(): AiProviderId {
  const configured = env('TOOLNET_LLM_PROVIDER');

  if (configured && isAiProviderId(configured)) {
    return configured;
  }

  /*
   * Backward compatibility:
   * existing HF_TOKEN users keep
   * working until they explicitly
   * choose another provider.
   */
  if (env('HF_TOKEN')) {
    return 'huggingface';
  }

  return 'openai-compatible';
}

export function resolveAiProviderConfig(id = resolveAiProviderId()): AiProviderConfig {
  const definition = getAiProviderDefinition(id);

  const commonModel = env('TOOLNET_LLM_MODEL');

  const commonKey = env('TOOLNET_LLM_API_KEY');

  const commonBaseUrl = env('TOOLNET_LLM_BASE_URL');

  switch (id) {
    case 'alibaba':
      return {
        id,
        apiKey: env('ALIBABA_API_KEY') ?? commonKey,

        baseUrl: env('ALIBABA_BASE_URL') ?? commonBaseUrl,

        model: env('ALIBABA_MODEL') ?? commonModel,
      };

    case 'openrouter':
      return {
        id,
        apiKey: env('OPENROUTER_API_KEY') ?? commonKey,

        baseUrl: env('OPENROUTER_BASE_URL') ?? commonBaseUrl ?? definition.defaultBaseUrl,

        model: env('OPENROUTER_MODEL') ?? commonModel,
      };

    case 'groq':
      return {
        id,
        apiKey: env('GROQ_API_KEY') ?? commonKey,

        baseUrl: env('GROQ_BASE_URL') ?? commonBaseUrl ?? definition.defaultBaseUrl,

        model: env('GROQ_MODEL') ?? commonModel,
      };

    case 'gemini':
      return {
        id,
        apiKey: env('GEMINI_API_KEY') ?? env('GOOGLE_API_KEY') ?? commonKey,

        baseUrl: env('GEMINI_BASE_URL') ?? commonBaseUrl ?? definition.defaultBaseUrl,

        model: env('GEMINI_MODEL') ?? commonModel,
      };

    case 'huggingface':
      return {
        id,
        apiKey: env('HF_TOKEN') ?? commonKey,

        baseUrl: env('HF_INFERENCE_BASE_URL') ?? commonBaseUrl ?? definition.defaultBaseUrl,

        model: env('HF_LLM_MODEL') ?? commonModel,
      };

    case 'ollama':
      return {
        id,

        apiKey: env('OLLAMA_API_KEY'),

        baseUrl: env('OLLAMA_BASE_URL') ?? commonBaseUrl ?? definition.defaultBaseUrl,

        model: env('OLLAMA_MODEL') ?? commonModel,
      };

    case 'cloudflare':
      return {
        id,

        accountId: env('CLOUDFLARE_ACCOUNT_ID'),

        apiKey: env('CLOUDFLARE_API_TOKEN') ?? commonKey,

        baseUrl: env('CLOUDFLARE_AI_BASE_URL') ?? commonBaseUrl,

        model: env('CLOUDFLARE_MODEL') ?? commonModel,
      };

    case 'custom':
      return {
        id,
        apiKey: env('CUSTOM_AI_API_KEY') ?? commonKey,

        baseUrl: env('CUSTOM_AI_BASE_URL') ?? commonBaseUrl,

        model: env('CUSTOM_AI_MODEL') ?? commonModel,
      };

    case 'openai-compatible':
    default:
      return {
        id: 'openai-compatible',

        apiKey: commonKey,

        baseUrl: commonBaseUrl,

        model: commonModel,
      };
  }
}
