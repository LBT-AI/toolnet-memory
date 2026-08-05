import {
  existsSync,
} from "node:fs";

import {
  dirname,
  join,
  parse,
  resolve,
} from "node:path";

import {
  ProjectManager,
} from "../../core/index.js";

export function findCodexToolNetProject(
  cwd:
    string,
) {
  let current =
    resolve(
      cwd,
    );

  const filesystemRoot =
    parse(
      current,
    ).root;

  while (true) {
    if (
      existsSync(
        join(
          current,
          ".toolnet",
          "project.json",
        ),
      )
    ) {
      return new ProjectManager()
        .detect(
          current,
        );
    }

    if (
      current ===
      filesystemRoot
    ) {
      break;
    }

    const parent =
      dirname(
        current,
      );

    if (
      parent ===
      current
    ) {
      break;
    }

    current =
      parent;
  }

  return null;
}
