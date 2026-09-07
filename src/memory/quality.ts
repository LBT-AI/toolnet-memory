import type { MemoryFreshnessState, MemoryRecord, MemoryScope } from '../core/types.js';
import { deriveMemoryFreshness, inferMemoryScope } from './scope-freshness.js';

export type MemoryConfidenceBand = 'high' | 'medium' | 'low';

export interface MemoryQualityItem {
  id: string;
  type: MemoryRecord['type'];
  scope: MemoryScope;
  freshness: MemoryFreshnessState;
  confidence: number;
  confidenceBand: MemoryConfidenceBand;
  observedAt: string;
  verifiedAt?: string;
  staleAfter?: string;
  source: string;
  sourceRef?: string;
  content: string;
}

export interface MemoryQualityReport {
  total: number;
  rules: number;
  fresh: number;
  needsVerification: number;
  stale: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  verified: number;
  unverified: number;
  items: MemoryQualityItem[];
}

export interface MemoryQualityFilter {
  freshness?: MemoryFreshnessState[];
  scope?: MemoryScope;
  limit?: number;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function validIso(value: unknown): string | undefined {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    return undefined;
  }
  return new Date(value).toISOString();
}

function confidence(memory: MemoryRecord): number {
  const metadata = record(memory.metadata);
  const raw =
    typeof memory.confidence === 'number'
      ? memory.confidence
      : typeof metadata.confidence === 'number'
        ? metadata.confidence
        : 0;
  if (!Number.isFinite(raw)) {
    return 0;
  }
  return Math.max(0, Math.min(1, raw));
}

export function memoryConfidenceBand(value: number): MemoryConfidenceBand {
  if (value >= 0.9) {
    return 'high';
  }
  if (value >= 0.6) {
    return 'medium';
  }
  return 'low';
}

function scope(memory: MemoryRecord): MemoryScope {
  if (memory.scope) {
    return memory.scope;
  }
  const metadata = record(memory.metadata);
  if (
    typeof metadata.memoryScope === 'string' &&
    ['rule', 'decision', 'fact', 'observation', 'history'].includes(metadata.memoryScope)
  ) {
    return metadata.memoryScope as MemoryScope;
  }
  const learningKind =
    typeof metadata.learningKind === 'string' ? metadata.learningKind : undefined;
  return inferMemoryScope(learningKind, memory.type);
}

function observedAt(memory: MemoryRecord): string {
  const metadata = record(memory.metadata);
  return (
    validIso(memory.observedAt) ??
    validIso(metadata.observedAt) ??
    validIso(metadata.sourceCreatedAt) ??
    validIso(memory.createdAt) ??
    new Date(0).toISOString()
  );
}

function verifiedAt(memory: MemoryRecord): string | undefined {
  const metadata = record(memory.metadata);
  return validIso(memory.verifiedAt) ?? validIso(metadata.verifiedAt);
}

function staleAfter(memory: MemoryRecord): string | undefined {
  const metadata = record(memory.metadata);
  return validIso(memory.staleAfter) ?? validIso(metadata.staleAfter);
}

function sourceRef(memory: MemoryRecord): string | undefined {
  if (memory.sourceRef?.trim()) {
    return memory.sourceRef.trim();
  }
  const metadata = record(memory.metadata);
  if (typeof metadata.sourceRef === 'string' && metadata.sourceRef.trim()) {
    return metadata.sourceRef.trim();
  }
  return undefined;
}

function clean(value: string, max = 600): string {
  const normalized = value.normalize('NFKC').replace(/\s+/gu, ' ').trim();
  if (normalized.length <= max) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function freshnessRank(value: MemoryFreshnessState): number {
  /*
   * Review should surface things requiring attention first.
   */
  switch (value) {
    case 'needs_verification':
      return 0;
    case 'stale':
      return 1;
    case 'fresh':
      return 2;
  }
}

/**
 * Pure/read-only Memory inspection.
 *
 * IMPORTANT:
 * No normalization writes happen here.
 * Canonical Memory records are never mutated by review/status/doctor.
 */
export function inspectMemoryQuality(
  memories: MemoryRecord[],
  now = Date.now()
): MemoryQualityReport {
  const items = memories.map((memory): MemoryQualityItem => {
    const score = confidence(memory);
    const verified = verifiedAt(memory);
    return {
      id: memory.id,
      type: memory.type,
      scope: scope(memory),
      freshness: deriveMemoryFreshness(memory, now),
      confidence: score,
      confidenceBand: memoryConfidenceBand(score),
      observedAt: observedAt(memory),
      ...(verified ? { verifiedAt: verified } : {}),
      ...(staleAfter(memory) ? { staleAfter: staleAfter(memory) } : {}),
      source: memory.source,
      ...(sourceRef(memory) ? { sourceRef: sourceRef(memory) } : {}),
      content: clean(memory.content),
    };
  });
  items.sort(
    (left, right) =>
      freshnessRank(left.freshness) - freshnessRank(right.freshness) ||
      right.confidence - left.confidence ||
      right.observedAt.localeCompare(left.observedAt) ||
      left.id.localeCompare(right.id)
  );
  return {
    total: items.length,
    rules: items.filter((item) => item.scope === 'rule').length,
    fresh: items.filter((item) => item.freshness === 'fresh').length,
    needsVerification: items.filter((item) => item.freshness === 'needs_verification').length,
    stale: items.filter((item) => item.freshness === 'stale').length,
    highConfidence: items.filter((item) => item.confidenceBand === 'high').length,
    mediumConfidence: items.filter((item) => item.confidenceBand === 'medium').length,
    lowConfidence: items.filter((item) => item.confidenceBand === 'low').length,
    verified: items.filter((item) => Boolean(item.verifiedAt)).length,
    unverified: items.filter((item) => !item.verifiedAt).length,
    items,
  };
}

export function filterMemoryQualityItems(
  report: MemoryQualityReport,
  filter: MemoryQualityFilter = {}
): MemoryQualityItem[] {
  const freshness = filter.freshness ? new Set(filter.freshness) : undefined;
  const limit = Math.max(1, Math.min(500, Math.trunc(filter.limit ?? 50)));
  return report.items
    .filter((item) => {
      if (freshness && !freshness.has(item.freshness)) {
        return false;
      }
      if (filter.scope && item.scope !== filter.scope) {
        return false;
      }
      return true;
    })
    .slice(0, limit);
}

export function memoryAgeLabel(iso: string, now = Date.now()): string {
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) {
    return 'unknown';
  }
  const delta = Math.max(0, now - parsed);
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    return `${hours}h`;
  }
  return `${Math.floor(hours / 24)}d`;
}
