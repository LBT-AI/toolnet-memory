import type {
  VisualizationGraph,
} from "../code-intelligence/visualization/types.js";

import type {
  StorageProvider,
} from "./types.js";

export class PersistentVisualizationStore {
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
      "visualization",
      "graph.json",
    ].join("/");
  }

  async load(
    projectId: string,
  ): Promise<
    VisualizationGraph |
    null
  > {
    const text =
      await this.storage.getText(
        this.key(
          projectId,
        ),
      );

    if (!text) {
      return null;
    }

    return JSON.parse(
      text,
    ) as VisualizationGraph;
  }

  async save(
    graph:
      VisualizationGraph,
  ): Promise<void> {
    await this.storage.put(
      this.key(
        graph.projectId,
      ),

      JSON.stringify(
        graph,
        null,
        2,
      ),

      "application/json",
    );
  }
}
