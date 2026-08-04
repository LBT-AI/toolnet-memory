export interface EmbeddingProvider {
  readonly name: string;
  readonly dimensions?: number;

  embed(text: string): Promise<number[]>;
  embedMany(texts: string[]): Promise<number[][]>;
}
