import type {
  StorageProvider,
} from "./types.js";

import type {
  VectorRecord,
} from "../retrieval/vector/vector-store.js";

export interface VectorSnapshot {
  version: 1;
  projectId: string;
  model: string;
  dimensions: number;
  updatedAt: string;
  records: VectorRecord[];
}

export class PersistentVectorStore {
  constructor(
    private readonly storage:
      StorageProvider,
  ) {}

  private key(
    projectId: string,
  ): string {
    return [
      "projects",
      projectId,
      "vectors",
      "current.json",
    ].join("/");
  }

  async load(
    projectId: string,
  ): Promise<VectorSnapshot | null> {
    const text =
      await this.storage.getText(
        this.key(projectId),
      );

    if (!text) {
      return null;
    }

    const parsed =
      JSON.parse(text) as
        Partial<VectorSnapshot>;

    if (
      parsed.version !== 1 ||
      parsed.projectId !== projectId ||
      !Array.isArray(parsed.records)
    ) {
      throw new Error(
        "Invalid vector snapshot",
      );
    }

    return parsed as
      VectorSnapshot;
  }

  async save(
    snapshot: VectorSnapshot,
  ): Promise<void> {
    await this.storage.put(
      this.key(
        snapshot.projectId,
      ),
      JSON.stringify(
        snapshot,
      ),
      "application/json",
    );
  }
}
