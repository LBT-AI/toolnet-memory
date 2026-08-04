import {
  readdir,
} from "node:fs/promises";

import {
  extname,
  join,
  relative,
} from "node:path";

import { isSensitiveFile } from "../../security/file-filter.js";

const EXTENSIONS =
  new Set([
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".mts",
    ".cts",
  ]);

const IGNORED =
  new Set([
    "node_modules",
    ".git",
    "dist",
    "build",
    "coverage",
    ".next",
    ".cache",
    ".toolnet-memory",
  ]);

export async function scanRepository(
  rootPath: string,
): Promise<string[]> {
  const files: string[] = [];

  async function walk(
    dir: string,
  ): Promise<void> {
    const entries =
      await readdir(
        dir,
        {
          withFileTypes: true,
        },
      );

    for (
      const entry
      of entries
    ) {
      if (
        IGNORED.has(
          entry.name,
        )
      ) {
        continue;
      }

      const full =
        join(
          dir,
          entry.name,
        );

      if (
        entry.isDirectory()
      ) {
        await walk(full);
        continue;
      }

      if (
        !EXTENSIONS.has(
          extname(
            entry.name,
          ),
        )
      ) {
        continue;
      }

      if (
        isSensitiveFile(
          full,
        )
      ) {
        continue;
      }

      files.push(
        relative(
          rootPath,
          full,
        ),
      );
    }
  }

  await walk(rootPath);

  return files.sort();
}
