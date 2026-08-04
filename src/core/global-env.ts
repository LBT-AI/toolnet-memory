import {
  existsSync,
  readFileSync,
} from "node:fs";

import {
  homedir,
} from "node:os";

import {
  join,
} from "node:path";

function decodeValue(
  input: string,
): string {
  let value =
    input.trim();

  if (
    value.length >= 2 &&
    value.startsWith('"') &&
    value.endsWith('"')
  ) {
    value =
      value.slice(
        1,
        -1,
      );

    return value
      .replace(
        /\\n/g,
        "\n",
      )
      .replace(
        /\\r/g,
        "\r",
      )
      .replace(
        /\\t/g,
        "\t",
      )
      .replace(
        /\\"/g,
        '"',
      )
      .replace(
        /\\\\/g,
        "\\",
      );
  }

  if (
    value.length >= 2 &&
    value.startsWith("'") &&
    value.endsWith("'")
  ) {
    return value.slice(
      1,
      -1,
    );
  }

  return value;
}

export function loadGlobalToolNetEnv():
  void {
  const filePath =
    process.env
      .TOOLNET_GLOBAL_ENV ??
    join(
      homedir(),
      ".config",
      "toolnet-memory",
      ".env",
    );

  if (
    !existsSync(
      filePath,
    )
  ) {
    return;
  }

  const content =
    readFileSync(
      filePath,
      "utf8",
    );

  for (
    const rawLine
    of content.split(
      /\r?\n/,
    )
  ) {
    let line =
      rawLine.trim();

    if (
      !line ||
      line.startsWith(
        "#",
      )
    ) {
      continue;
    }

    if (
      line.startsWith(
        "export ",
      )
    ) {
      line =
        line.slice(
          "export ".length,
        );
    }

    const index =
      line.indexOf(
        "=",
      );

    if (
      index <= 0
    ) {
      continue;
    }

    const key =
      line
        .slice(
          0,
          index,
        )
        .trim();

    if (
      !/^[A-Za-z_][A-Za-z0-9_]*$/
        .test(
          key,
        )
    ) {
      continue;
    }

    /*
     * Shell ENV / project-specific config wins.
     *
     * Global config only fills missing values.
     */
    if (
      process.env[key] !==
      undefined
    ) {
      continue;
    }

    process.env[key] =
      decodeValue(
        line.slice(
          index + 1,
        ),
      );
  }
}

/*
 * Load immediately when imported by config.ts.
 */
loadGlobalToolNetEnv();
