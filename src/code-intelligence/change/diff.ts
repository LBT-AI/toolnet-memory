/*
 * Phase 80 — unified-diff parser.
 *
 * Parses a bounded unified diff (from git or an explicit patch) into the
 * canonical change model. It never keeps the raw patch as state, never follows
 * a path outside the project and never parses a binary body as text.
 */

import { normalizeRelativePath, unquoteGitPath } from './paths.js';

import type { ChangeHunk, FileChange } from './types.js';

export interface ParseDiffOptions {
  maxFiles?: number;
  maxHunks?: number;
}

export interface ParsedDiff {
  files: FileChange[];
  truncated: boolean;
  /**
   * Transient changed lines per file path (`+`/`-` prefix preserved). Used for
   * deterministic signature classification; never persisted in a report.
   */
  changedLines: Map<string, string[]>;
}

interface Draft {
  path: string;
  oldPath?: string;
  headerOld?: string;
  headerNew?: string;
  kind: FileChange['kind'];
  binary: boolean;
  hunks: ChangeHunk[];
  additions: number;
  deletions: number;
  lines: string[];
}

const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/u;

/** `b/path` or `/dev/null`, with an optional trailing timestamp after a tab. */
function headerPath(value: string, prefix: 'a/' | 'b/'): string | undefined {
  const withoutTimestamp = value.split('\t', 1)[0]!.trim();

  const unquoted = unquoteGitPath(withoutTimestamp);

  if (unquoted === '/dev/null') {
    return '/dev/null';
  }

  if (unquoted.startsWith(prefix)) {
    return normalizeRelativePath(unquoted.slice(prefix.length));
  }

  return normalizeRelativePath(unquoted);
}

function extractBinaryPath(line: string): string | undefined {
  /* "Binary files a/x and b/y differ" (either side may be /dev/null). */
  const match = /^Binary files (.*) and (.*) differ$/u.exec(line);

  if (!match) {
    return undefined;
  }

  const right = match[2]!;

  if (right === '/dev/null') {
    const left = unquoteGitPath(match[1]!.trim());
    return left === '/dev/null' ? undefined : normalizeRelativePath(left);
  }

  return normalizeRelativePath(unquoteGitPath(right.trim()));
}

function flush(
  files: FileChange[],
  draft: Draft | null,
  changedLines: Map<string, string[]>
): void {
  if (!draft) {
    return;
  }

  const path = draft.path || draft.headerNew || draft.headerOld;

  if (!path) {
    return;
  }

  if (draft.lines.length > 0) {
    changedLines.set(path, draft.lines);
  }

  files.push({
    path,
    ...(draft.kind === 'renamed' || draft.kind === 'copied'
      ? { oldPath: draft.oldPath ?? draft.headerOld }
      : {}),
    kind: draft.kind,
    binary: draft.binary,
    hunks: draft.hunks,
    additions: draft.additions,
    deletions: draft.deletions,
  });
}

export function parseUnifiedDiff(text: string, options: ParseDiffOptions = {}): ParsedDiff {
  const maxFiles = options.maxFiles ?? Number.POSITIVE_INFINITY;
  const maxHunks = options.maxHunks ?? Number.POSITIVE_INFINITY;

  const files: FileChange[] = [];
  const changedLines = new Map<string, string[]>();

  let draft: Draft | null = null;
  let inHunk = false;
  let hunk: ChangeHunk | null = null;
  let hunkCount = 0;
  let truncated = false;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;

    if (line.startsWith('diff --git ')) {
      flush(files, draft, changedLines);

      if (files.length >= maxFiles) {
        draft = null;
        truncated = true;
        break;
      }

      const header = /^diff --git a\/(.+) b\/(.+)$/u.exec(line);

      draft = {
        path: '',
        ...(header
          ? {
              headerOld: normalizeRelativePath(unquoteGitPath(header[1]!)),
              headerNew: normalizeRelativePath(unquoteGitPath(header[2]!)),
            }
          : {}),
        kind: 'modified',
        binary: false,
        hunks: [],
        additions: 0,
        deletions: 0,
        lines: [],
      };
      inHunk = false;
      continue;
    }

    if (!draft) {
      continue;
    }

    if (line.startsWith('new file mode')) {
      draft.kind = 'added';
      continue;
    }

    if (line.startsWith('deleted file mode')) {
      draft.kind = 'deleted';
      continue;
    }

    if (line.startsWith('rename from ')) {
      draft.oldPath = normalizeRelativePath(unquoteGitPath(line.slice('rename from '.length)));
      draft.kind = 'renamed';
      continue;
    }

    if (line.startsWith('rename to ')) {
      draft.path = normalizeRelativePath(unquoteGitPath(line.slice('rename to '.length)));
      draft.kind = 'renamed';
      continue;
    }

    if (line.startsWith('copy from ')) {
      draft.oldPath = normalizeRelativePath(unquoteGitPath(line.slice('copy from '.length)));
      draft.kind = 'copied';
      continue;
    }

    if (line.startsWith('copy to ')) {
      draft.path = normalizeRelativePath(unquoteGitPath(line.slice('copy to '.length)));
      draft.kind = 'copied';
      continue;
    }

    if (line === 'GIT binary patch' || line.startsWith('Binary files ')) {
      draft.binary = true;

      const binaryPath = extractBinaryPath(line);

      if (binaryPath && !draft.path) {
        draft.path = binaryPath;
      }

      continue;
    }

    if (line.startsWith('--- ')) {
      inHunk = false;

      const path = headerPath(line.slice(4), 'a/');

      if (path && path !== '/dev/null' && !draft.oldPath) {
        draft.oldPath = path;
      }

      continue;
    }

    if (line.startsWith('+++ ')) {
      inHunk = false;

      const path = headerPath(line.slice(4), 'b/');

      if (path && path !== '/dev/null') {
        draft.path = path;
      }

      continue;
    }

    if (line.startsWith('@@')) {
      const match = HUNK_HEADER.exec(line);

      if (!match) {
        continue;
      }

      if (hunkCount >= maxHunks) {
        truncated = true;
        break;
      }

      hunkCount += 1;

      hunk = {
        oldStart: Number(match[1]),
        oldLines: match[2] === undefined ? 1 : Number(match[2]),
        newStart: Number(match[3]),
        newLines: match[4] === undefined ? 1 : Number(match[4]),
        additions: 0,
        deletions: 0,
      };

      draft.hunks.push(hunk);
      inHunk = true;
      continue;
    }

    if (inHunk && hunk) {
      if (line.startsWith('+')) {
        hunk.additions += 1;
        draft.additions += 1;
      } else if (line.startsWith('-')) {
        hunk.deletions += 1;
        draft.deletions += 1;
      }

      /* `+++`/`---` headers are handled above, so real +/- lines reach here. */
      if (draft.lines.length < 20_000) {
        draft.lines.push(line);
      }

      continue;
    }

    /* "\ No newline at end of file" and index/mode headers are ignored. */
  }

  flush(files, draft, changedLines);

  files.sort((left, right) => left.path.localeCompare(right.path));

  return { files, truncated, changedLines };
}
