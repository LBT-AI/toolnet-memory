import type {
  MemoryRecord,
} from "../core/types.js";

import type {
  StorageProvider,
} from "./types.js";

export class MemoryStore {
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
      "memories",
      "current.json",
    ].join("/");
  }

  async load(
    projectId: string,
  ): Promise<MemoryRecord[]> {
    const text =
      await this.storage
        .getText(
          this.key(
            projectId,
          ),
        );

    if (!text) {
      return [];
    }

    const parsed =
      JSON.parse(text);

    if (
      !Array.isArray(parsed)
    ) {
      throw new Error(
        "Invalid memory snapshot",
      );
    }

    return parsed as
      MemoryRecord[];
  }

  async save(
    projectId: string,
    memories:
      MemoryRecord[],
  ): Promise<void> {
    const payload =
      JSON.stringify(
        memories,
        null,
        2,
      );

    await this.storage.put(
      this.key(projectId),
      payload,
      "application/json",
    );
  }
}
