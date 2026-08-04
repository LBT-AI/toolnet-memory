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

export interface ManifestDiff {
  added: string[];
  modified: string[];
  deleted: string[];
  unchanged: string[];
}

export function diffManifest(
  previous: CodeManifest | null,
  current: CodeManifest,
): ManifestDiff {
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
    } else if (old.hash !== entry.hash) {
      modified.push(path);
    } else {
      unchanged.push(path);
    }
  }

  for (const path of Object.keys(oldFiles)) {
    if (!newFiles[path]) {
      deleted.push(path);
    }
  }

  return {
    added: added.sort(),
    modified: modified.sort(),
    deleted: deleted.sort(),
    unchanged: unchanged.sort(),
  };
}
