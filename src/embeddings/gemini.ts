import type { EmbeddingProvider } from './provider.js';

export interface GeminiEmbeddingOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

type GeminiEmbeddingResponse = {
  embedding?: {
    values?: number[];
  };
};

export class GeminiEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'gemini';

  constructor(private readonly options: GeminiEmbeddingOptions) {}

  async embed(text: string): Promise<number[]> {
    const model = this.options.model.replace(/^models\//, '');

    const baseUrl =
      this.options.baseUrl?.replace(/\/+$/, '') ||
      'https://generativelanguage.googleapis.com/v1beta';

    const url =
      `${baseUrl}/models/${encodeURIComponent(model)}:embedContent` +
      `?key=${encodeURIComponent(this.options.apiKey)}`;

    const response = await fetch(url, {
      method: 'POST',

      headers: {
        'content-type': 'application/json',
      },

      body: JSON.stringify({
        model: `models/${model}`,

        content: {
          parts: [
            {
              text,
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini embedding failed: ${response.status} ${await response.text()}`);
    }

    const body = (await response.json()) as GeminiEmbeddingResponse;

    const vector = body.embedding?.values;

    if (!Array.isArray(vector) || vector.length === 0) {
      throw new Error('Gemini embedding returned invalid response');
    }

    return vector;
  }

  async embedMany(texts: string[]): Promise<number[][]> {
    const output: number[][] = [];

    /*
     * Sequential on purpose:
     * avoids creating a burst of requests during indexing.
     */
    for (const text of texts) {
      output.push(await this.embed(text));
    }

    return output;
  }
}
