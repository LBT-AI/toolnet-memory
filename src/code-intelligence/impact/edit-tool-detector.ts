const EDIT_TOOL =
  /(^|[_-])(write|edit|patch|replace|multiedit|create|delete|remove|rename|move)([_-]|$)/i;

const PATH_KEYS =
  new Set([
    "path",
    "filepath",
    "file_path",
    "filename",
    "file",
    "target",
    "targetpath",
    "target_path",
    "sourcepath",
    "source_path",
  ]);

function normalizePath(
  value: string,
): string {
  return value
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/^a\//, "")
    .replace(/^b\//, "")
    .replaceAll("\\", "/");
}

function looksLikeFile(
  value: string,
): boolean {
  return (
    value.length > 0 &&
    value.length < 500 &&
    !value.includes("\n") &&
    /(^|\/)[^/]+\.[A-Za-z0-9]+$/
      .test(value)
  );
}

function extractPatchPaths(
  patch: string,
): string[] {
  const output:
    string[] = [];

  const patterns = [
    /^\*\*\* (?:Update|Add|Delete) File:\s*(.+)$/gm,
    /^\+\+\+\s+b\/(.+)$/gm,
    /^---\s+a\/(.+)$/gm,
  ];

  for (const regex of patterns) {
    for (
      const match
      of patch.matchAll(regex)
    ) {
      if (match[1]) {
        output.push(
          normalizePath(
            match[1],
          ),
        );
      }
    }
  }

  return output;
}

function walk(
  value: unknown,
  output: Set<string>,
  key?: string,
): void {
  if (
    typeof value === "string"
  ) {
    const normalizedKey =
      key?.toLowerCase();

    if (
      normalizedKey &&
      PATH_KEYS.has(
        normalizedKey,
      ) &&
      looksLikeFile(value)
    ) {
      output.add(
        normalizePath(value),
      );
    }

    /*
     * apply_patch thường nhét đường dẫn
     * bên trong một chuỗi patch lớn.
     */
    if (
      value.includes(
        "*** Update File:",
      ) ||
      value.includes(
        "*** Add File:",
      ) ||
      value.includes(
        "*** Delete File:",
      ) ||
      value.includes(
        "+++ b/",
      )
    ) {
      for (
        const path
        of extractPatchPaths(
          value,
        )
      ) {
        output.add(path);
      }
    }

    return;
  }

  if (
    Array.isArray(value)
  ) {
    for (const item of value) {
      walk(
        item,
        output,
        key,
      );
    }

    return;
  }

  if (
    value &&
    typeof value === "object"
  ) {
    for (
      const [childKey, child]
      of Object.entries(
        value as Record<
          string,
          unknown
        >,
      )
    ) {
      walk(
        child,
        output,
        childKey,
      );
    }
  }
}

export function isCodeMutationTool(
  tool: string,
): boolean {
  return EDIT_TOOL.test(
    tool.toLowerCase(),
  );
}

export function extractEditedFiles(
  tool: string,
  input?: unknown,
): string[] {
  if (
    !isCodeMutationTool(tool)
  ) {
    return [];
  }

  const output =
    new Set<string>();

  walk(
    input,
    output,
  );

  return [
    ...output,
  ];
}
