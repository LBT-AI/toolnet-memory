import {
  execFile,
} from "node:child_process";

import {
  promisify,
} from "node:util";

const execFileAsync =
  promisify(execFile);

export interface ChangedRange {
  startLine: number;
  endLine: number;
}

export interface ChangedFile {
  filePath: string;
  status:
    | "modified"
    | "added"
    | "deleted"
    | "renamed";

  ranges:
    ChangedRange[];
}

function parseRanges(
  patch: string,
): ChangedRange[] {
  const ranges:
    ChangedRange[] = [];

  const regex =
    /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm;

  for (
    const match
    of patch.matchAll(regex)
  ) {
    const start =
      Number(match[1]);

    const count =
      Number(
        match[2] ?? 1,
      );

    ranges.push({
      startLine:
        start,

      endLine:
        Math.max(
          start,
          start + count - 1,
        ),
    });
  }

  return ranges;
}

function mapStatus(
  value: string,
): ChangedFile["status"] {
  if (
    value.startsWith("A")
  ) {
    return "added";
  }

  if (
    value.startsWith("D")
  ) {
    return "deleted";
  }

  if (
    value.startsWith("R")
  ) {
    return "renamed";
  }

  return "modified";
}

export async function readGitChanges(
  rootPath: string,
): Promise<ChangedFile[]> {
  let names = "";

  try {
    const result =
      await execFileAsync(
        "git",
        [
          "diff",
          "HEAD",
          "--name-status",
          "--no-renames",
        ],
        {
          cwd:
            rootPath,

          maxBuffer:
            10 * 1024 * 1024,
        },
      );

    names =
      result.stdout;
  } catch {
    return [];
  }

  const files:
    ChangedFile[] = [];

  for (
    const line
    of names
      .split(/\r?\n/)
      .filter(Boolean)
  ) {
    const [
      rawStatus,
      ...parts
    ] =
      line.split("\t");

    const filePath =
      parts.at(-1);

    if (!filePath) {
      continue;
    }

    let patch = "";

    try {
      const result =
        await execFileAsync(
          "git",
          [
            "diff",
            "HEAD",
            "--unified=0",
            "--",
            filePath,
          ],
          {
            cwd:
              rootPath,

            maxBuffer:
              20 * 1024 * 1024,
          },
        );

      patch =
        result.stdout;
    } catch {
      patch = "";
    }

    files.push({
      filePath,

      status:
        mapStatus(
          rawStatus,
        ),

      ranges:
        parseRanges(
          patch,
        ),
    });
  }

  /*
   * Git diff HEAD không bao gồm untracked.
   */
  try {
    const result =
      await execFileAsync(
        "git",
        [
          "ls-files",
          "--others",
          "--exclude-standard",
        ],
        {
          cwd:
            rootPath,
        },
      );

    for (
      const filePath
      of result.stdout
        .split(/\r?\n/)
        .filter(Boolean)
    ) {
      if (
        files.some(
          (item) =>
            item.filePath ===
            filePath,
        )
      ) {
        continue;
      }

      files.push({
        filePath,
        status:
          "added",
        ranges: [],
      });
    }
  } catch {
    // Not fatal.
  }

  return files;
}
