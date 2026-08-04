import type {
  EmbeddingProvider,
} from "./provider.js";

export interface HuggingFaceEmbeddingOptions {
  token: string;
  model: string;
}

export class HuggingFaceEmbeddingProvider
  implements EmbeddingProvider
{
  readonly name = "huggingface";
  readonly dimensions = 384;

  constructor(
    private readonly options:
      HuggingFaceEmbeddingOptions,
  ) {}

  async embed(
    text: string,
  ): Promise<number[]> {
    const [vector] =
      await this.embedMany([text]);

    return vector;
  }

  async embedMany(
    texts: string[],
  ): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const url =
      `https://router.huggingface.co/hf-inference/models/${this.options.model}/pipeline/feature-extraction`;

    const response =
      await fetch(url, {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${this.options.token}`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          inputs: texts,

          options: {
            wait_for_model: true,
          },
        }),
      });

    if (!response.ok) {
      throw new Error(
        `HF embedding failed: ${response.status} ${await response.text()}`,
      );
    }

    const data =
      await response.json();

    if (!Array.isArray(data)) {
      throw new Error(
        "HF embedding returned invalid response",
      );
    }

    /*
     * API có thể trả:
     * [vector]
     * hoặc [[token vectors]]
     *
     * Normalize về sentence vector.
     */
    return data.map(
      (item: unknown) =>
        normalizeEmbedding(item),
    );
  }
}

function normalizeEmbedding(
  value: unknown,
): number[] {
  if (!Array.isArray(value)) {
    throw new Error(
      "Invalid embedding",
    );
  }

  if (
    value.length > 0 &&
    typeof value[0] === "number"
  ) {
    return value as number[];
  }

  if (
    value.length > 0 &&
    Array.isArray(value[0])
  ) {
    const rows =
      value as number[][];

    if (rows.length === 0) {
      return [];
    }

    const dimensions =
      rows[0].length;

    const output =
      new Array<number>(
        dimensions,
      ).fill(0);

    for (const row of rows) {
      for (
        let i = 0;
        i < dimensions;
        i++
      ) {
        output[i] +=
          row[i] ?? 0;
      }
    }

    for (
      let i = 0;
      i < dimensions;
      i++
    ) {
      output[i] /=
        rows.length;
    }

    return output;
  }

  throw new Error(
    "Unsupported embedding shape",
  );
}
