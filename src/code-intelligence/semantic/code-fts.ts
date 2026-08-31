import { DatabaseSync } from 'node:sqlite';

import type { CodeChunk } from '../chunks/types.js';

export interface CodeFtsHit {
  chunk: CodeChunk;

  score: number;
}

/**
 * Local code-search index backed by SQLite FTS5 + BM25.
 *
 * No model, no embedding, no network. The index is rebuilt from
 * persisted code chunks on each initialize() and lives only in memory.
 */
export class CodeFtsIndex {
  private readonly db = new DatabaseSync(':memory:');

  private readonly chunks = new Map<string, CodeChunk>();

  constructor(private readonly projectId: string) {
    this.db.exec(
      `CREATE VIRTUAL TABLE code_fts USING fts5(id UNINDEXED, projectId UNINDEXED, filePath, symbol, content, tokenize='unicode61')`
    );
  }

  get size(): number {
    return this.chunks.size;
  }

  build(chunks: CodeChunk[]): number {
    this.db.exec('DELETE FROM code_fts');
    this.chunks.clear();

    if (chunks.length === 0) {
      return 0;
    }

    const insert = this.db.prepare(
      `INSERT INTO code_fts (id, projectId, filePath, symbol, content) VALUES (?, ?, ?, ?, ?)`
    );

    this.db.exec('BEGIN');

    try {
      for (const chunk of chunks) {
        this.chunks.set(chunk.id, chunk);

        insert.run(chunk.id, this.projectId, chunk.filePath, chunk.symbolName ?? '', chunk.content);
      }

      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');

      throw error;
    }

    return chunks.length;
  }

  search(query: string, limit = 8): CodeFtsHit[] {
    const match = this.toMatchQuery(query);

    if (!match) {
      return [];
    }

    const rows = this.db
      .prepare(
        `SELECT id, bm25(code_fts) AS rank FROM code_fts WHERE code_fts MATCH ? ORDER BY rank LIMIT ?`
      )
      .all(match, Math.max(limit * 4, 20)) as Array<{ id: string; rank: number }>;

    const hits: CodeFtsHit[] = [];

    for (const row of rows) {
      const chunk = this.chunks.get(row.id);

      if (!chunk) {
        continue;
      }

      const score = 1 / (1 + Math.abs(row.rank));

      hits.push({ chunk, score });
    }

    return hits.slice(0, limit);
  }

  private toMatchQuery(query: string): string | null {
    const terms = query
      .toLowerCase()
      .normalize('NFKC')
      .split(/[^\p{L}\p{N}]+/u)
      .map((term) => term.trim())
      .filter((term) => term.length > 0);

    if (terms.length === 0) {
      return null;
    }

    if (terms.length === 1) {
      return `"${terms[0]}"`;
    }

    return `(${terms.map((term) => `"${term}"`).join(' OR ')})`;
  }

  close(): void {
    this.db.close();
  }
}
