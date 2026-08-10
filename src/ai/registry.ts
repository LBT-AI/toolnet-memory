import type { AiProviderDefinition, AiProviderId } from './types.js';

export const AI_PROVIDER_DEFINITIONS: readonly AiProviderDefinition[] = [
  {
    id: 'openai-compatible',
    label: 'OpenAI-compatible',
    requiresApiKey: true,
    requiresBaseUrl: true,
    transport: 'openai-compatible',
  },

  {
    id: 'alibaba',
    label: 'Alibaba / DashScope',
    requiresApiKey: true,
    requiresBaseUrl: true,
    transport: 'openai-compatible',
  },

  {
    id: 'openrouter',
    label: 'OpenRouter',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    requiresApiKey: true,
    transport: 'openai-compatible',
  },

  {
    id: 'groq',
    label: 'Groq',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    requiresApiKey: true,
    transport: 'openai-compatible',
  },

  {
    id: 'deepseek',
    label: 'DeepSeek',
    defaultBaseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-v4-flash',
    requiresApiKey: true,
    transport: 'openai-compatible',
  },

  {
    id: 'nvidia',
    label: 'NVIDIA NIM',
    defaultBaseUrl: 'https://integrate.api.nvidia.com/v1',
    defaultModel: 'deepseek-ai/deepseek-v4-pro',
    requiresApiKey: true,
    transport: 'openai-compatible',
  },

  {
    id: 'gemini',
    label: 'Gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    requiresApiKey: true,
    transport: 'gemini',
  },

  {
    id: 'huggingface',
    label: 'Hugging Face',
    defaultBaseUrl: 'https://router.huggingface.co/v1',
    requiresApiKey: true,
    transport: 'openai-compatible',
  },

  {
    id: 'ollama',
    label: 'Ollama / Local',
    defaultBaseUrl: 'http://127.0.0.1:11434/v1',
    requiresApiKey: false,
    transport: 'openai-compatible',
  },

  {
    id: 'custom',
    label: 'Custom endpoint',
    requiresApiKey: false,
    requiresBaseUrl: true,
    transport: 'openai-compatible',
  },

  {
    id: 'cloudflare',
    label: 'Cloudflare Workers AI',
    requiresApiKey: true,
    requiresAccountId: true,
    transport: 'cloudflare',
  },
] as const;

export function getAiProviderDefinition(id: AiProviderId): AiProviderDefinition {
  const definition = AI_PROVIDER_DEFINITIONS.find((item) => item.id === id);

  if (!definition) {
    throw new Error(`Unsupported AI provider: ${id}`);
  }

  return definition;
}

export function isAiProviderId(value: string): value is AiProviderId {
  return AI_PROVIDER_DEFINITIONS.some((provider) => provider.id === value);
}
