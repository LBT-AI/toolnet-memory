import {
  createHash,
} from "node:crypto";

import {
  dirname,
} from "node:path";

import {
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";

export function sha256(
  value:
    string |
    Uint8Array,
): string {
  return createHash(
    "sha256",
  )
    .update(
      value,
    )
    .digest(
      "hex",
    );
}

function normalize(
  value: unknown,
): unknown {
  if (
    Array.isArray(
      value,
    )
  ) {
    return value.map(
      normalize,
    );
  }

  if (
    value &&
    typeof value ===
      "object"
  ) {
    const source =
      value as Record<
        string,
        unknown
      >;

    const result:
      Record<
        string,
        unknown
      > = {};

    for (
      const key
      of Object.keys(
        source,
      ).sort()
    ) {
      result[key] =
        normalize(
          source[key],
        );
    }

    return result;
  }

  return value;
}

export function stableStringify(
  value: unknown,
): string {
  return JSON.stringify(
    normalize(
      value,
    ),
  );
}

export function readJsonFile<T>(
  filePath: string,
): T | null {
  try {
    return JSON.parse(
      readFileSync(
        filePath,
        "utf8",
      ),
    ) as T;
  } catch {
    return null;
  }
}

export function writeJsonAtomic(
  filePath: string,
  value: unknown,
): void {
  mkdirSync(
    dirname(
      filePath,
    ),
    {
      recursive: true,
    },
  );

  const temporary =
    `${filePath}.${process.pid}.tmp`;

  writeFileSync(
    temporary,
    JSON.stringify(
      value,
      null,
      2,
    ) + "\n",
    {
      encoding:
        "utf8",

      mode:
        0o600,
    },
  );

  renameSync(
    temporary,
    filePath,
  );
}
