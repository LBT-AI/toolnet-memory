import { fetchJson } from '../http.js';

import type {
  AiGenerateOptions,
  AiGenerateResult,
  AiHealthResult,
  AiProvider,
  AiProviderConfig,
} from '../types.js';

type CloudflareResponse = {
  success?: boolean;

  result?: {
    response?: string;
  };

  errors?: Array<{
    message?: string;
  }>;
};

export class CloudflareProvider implements AiProvider {
  readonly id = 'cloudflare' as const;

  constructor(readonly config: AiProviderConfig) {}

  private model(): string {
    const model = this.config.model?.trim();

    if (!model) {
      throw new Error('cloudflare: MODEL is not configured');
    }

    return model;
  }

  async generate(options: AiGenerateOptions): Promise<AiGenerateResult> {
    const accountId = this.config.accountId?.trim();

    const apiKey = this.config.apiKey?.trim();

    if (!accountId) {
      throw new Error('cloudflare: ACCOUNT ID is not configured');
    }

    if (!apiKey) {
      throw new Error('cloudflare: API TOKEN is not configured');
    }

    const model = this.model();

    const baseUrl =
      this.config.baseUrl?.trim() ||
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run`;

    const url = `${baseUrl.replace(/\/+$/, '')}/${model}`;

    const response = await fetchJson<CloudflareResponse>(url, {
      method: 'POST',

      headers: {
        authorization: `Bearer ${apiKey}`,

        'content-type': 'application/json',

        ...this.config.headers,
      },

      body: JSON.stringify({
        messages: options.messages,

        temperature: options.temperature,

        max_tokens: options.maxTokens,
      }),
    });

    const text = response.result?.response?.trim();

    if (!text) {
      throw new Error(response.errors?.[0]?.message ?? 'cloudflare: empty model response');
    }

    return {
      text,
      provider: 'cloudflare',
      model,
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
        provider: 'cloudflare',
        model: result.model,
        message: 'Provider reachable',
        latencyMs: Date.now() - started,
      };
    } catch (error) {
      return {
        ok: false,
        provider: 'cloudflare',
        model: this.config.model,
        message: error instanceof Error ? error.message : String(error),
        latencyMs: Date.now() - started,
      };
    }
  }
}
