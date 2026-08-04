import type {
  StorageProvider,
} from "./types.js";

import type {
  TypeResolutionSnapshot,
} from "../code-intelligence/resolution/types.js";

export class PersistentTypeResolutionStore {
  constructor(
    private readonly storage:
      StorageProvider,
  ) {}

  private key(
    projectId:
      string,
  ): string {
    return [
      "projects",
      projectId,
      "graph",
      "resolution",
      "current.json",
    ].join("/");
  }

  async load(
    projectId:
      string,
  ): Promise<
    TypeResolutionSnapshot |
    null
  > {
    const text =
      await this.storage
        .getText(
          this.key(
            projectId,
          ),
        );

    if (!text) {
      return null;
    }

    return JSON.parse(
      text,
    ) as TypeResolutionSnapshot;
  }

  async save(
    snapshot:
      TypeResolutionSnapshot,
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
