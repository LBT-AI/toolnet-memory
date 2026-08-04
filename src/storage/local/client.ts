import {
  access,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";

import {
  dirname,
  join,
  relative,
  resolve,
} from "node:path";

import type {
  StorageObject,
  StorageProvider,
} from "../types.js";

export class LocalStorageProvider
  implements StorageProvider
{
  readonly name = "local";

  constructor(
    private readonly root: string,
  ) {}

  private path(
    key: string,
  ): string {
    const safeKey =
      key.replace(/^\/+/, "");

    return resolve(
      this.root,
      safeKey,
    );
  }

  async put(
    key: string,
    data: string | Uint8Array,
  ): Promise<void> {
    const path =
      this.path(key);

    await mkdir(
      dirname(path),
      {
        recursive: true,
      },
    );

    await writeFile(
      path,
      data,
    );
  }

  async get(
    key: string,
  ): Promise<Uint8Array | null> {
    try {
      return await readFile(
        this.path(key),
      );
    } catch (
      error: unknown
    ) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return null;
      }

      throw error;
    }
  }

  async getText(
    key: string,
  ): Promise<string | null> {
    const data =
      await this.get(key);

    if (!data) {
      return null;
    }

    return Buffer
      .from(data)
      .toString("utf8");
  }

  async exists(
    key: string,
  ): Promise<boolean> {
    try {
      await access(
        this.path(key),
      );

      return true;
    } catch {
      return false;
    }
  }

  async delete(
    key: string,
  ): Promise<void> {
    await rm(
      this.path(key),
      {
        force: true,
      },
    );
  }

  async list(
    prefix = "",
  ): Promise<StorageObject[]> {
    const start =
      this.path(prefix);

    const output:
      StorageObject[] = [];

    try {
      await access(start);
    } catch {
      return output;
    }

    const walk =
      async (
        directory: string,
      ): Promise<void> => {
        const entries =
          await readdir(
            directory,
            {
              withFileTypes: true,
            },
          );

        for (
          const entry
          of entries
        ) {
          const fullPath =
            join(
              directory,
              entry.name,
            );

          if (
            entry.isDirectory()
          ) {
            await walk(
              fullPath,
            );

            continue;
          }

          const info =
            await stat(
              fullPath,
            );

          output.push({
            key:
              relative(
                this.root,
                fullPath,
              ),

            size:
              info.size,

            updatedAt:
              info.mtime
                .toISOString(),
          });
        }
      };

    const info =
      await stat(start);

    if (
      info.isDirectory()
    ) {
      await walk(start);
    } else {
      output.push({
        key:
          relative(
            this.root,
            start,
          ),

        size:
          info.size,

        updatedAt:
          info.mtime
            .toISOString(),
      });
    }

    return output;
  }
}
