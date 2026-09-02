export interface FileManifestEntry {
  path: string;
  hash: string;
}

export interface CodeManifest {
  version: 1;
  projectId: string;
  updatedAt: string;
  files: Record<string, FileManifestEntry>;
}

export interface ManifestRename {
  from: string;
  to: string;
  hash: string;
}

export interface ManifestDiff {
  added: string[];
  modified: string[];
  deleted: string[];
  unchanged: string[];
  renamed: ManifestRename[];
}

function groupedByHash(
  paths: readonly string[],
  files: Record<string, FileManifestEntry>
): Map<string, string[]> {
  const output = new Map<string, string[]>();

  for (const path of paths) {
    const entry = files[path];

    if (!entry) {
      continue;
    }

    const list = output.get(entry.hash) ?? [];

    list.push(path);

    output.set(entry.hash, list);
  }

  return output;
}

/*
 * Rename detection is intentionally conservative.
 *
 * A rename is recognized only when one deleted path
 * and one added path have a uniquely matching hash.
 *
 * Duplicate identical files are NOT guessed as renames.
 */
function detectRenames(
  added: readonly string[],
  deleted: readonly string[],
  oldFiles: Record<string, FileManifestEntry>,
  newFiles: Record<string, FileManifestEntry>
): ManifestRename[] {
  const oldByHash = groupedByHash(deleted, oldFiles);

  const newByHash = groupedByHash(added, newFiles);

  const renamed: ManifestRename[] = [];

  for (const [hash, oldPaths] of oldByHash) {
    const newPaths = newByHash.get(hash);

    if (oldPaths.length !== 1 || !newPaths || newPaths.length !== 1) {
      continue;
    }

    renamed.push({
      from: oldPaths[0]!,
      to: newPaths[0]!,
      hash,
    });
  }

  return renamed.sort((left, right) => left.from.localeCompare(right.from));
}

export function diffManifest(previous: CodeManifest | null, current: CodeManifest): ManifestDiff {
  const oldFiles = previous?.files ?? {};

  const newFiles = current.files;

  const added: string[] = [];

  const modified: string[] = [];

  const deleted: string[] = [];

  const unchanged: string[] = [];

  for (const [path, entry] of Object.entries(newFiles)) {
    const old = oldFiles[path];

    if (!old) {
      added.push(path);
      continue;
    }

    if (old.hash !== entry.hash) {
      modified.push(path);
      continue;
    }

    unchanged.push(path);
  }

  for (const path of Object.keys(oldFiles)) {
    if (!newFiles[path]) {
      deleted.push(path);
    }
  }

  const renamed = detectRenames(added, deleted, oldFiles, newFiles);

  const renamedFrom = new Set(renamed.map((item) => item.from));

  const renamedTo = new Set(renamed.map((item) => item.to));

  return {
    added: added.filter((path) => !renamedTo.has(path)).sort(),
    modified: modified.sort(),
    deleted: deleted.filter((path) => !renamedFrom.has(path)).sort(),
    unchanged: unchanged.sort(),
    renamed,
  };
}
