/*
 * Phase 82 — passive coverage-report ingestion.
 *
 * ToolNet ingests a coverage report the caller already produced; it never runs
 * coverage automatically and never treats a coverage number as authority:
 *
 *   covered   -> executed in that run
 *   uncovered -> NOT executed in that run (which does not prove no test exists)
 *
 * A report is bound to a source generation and change fingerprint. A report that
 * cannot be proven current is marked stale rather than silently trusted.
 */

import { isContainedTestPath } from './frameworks.js';

import type { TestCoverageEvidence, TestCoverageFileEntry, TestCoverageFormat } from './types.js';

export interface CoverageIngestInput {
  projectId: string;
  format: TestCoverageFormat;
  content: string;
  /** Generation the report is claimed to belong to. */
  sourceGeneration?: string;
  /** Current generation of the project when the report is ingested. */
  currentGeneration: string;
  changeFingerprint?: string;
  currentChangeFingerprint?: string;
  testRunId?: string;
  maxBytes: number;
  maxFiles: number;
}

function bounded(text: string, maxBytes: number): { text: string; truncated: boolean } {
  const bytes = Buffer.byteLength(text, 'utf8');

  return { text: text.slice(0, maxBytes), truncated: bytes > maxBytes };
}

function parseLcov(
  text: string,
  maxFiles: number
): { files: TestCoverageFileEntry[]; truncated: boolean } {
  const files: TestCoverageFileEntry[] = [];

  let currentPath: string | null = null;
  let linesFound = 0;
  let linesHit = 0;

  let truncated = false;

  for (const line of text.split(/\r?\n/u)) {
    if (line.startsWith('SF:')) {
      currentPath = line.slice(3).trim();
      linesFound = 0;
      linesHit = 0;
      continue;
    }

    if (line.startsWith('LF:')) {
      linesFound = Number.parseInt(line.slice(3), 10) || 0;
      continue;
    }

    if (line.startsWith('LH:')) {
      linesHit = Number.parseInt(line.slice(3), 10) || 0;
      continue;
    }

    if (line.trim() === 'end_of_record' && currentPath) {
      if (files.length >= maxFiles) {
        truncated = true;
        break;
      }

      if (isContainedTestPath(currentPath)) {
        files.push({ path: currentPath, linesFound, linesHit });
      }

      currentPath = null;
    }
  }

  return { files, truncated };
}

function parseCoveragePy(
  document: Record<string, unknown>,
  maxFiles: number
): { files: TestCoverageFileEntry[]; truncated: boolean } {
  const files: TestCoverageFileEntry[] = [];

  const raw = document.files;

  if (typeof raw !== 'object' || raw === null) {
    return { files, truncated: false };
  }

  const entries = Object.entries(raw as Record<string, unknown>).sort(([left], [right]) =>
    left.localeCompare(right)
  );

  let truncated = false;

  for (const [path, value] of entries) {
    if (files.length >= maxFiles) {
      truncated = true;
      break;
    }

    if (typeof value !== 'object' || value === null) {
      continue;
    }

    const summary = (value as Record<string, unknown>).summary;

    if (typeof summary !== 'object' || summary === null) {
      continue;
    }

    const found = Number((summary as Record<string, unknown>).num_statements ?? 0) || 0;
    const hit = Number((summary as Record<string, unknown>).covered_lines ?? 0) || 0;

    if (isContainedTestPath(path)) {
      files.push({ path, linesFound: found, linesHit: hit });
    }
  }

  return { files, truncated };
}

function parseIstanbul(
  document: Record<string, unknown>,
  maxFiles: number
): { files: TestCoverageFileEntry[]; truncated: boolean } {
  const files: TestCoverageFileEntry[] = [];

  const entries = Object.entries(document).sort(([left], [right]) => left.localeCompare(right));

  let truncated = false;

  for (const [path, value] of entries) {
    if (files.length >= maxFiles) {
      truncated = true;
      break;
    }

    if (typeof value !== 'object' || value === null) {
      continue;
    }

    const record = value as Record<string, unknown>;

    const statementMap = record.statementMap;
    const hits = record.s;

    if (typeof statementMap !== 'object' || statementMap === null) {
      continue;
    }

    const found = Object.keys(statementMap as Record<string, unknown>).length;

    const hit =
      typeof hits === 'object' && hits !== null
        ? Object.values(hits as Record<string, unknown>).filter(
            (count) => typeof count === 'number' && count > 0
          ).length
        : 0;

    if (isContainedTestPath(path)) {
      files.push({ path, linesFound: found, linesHit: hit });
    }
  }

  return { files, truncated };
}

function parseGoCover(
  text: string,
  maxFiles: number
): { files: TestCoverageFileEntry[]; truncated: boolean } {
  const aggregates = new Map<string, { found: number; hit: number }>();

  let truncated = false;

  for (const line of text.split(/\r?\n/u)) {
    if (line.startsWith('mode:') || line.trim().length === 0) {
      continue;
    }

    /*
     * Go coverprofile columns are `file:start,end numStatements count`.
     * The execution COUNT is the last column; the statement count is the one
     * before it. Reading them the other way round would silently report a
     * never-executed block as covered.
     */
    const match = /^(.+?):\d+\.\d+,\d+\.\d+\s+(\d+)\s+(\d+)$/u.exec(line.trim());

    if (!match) {
      continue;
    }

    if (!aggregates.has(match[1]!)) {
      if (aggregates.size >= maxFiles) {
        truncated = true;
        break;
      }

      aggregates.set(match[1]!, { found: 0, hit: 0 });
    }

    const bucket = aggregates.get(match[1]!)!;

    const statements = Number.parseInt(match[2]!, 10) || 0;
    const count = Number.parseInt(match[3]!, 10) || 0;

    bucket.found += statements;

    if (count > 0) {
      bucket.hit += statements;
    }
  }

  const files: TestCoverageFileEntry[] = [];

  for (const [path, value] of [...aggregates.entries()].sort(([left], [right]) =>
    left.localeCompare(right)
  )) {
    if (isContainedTestPath(path)) {
      files.push({ path, linesFound: value.found, linesHit: value.hit });
    }
  }

  return { files, truncated };
}

export function ingestCoverage(input: CoverageIngestInput): TestCoverageEvidence {
  const { text, truncated: byteTruncated } = bounded(input.content, input.maxBytes);

  let parsed: { files: TestCoverageFileEntry[]; truncated: boolean };

  switch (input.format) {
    case 'lcov':
      parsed = parseLcov(text, input.maxFiles);
      break;
    case 'coverage_py_json':
    case 'istanbul_json': {
      let document: Record<string, unknown> | null = null;

      try {
        const value = JSON.parse(text) as unknown;

        if (value && typeof value === 'object' && !Array.isArray(value)) {
          document = value as Record<string, unknown>;
        }
      } catch {
        document = null;
      }

      if (!document) {
        return {
          format: input.format,
          projectId: input.projectId,
          files: [],
          totals: { linesFound: 0, linesHit: 0 },
          stale: true,
          reason: 'SOURCE_GENERATION_MISMATCH',
          truncated: byteTruncated,
        };
      }

      parsed =
        input.format === 'coverage_py_json'
          ? parseCoveragePy(document, input.maxFiles)
          : parseIstanbul(document, input.maxFiles);
      break;
    }
    case 'go_coverprofile':
      parsed = parseGoCover(text, input.maxFiles);
      break;
    default:
      parsed = { files: [], truncated: byteTruncated };
  }

  const totals = parsed.files.reduce(
    (accumulator, file) => ({
      linesFound: accumulator.linesFound + file.linesFound,
      linesHit: accumulator.linesHit + file.linesHit,
    }),
    { linesFound: 0, linesHit: 0 }
  );

  /* Staleness is explicit: an unbound or mismatched report is never trusted. */
  let stale = false;
  let reason: TestCoverageEvidence['reason'];

  if (input.sourceGeneration === undefined) {
    stale = true;
    reason = 'NO_GENERATION_DECLARED';
  } else if (input.sourceGeneration !== input.currentGeneration) {
    stale = true;
    reason = 'SOURCE_GENERATION_MISMATCH';
  } else if (
    input.changeFingerprint !== undefined &&
    input.currentChangeFingerprint !== undefined &&
    input.changeFingerprint !== input.currentChangeFingerprint
  ) {
    stale = true;
    reason = 'CHANGE_FINGERPRINT_MISMATCH';
  }

  return {
    format: input.format,
    projectId: input.projectId,
    ...(input.sourceGeneration ? { sourceGeneration: input.sourceGeneration } : {}),
    ...(input.changeFingerprint ? { changeFingerprint: input.changeFingerprint } : {}),
    ...(input.testRunId ? { testRunId: input.testRunId } : {}),
    files: parsed.files,
    totals,
    stale,
    ...(reason ? { reason } : {}),
    truncated: parsed.truncated || byteTruncated,
  };
}
