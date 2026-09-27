/*
 * Phase 78 — source fallback for recorded coverage gaps.
 *
 * When structural parsing leaves a bounded hole (a parse failure, an unresolved
 * reference), Verify/Auditor may run a narrow, deterministic lexical check
 * inside that single file. Fallback never executes source, never reads outside
 * the project root, never touches sensitive files and never pretends to resolve
 * the graph structurally.
 */

import type {
  EvidenceFacts,
  EvidenceGap,
  EvidenceItem,
  EvidenceScope,
  EvidenceSourceFallbackReport,
} from './types.js';

import { EVIDENCE_LIMITS } from './limits.js';

export interface SourceFallbackInput {
  facts: EvidenceFacts;
  gaps: readonly EvidenceGap[];
  scope: EvidenceScope;
  /** Exact name to look for. Fallback without a concrete needle is refused. */
  needle?: string;
  maxFiles?: number;
}

export interface SourceFallbackOutcome {
  report: EvidenceSourceFallbackReport;
  items: EvidenceItem[];
  blockers: string[];
  /** Gaps the fallback could not close — uncertainty that survives the pass. */
  unclosedGaps: EvidenceGap[];
}

const FALLBACK_GAP_KINDS = new Set([
  'parse_failure',
  'unsupported_language',
  'unresolved_reference',
  'ambiguous_reference',
  'dynamic_target',
]);

function pathInScope(path: string, scope: EvidenceScope): boolean {
  if (scope.kind !== 'path' || !scope.paths || scope.paths.length === 0) {
    return true;
  }

  return scope.paths.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function isFallbackCandidate(gap: EvidenceGap, scope: EvidenceScope): boolean {
  if (!FALLBACK_GAP_KINDS.has(gap.kind)) {
    return false;
  }

  if (!gap.path) {
    return true;
  }

  return pathInScope(gap.path, scope);
}

export function runSourceFallback(input: SourceFallbackInput): SourceFallbackOutcome {
  const report: EvidenceSourceFallbackReport = {
    requested: true,
    performed: false,
    gapsChecked: [],
    matches: 0,
    skipped: [],
  };

  const items: EvidenceItem[] = [];
  const blockers: string[] = [];
  const unclosedGaps: EvidenceGap[] = [];

  const candidates = input.gaps.filter((gap) => isFallbackCandidate(gap, input.scope));

  if (candidates.length === 0) {
    return { report, items, blockers, unclosedGaps };
  }

  if (!input.needle) {
    for (const gap of candidates) {
      unclosedGaps.push(gap);
    }

    blockers.push('SOURCE_FALLBACK_SKIPPED');
    return { report: { ...report, requested: true }, items, blockers, unclosedGaps };
  }

  const readSource = input.facts.readSource;

  if (!readSource) {
    for (const gap of candidates) {
      unclosedGaps.push(gap);
    }

    blockers.push('SOURCE_FALLBACK_SKIPPED');
    return { report, items, blockers, unclosedGaps };
  }

  const maxFiles = Math.min(
    input.maxFiles ?? EVIDENCE_LIMITS.maxAuditFiles,
    EVIDENCE_LIMITS.maxAuditFiles
  );

  const seenPaths = new Set<string>();

  for (const gap of candidates) {
    const path = gap.path;

    if (!path) {
      unclosedGaps.push(gap);
      continue;
    }

    if (seenPaths.has(path)) {
      continue;
    }

    if (seenPaths.size >= maxFiles) {
      unclosedGaps.push(gap);
      blockers.push('AUDIT_LIMIT_REACHED');
      continue;
    }

    seenPaths.add(path);
    report.gapsChecked.push(path);

    try {
      const result = readSource(path, input.needle, EVIDENCE_LIMITS.maxSourceMatchesPerFile);

      report.performed = true;

      if (result.matches.length === 0) {
        /*
         * The file parsed badly but a bounded lexical check found no
         * reference to the subject: the gap is closed as far as this claim is
         * concerned.
         */
        continue;
      }

      /*
       * A reference exists in a file the structural graph could not see. That
       * is real evidence, and it contradicts an absence claim rather than
       * closing the gap.
       */
      blockers.push('SOURCE_REFERENCE_FOUND');

      for (const match of result.matches) {
        items.push({
          origin: 'source_fallback',
          kind: 'source_match',
          id: `fallback:${path}:${match.line}`,
          path,
          line: match.line,
          method: 'lexical_exact_reference',
        });

        report.matches += 1;
      }
    } catch (error) {
      report.skipped.push({
        path,
        reason: error instanceof Error ? error.message : 'SOURCE_FALLBACK_FAILED',
      });

      blockers.push('SOURCE_FALLBACK_SENSITIVE');
      unclosedGaps.push(gap);
    }
  }

  if (unclosedGaps.length > 0) {
    blockers.push('SOURCE_GAP_UNCLOSED');
  }

  items.sort((left, right) => left.id.localeCompare(right.id));

  return { report, items, blockers: [...new Set(blockers)], unclosedGaps };
}
