import { fetchJson, joinUrl } from '../http.js';

import type {
  AiGenerateOptions,
  AiGenerateResult,
  AiHealthResult,
  AiProvider,
  AiProviderConfig,
} from '../types.js';

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;

  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
};

export class GeminiProvider implements AiProvider {
  readonly id = 'gemini' as const;

  constructor(readonly config: AiProviderConfig) {}

  private model(): string {
    const model = this.config.model?.trim();

    if (!model) {
      throw new Error('gemini: MODEL is not configured');
    }

    return model.replace(/^models\//, '');
  }

  async generate(options: AiGenerateOptions): Promise<AiGenerateResult> {
    const apiKey = this.config.apiKey?.trim();

    if (!apiKey) {
      throw new Error('gemini: API KEY is not configured');
    }

    const baseUrl =
      this.config.baseUrl?.trim() || 'https://generativelanguage.googleapis.com/v1beta';

    const model = this.model();

    const systemMessages = options.messages.filter((message) => message.role === 'system');

    const contents = options.messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',

        parts: [
          {
            text: message.content,
          },
        ],
      }));

    const url = `${joinUrl(
      baseUrl,
      `models/${encodeURIComponent(model)}:generateContent`
    )}?key=${encodeURIComponent(apiKey)}`;

    const response = await fetchJson<GeminiResponse>(url, {
      method: 'POST',

      headers: {
        'content-type': 'application/json',
      },

      body: JSON.stringify({
        ...(systemMessages.length
          ? {
              systemInstruction: {
                parts: [
                  {
                    text: systemMessages.map((item) => item.content).join('\n\n'),
                  },
                ],
              },
            }
          : {}),

        contents,

        generationConfig: {
          temperature: options.temperature,

          maxOutputTokens: options.maxTokens,
        },
      }),
    });

    const text = response.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('')
      .trim();

    if (!text) {
      throw new Error('gemini: empty model response');
    }

    return {
      text,
      provider: 'gemini',
      model,

      usage: response.usageMetadata
        ? {
            inputTokens: response.usageMetadata.promptTokenCount,

            outputTokens: response.usageMetadata.candidatesTokenCount,

            totalTokens: response.usageMetadata.totalTokenCount,
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
        provider: 'gemini',
        model: result.model,
        message: 'Provider reachable',
        latencyMs: Date.now() - started,
      };
    } catch (error) {
      return {
        ok: false,
        provider: 'gemini',
        model: this.config.model,
        message: error instanceof Error ? error.message : String(error),
        latencyMs: Date.now() - started,
      };
    }
  }
}
