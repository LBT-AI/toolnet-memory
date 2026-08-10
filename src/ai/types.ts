export type AiProviderId =
  | 'openai-compatible'
  | 'alibaba'
  | 'openrouter'
  | 'groq'
  | 'gemini'
  | 'huggingface'
  | 'ollama'
  | 'custom'
  | 'cloudflare';

export type AiMessageRole = 'system' | 'user' | 'assistant';

export interface AiMessage {
  role: AiMessageRole;
  content: string;
}

export interface AiGenerateOptions {
  messages: AiMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface AiGenerateResult {
  text: string;
  provider: AiProviderId;
  model: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export interface AiHealthResult {
  ok: boolean;
  provider: AiProviderId;
  model?: string;
  message: string;
  latencyMs?: number;
}

export interface AiProviderConfig {
  id: AiProviderId;
  apiKey?: string;
  baseUrl?: string;
  model?: string;

  accountId?: string;

  headers?: Record<string, string>;
}

export interface AiProvider {
  readonly id: AiProviderId;

  readonly config: AiProviderConfig;

  generate(options: AiGenerateOptions): Promise<AiGenerateResult>;

  healthCheck(): Promise<AiHealthResult>;
}

export interface AiProviderDefinition {
  id: AiProviderId;
  label: string;

  defaultBaseUrl?: string;
  defaultModel?: string;

  requiresApiKey: boolean;
  requiresBaseUrl?: boolean;
  requiresAccountId?: boolean;

  transport: 'openai-compatible' | 'gemini' | 'cloudflare';
}
