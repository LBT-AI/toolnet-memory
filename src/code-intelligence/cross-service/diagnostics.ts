import type { CrossServiceSnapshot, UnresolvedCrossServiceReference } from './types.js';

export const MAX_DIAGNOSTIC_PATHS = 50;

export interface CrossServiceDiagnosticSummary {
  total: number;
  truncated: boolean;
  byReason: Record<string, number>;
  paths: string[];
}

/**
 * Bounded, source-free diagnostics.
 *
 * Never returns more than `maxPaths` paths and never includes source text,
 * credentials or environment values.
 */
export function summarizeDiagnostics(
  snapshot: CrossServiceSnapshot | null | undefined,
  maxPaths = MAX_DIAGNOSTIC_PATHS
): CrossServiceDiagnosticSummary {
  const unresolved: UnresolvedCrossServiceReference[] = snapshot?.unresolved ?? [];

  const byReason: Record<string, number> = {};
  const paths: string[] = [];

  for (const reference of unresolved) {
    byReason[reference.reason] = (byReason[reference.reason] ?? 0) + 1;
    if (paths.length < maxPaths && !paths.includes(reference.filePath)) {
      paths.push(reference.filePath);
    }
  }

  return {
    total: snapshot?.stats.unresolved ?? unresolved.length,
    truncated:
      unresolved.length > maxPaths || (snapshot?.stats.unresolved ?? 0) > unresolved.length,
    byReason,
    paths,
  };
}
