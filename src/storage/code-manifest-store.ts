import type { StorageProvider } from "./types.js";
import type { CodeManifest } from "../code-intelligence/incremental/manifest.js";

export class PersistentCodeManifestStore {
  constructor(
    private readonly storage: StorageProvider,
  ) {}

  private key(projectId: string): string {
    return [
      "projects",
      projectId,
      "graph",
      "manifest.json",
    ].join("/");
  }

  async load(projectId: string): Promise<CodeManifest | null> {
    const text = await this.storage.getText(
      this.key(projectId),
    );

    if (!text) {
      return null;
    }

    return JSON.parse(text) as CodeManifest;
  }

  async save(manifest: CodeManifest): Promise<void> {
    await this.storage.put(
      this.key(manifest.projectId),
      JSON.stringify(manifest),
      "application/json",
    );
  }
}
