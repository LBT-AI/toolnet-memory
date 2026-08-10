import { afterEach, describe, expect, it, vi } from 'vitest';

import { GeminiEmbeddingProvider } from '../../src/embeddings/gemini.js';

describe('GeminiEmbeddingProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns embedding vector', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          embedding: {
            values: [0.1, 0.2, 0.3],
          },
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        }
      )
    );

    const provider = new GeminiEmbeddingProvider({
      apiKey: 'test',
      model: 'gemini-embedding-001',
    });

    const vector = await provider.embed('hello');

    expect(vector).toEqual([0.1, 0.2, 0.3]);
  });
});
