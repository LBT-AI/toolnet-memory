import type { EmbeddingProvider } from './provider.js';

export interface OpenAiEmbeddingOptions {
  apiKey?: string;
  baseUrl: string;
  model: string;
  dimensions?: number;
}

type EmbeddingResponse = {
  data?: Array<{
    embedding?: number[];
    index?: number;
  }>;
};

export class OpenAiCompatibleEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'openai-compatible';

  readonly dimensions?: number;

  constructor(private readonly options: OpenAiEmbeddingOptions) {
    this.dimensions = options.dimensions;
  }

  async embed(text: string): Promise<number[]> {
    const [vector] = await this.embedMany([text]);

    return vector;
  }

  async embedMany(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const baseUrl = this.options.baseUrl.replace(/\/+$/, '');

    const response = await fetch(`${baseUrl}/embeddings`, {
      method: 'POST',

      headers: {
        'content-type': 'application/json',

        ...(this.options.apiKey
          ? {
              authorization: `Bearer ${this.options.apiKey}`,
            }
          : {}),
      },

      body: JSON.stringify({
        model: this.options.model,

        input: texts,
      }),
    });

    if (!response.ok) {
      throw new Error(`Embedding failed: ${response.status} ${await response.text()}`);
    }

    const body = (await response.json()) as EmbeddingResponse;

    const vectors = body.data
      ?.sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .map((item) => item.embedding);

    if (
      !vectors ||
      vectors.length !== texts.length ||
      vectors.some((vector) => !Array.isArray(vector))
    ) {
      throw new Error('Embedding provider returned invalid response');
    }

    return vectors as number[][];
  }
}
