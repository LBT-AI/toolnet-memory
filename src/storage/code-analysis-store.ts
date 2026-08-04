import type {
  CodeAnalysisSnapshot,
} from "../code-intelligence/analysis/types.js";

import type {
  StorageProvider,
} from "./types.js";

export class PersistentCodeAnalysisStore {
  constructor(
    private readonly storage:
      StorageProvider,
  ) {}

  private base(
    projectId: string,
  ): string {
    return [
      "projects",
      projectId,
      "code",
      "analysis",
    ].join("/");
  }

  async load(
    projectId: string,
  ): Promise<
    CodeAnalysisSnapshot |
    null
  > {
    const text =
      await this.storage.getText(
        `${this.base(projectId)}/current.json`,
      );

    if (!text) {
      return null;
    }

    return JSON.parse(
      text,
    ) as CodeAnalysisSnapshot;
  }

  async save(
    snapshot:
      CodeAnalysisSnapshot,
  ): Promise<void> {
    const base =
      this.base(
        snapshot.projectId,
      );

    const envelope =
      <T>(
        data: T,
      ) =>
        JSON.stringify(
          {
            version:
              snapshot.version,

            projectId:
              snapshot.projectId,

            updatedAt:
              snapshot.updatedAt,

            data,
          },
          null,
          2,
        );

    await Promise.all([
      this.storage.put(
        `${base}/current.json`,

        JSON.stringify(
          snapshot,
          null,
          2,
        ),

        "application/json",
      ),

      this.storage.put(
        `${base}/dead-code.json`,

        envelope(
          snapshot.deadCode,
        ),

        "application/json",
      ),

      this.storage.put(
        `${base}/dependencies.json`,

        envelope(
          snapshot.dependencies,
        ),

        "application/json",
      ),
    ]);
  }
}
