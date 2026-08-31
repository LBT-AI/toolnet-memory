/**
 * Type-only shim for VectorRecord.
 *
 * The original vector search/persistence was removed in v0.3.13.
 * This file exists solely to satisfy type imports from src/storage/.
 *
 * No runtime vector search, persistence, or embedding logic lives here.
 */

export interface VectorRecord {
  id: string;
  embedding: number[];
  metadata: Record<string, unknown>;
}
