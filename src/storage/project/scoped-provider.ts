import type {
  StorageProvider,
} from "../types.js";

import {
  sanitizeProjectFolder,
} from "./folder.js";

import {
  mapProjectStoragePath,
} from "./layout.js";

interface RemoteProjectManifest {
  version: 1;

  id: string;
  name: string;
  remote: string;

  createdAt: string;
  updatedAt: string;
}

export class ProjectScopedStorageProvider
  implements StorageProvider
{
  readonly name: string;

  /**
   * Physical remote project folder.
   */
  readonly folder: string;

  private readonly sourcePrefix:
    string;

  private readonly targetPrefix:
    string;

  private readonly projectId:
    string;

  private readonly projectName:
    string;

  private registryPromise?:
    Promise<void>;

  constructor(
    private readonly provider:
      StorageProvider,

    projectId:
      string,

    projectName:
      string,

    projectRemote?:
      string,
  ) {
    this.name =
      provider.name;

    this.projectId =
      projectId;

    this.projectName =
      projectName;

    this.folder =
      sanitizeProjectFolder(
        projectRemote ??
        projectName,
      );

    /*
     * Internal modules may still use the immutable project ID
     * in logical paths.
     */
    this.sourcePrefix =
      `projects/${projectId}`;

    /*
     * Human-readable physical namespace.
     */
    this.targetPrefix =
      `projects/${this.folder}`;
  }

  /**
   * Every real project gets:
   *
   * projects/<remote>/project.json
   *
   * This also acts as the remote project registry.
   *
   * IMPORTANT:
   * If another project ID already owns the same remote folder,
   * we fail instead of mixing their memory/graphs.
   */
  private async registerProject():
    Promise<void> {
    const key =
      `${this.targetPrefix}/project.json`;

    const now =
      new Date()
        .toISOString();

    let createdAt =
      now;

    const existingText =
      await this.provider.getText(
        key,
      );

    if (
      existingText
    ) {
      let existing:
        Record<
          string,
          unknown
        >;

      try {
        existing =
          JSON.parse(
            existingText,
          ) as Record<
            string,
            unknown
          >;
      } catch (
        error
      ) {
        throw new Error(
          `Invalid remote ToolNet project manifest at ${key}: ${
            error instanceof Error
              ? error.message
              : String(
                  error,
                )
          }`,
        );
      }

      if (
        typeof existing.id ===
          "string" &&
        existing.id !==
          this.projectId
      ) {
        throw new Error(
          [
            "ToolNet remote project namespace collision.",
            `Remote folder: ${this.targetPrefix}`,
            `Existing project id: ${existing.id}`,
            `Current project id: ${this.projectId}`,
            "Refusing to mix data from two projects.",
          ].join(
            " ",
          ),
        );
      }

      if (
        typeof existing.createdAt ===
        "string"
      ) {
        createdAt =
          existing.createdAt;
      }
    }

    const manifest:
      RemoteProjectManifest = {
      version: 1,

      id:
        this.projectId,

      name:
        this.projectName,

      remote:
        this.folder,

      createdAt,

      updatedAt:
        now,
    };

    await this.provider.put(
      key,

      JSON.stringify(
        manifest,
        null,
        2,
      ) + "\n",

      "application/json",
    );
  }

  private async ensureRegistered():
    Promise<void> {
    if (
      !this.registryPromise
    ) {
      this.registryPromise =
        this.registerProject();
    }

    return this.registryPromise;
  }

  private key(
    value: string,
  ): string {
    value =
      mapProjectStoragePath(
        value,
      );

    if (
      value ===
      this.sourcePrefix
    ) {
      return this.targetPrefix;
    }

    if (
      value.startsWith(
        `${this.sourcePrefix}/`,
      )
    ) {
      return (
        this.targetPrefix +
        value.slice(
          this.sourcePrefix.length,
        )
      );
    }

    /*
     * Accessing the already-resolved physical namespace
     * of this same project is allowed.
     */
    if (
      value ===
      this.targetPrefix ||
      value.startsWith(
        `${this.targetPrefix}/`,
      )
    ) {
      return value;
    }

    /*
     * Critical isolation rule.
     *
     * A scoped project storage provider must never access:
     *
     * projects/<another-project>/...
     */
    if (
      value.startsWith(
        "projects/",
      )
    ) {
      throw new Error(
        [
          "Cross-project storage access denied.",
          `Current project: ${this.targetPrefix}`,
          `Requested key: ${value}`,
        ].join(
          " ",
        ),
      );
    }

    /*
     * Preserve support for logical relative paths used
     * internally by stores/snapshot components.
     */
    return value;
  }

  async put(
    key: string,
    data: any,
    contentType?: string,
  ) {
    await this.ensureRegistered();

    return this.provider.put(
      this.key(
        key,
      ),
      data,
      contentType,
    );
  }

  async get(
    key: string,
  ) {
    await this.ensureRegistered();

    return this.provider.get(
      this.key(
        key,
      ),
    );
  }

  async getText(
    key: string,
  ) {
    await this.ensureRegistered();

    return this.provider.getText(
      this.key(
        key,
      ),
    );
  }

  async delete(
    key: string,
  ) {
    await this.ensureRegistered();

    return this.provider.delete(
      this.key(
        key,
      ),
    );
  }

  async exists(
    key: string,
  ): Promise<boolean> {
    await this.ensureRegistered();

    return this.provider.exists(
      this.key(
        key,
      ),
    );
  }

  async list(
    prefix: string,
  ) {
    await this.ensureRegistered();

    return this.provider.list(
      this.key(
        prefix,
      ),
    );
  }
}
