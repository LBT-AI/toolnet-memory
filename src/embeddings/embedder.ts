import type {
  EmbeddingProvider,
} from "./provider.js";

import {
  HuggingFaceEmbeddingProvider,
} from "./remote.js";

import {
  HashEmbeddingProvider,
} from "./local.js";

export class ResilientEmbeddingProvider
  implements EmbeddingProvider
{
  readonly name =
    "resilient";

  constructor(
    private readonly primary:
      EmbeddingProvider | null,

    private readonly fallback =
      new HashEmbeddingProvider(),
  ) {}

  async embed(
    text: string,
  ): Promise<number[]> {
    if (this.primary) {
      try {
        return await this.primary.embed(
          text,
        );
      } catch (error) {
        console.warn(
          "[embedding] primary failed, fallback enabled:",
          error instanceof Error
            ? error.message
            : error,
        );
      }
    }

    return this.fallback.embed(
      text,
    );
  }

  async embedMany(
    texts: string[],
  ): Promise<number[][]> {
    if (this.primary) {
      try {
        return await this.primary
          .embedMany(texts);
      } catch (error) {
        console.warn(
          "[embedding] primary failed, fallback enabled:",
          error instanceof Error
            ? error.message
            : error,
        );
      }
    }

    return this.fallback
      .embedMany(texts);
  }
}

export function createEmbeddingProvider():
  EmbeddingProvider {
  const token =
    process.env.HF_TOKEN;

  const model =
    process.env.HF_EMBEDDING_MODEL ??
    "sentence-transformers/all-MiniLM-L6-v2";

  const primary =
    token
      ? new HuggingFaceEmbeddingProvider({
          token,
          model,
        })
      : null;

  return new ResilientEmbeddingProvider(
    primary,
  );
}
