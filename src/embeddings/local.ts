import {
  createHash,
} from "node:crypto";

import type {
  EmbeddingProvider,
} from "./provider.js";

/*
 * Fallback nhẹ để hệ thống không chết
 * khi HF API lỗi/quota.
 *
 * Không thay thế semantic embedding thật.
 */
export class HashEmbeddingProvider
  implements EmbeddingProvider
{
  readonly name =
    "hash-fallback";

  readonly dimensions =
    128;

  async embed(
    text: string,
  ): Promise<number[]> {
    const vector =
      new Array<number>(
        this.dimensions,
      ).fill(0);

    const words =
      text
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);

    for (const word of words) {
      const hash =
        createHash("sha256")
          .update(word)
          .digest();

      const index =
        hash.readUInt32BE(0) %
        this.dimensions;

      vector[index] += 1;
    }

    return normalize(vector);
  }

  async embedMany(
    texts: string[],
  ): Promise<number[][]> {
    return Promise.all(
      texts.map(
        (text) =>
          this.embed(text),
      ),
    );
  }
}

function normalize(
  vector: number[],
): number[] {
  const norm =
    Math.sqrt(
      vector.reduce(
        (sum, value) =>
          sum + value * value,
        0,
      ),
    );

  if (norm === 0) {
    return vector;
  }

  return vector.map(
    (value) =>
      value / norm,
  );
}
