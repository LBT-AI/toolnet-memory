import type {
  StorageProvider,
} from "./types.js";

import type {
  CodeChunk,
} from "../code-intelligence/chunks/types.js";

export interface CodeChunkSnapshot {
  version: 1;
  projectId: string;
  updatedAt: string;
  chunks: CodeChunk[];
}

export class PersistentCodeChunkStore {
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
      "code",
      "chunks",
      "current.json",
    ].join("/");
  }

  async load(
    projectId: string,
  ): Promise<CodeChunkSnapshot | null> {
    const text =
      await this.storage.getText(
        this.key(projectId),
      );

    if (!text) {
      return null;
    }

    return JSON.parse(
      text,
    ) as CodeChunkSnapshot;
  }

  async save(
    snapshot:
      CodeChunkSnapshot,
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
