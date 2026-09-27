/*
 * Phase 78 — bounded pagination.
 *
 * Scout may stop after the first page. Verify/Auditor must consume every page
 * within the declared scope before they can claim completeness — and if the
 * budget runs out first, the run is reported incomplete rather than silently
 * truncated.
 */

import type { EvidenceLimits } from './types.js';

export interface PageCollection<T> {
  items: T[];
  pages: number;
  rows: number;
  complete: boolean;
  truncated: boolean;
  cursorStale: boolean;
  reason?: string;
}

export interface PageCollectionOptions {
  /** True for Auditor (and negative Verify): walk every page. */
  exhaust: boolean;
  /** Deterministic test seam: the page index at which the cursor goes stale. */
  staleAfterPage?: number;
}

export function collectPages<T>(
  source: readonly T[],
  limits: EvidenceLimits,
  options: PageCollectionOptions
): PageCollection<T> {
  const pageSize = Math.max(1, limits.pageSize);

  if (!options.exhaust) {
    const items = source.slice(0, pageSize);

    const truncated = source.length > items.length;

    return {
      items,
      pages: 1,
      rows: items.length,
      complete: !truncated,
      truncated,
      cursorStale: false,
      ...(truncated ? { reason: 'PAGINATION_INCOMPLETE' } : {}),
    };
  }

  const items: T[] = [];

  let pages = 0;
  let limitReason: string | undefined;

  for (let page = 0; page < limits.maxPages; page += 1) {
    if (options.staleAfterPage !== undefined && page === options.staleAfterPage) {
      return {
        items,
        pages,
        rows: items.length,
        complete: false,
        truncated: false,
        cursorStale: true,
        reason: 'EVIDENCE_CURSOR_STALE',
      };
    }

    const start = page * pageSize;

    if (start >= source.length) {
      break;
    }

    pages = page + 1;

    for (const item of source.slice(start, start + pageSize)) {
      if (items.length >= limits.maxRows) {
        limitReason = 'AUDIT_LIMIT_REACHED';
        break;
      }

      items.push(item);
    }

    if (limitReason) {
      break;
    }
  }

  const consumed = pages * pageSize;

  const exhaustedPages = consumed >= source.length;

  const rowsBounded = items.length <= limits.maxRows;

  const complete = exhaustedPages && rowsBounded && !limitReason;

  return {
    items,
    pages,
    rows: items.length,
    complete,
    truncated: !exhaustedPages,
    cursorStale: false,
    ...(complete
      ? {}
      : {
          reason: limitReason ?? (exhaustedPages ? 'AUDIT_LIMIT_REACHED' : 'PAGINATION_INCOMPLETE'),
        }),
  };
}
