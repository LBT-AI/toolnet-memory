export interface VectorRecord {
  id: string;
  projectId: string;
  vector: number[];

  metadata?: Record<string, unknown>;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export class VectorStore {
  private readonly records = new Map<string, VectorRecord>();

  upsert(record: VectorRecord): void {
    this.records.set(record.id, record);
  }

  get(id: string): VectorRecord | undefined {
    return this.records.get(id);
  }

  has(id: string): boolean {
    return this.records.has(id);
  }

  remove(id: string): boolean {
    return this.records.delete(id);
  }

  clearProject(projectId: string): number {
    let deleted = 0;

    for (const [id, record] of this.records) {
      if (record.projectId === projectId) {
        this.records.delete(id);
        deleted++;
      }
    }

    return deleted;
  }

  exportProject(projectId: string): VectorRecord[] {
    return [...this.records.values()].filter((record) => record.projectId === projectId);
  }

  importRecords(records: VectorRecord[]): number {
    let imported = 0;

    for (const record of records) {
      if (!record?.id || !record?.projectId || !Array.isArray(record.vector)) {
        continue;
      }

      this.records.set(record.id, record);

      imported++;
    }

    return imported;
  }

  search(projectId: string, queryVector: number[], limit = 10): VectorSearchResult[] {
    const results: VectorSearchResult[] = [];

    for (const record of this.records.values()) {
      if (record.projectId !== projectId) {
        continue;
      }

      const score = cosineSimilarity(queryVector, record.vector);

      results.push({
        id: record.id,
        score,
        metadata: record.metadata,
      });
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  size(): number {
    return this.records.size;
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;

    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
