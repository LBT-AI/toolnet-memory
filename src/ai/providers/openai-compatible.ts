import { fetchJson, joinUrl } from '../http.js';

import type {
  AiGenerateOptions,
  AiGenerateResult,
  AiHealthResult,
  AiProvider,
  AiProviderConfig,
} from '../types.js';

type CompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;

  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

export class OpenAiCompatibleProvider implements AiProvider {
  readonly id;

  constructor(readonly config: AiProviderConfig) {
    this.id = config.id;
  }

  private baseUrl(): string {
    const value = this.config.baseUrl?.trim();

    if (!value) {
      throw new Error(`${this.id}: BASE URL is not configured`);
    }

    return value;
  }

  private model(): string {
    const value = this.config.model?.trim();

    if (!value) {
      throw new Error(`${this.id}: MODEL is not configured`);
    }

    return value;
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      ...this.config.headers,
    };

    if (this.config.apiKey) {
      headers.authorization = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }

  async generate(options: AiGenerateOptions): Promise<AiGenerateResult> {
    const model = this.model();

    const response = await fetchJson<CompletionResponse>(
      joinUrl(this.baseUrl(), 'chat/completions'),
      {
        method: 'POST',

        headers: this.headers(),

        body: JSON.stringify({
          model,

          messages: options.messages,

          temperature: options.temperature,

          max_tokens: options.maxTokens,

          ...(this.id === 'alibaba'
            ? {
                enable_thinking: false,
              }
            : {}),
        }),
      }
    );

    const text = response.choices?.[0]?.message?.content?.trim();

    if (!text) {
      throw new Error(`${this.id}: empty model response`);
    }

    return {
      text,
      provider: this.id,
      model,

      usage: response.usage
        ? {
            inputTokens: response.usage.prompt_tokens,

            outputTokens: response.usage.completion_tokens,

            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    };
  }

  async healthCheck(): Promise<AiHealthResult> {
    const started = Date.now();

    try {
      const result = await this.generate({
        messages: [
          {
            role: 'user',
            content: 'Reply exactly: OK',
          },
        ],
        temperature: 0,
        maxTokens: 8,
      });

      return {
        ok: true,
        provider: this.id,
        model: result.model,
        message: 'Provider reachable',
        latencyMs: Date.now() - started,
      };
    } catch (error) {
      return {
        ok: false,
        provider: this.id,
        model: this.config.model,
        message: error instanceof Error ? error.message : String(error),
        latencyMs: Date.now() - started,
      };
    }
  }
}
