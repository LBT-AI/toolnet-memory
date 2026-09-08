import { statSync } from 'node:fs';

import type { MemoryRecord, ProjectManifest } from '../core/types.js';
import type { MemoryProjectionDiagnostics } from '../multi-host/memory-projection.js';
import { inspectMemoryQuality } from '../memory/quality.js';
import {
  inspectAdaptiveRetrievalLifecycle,
  type AdaptiveRetrievalLifecycleHealth,
} from './retrieval-feedback.js';
import {
  inspectRetrievalTelemetryFile,
  retrievalTelemetryPath,
  type RetrievalTelemetryFileHealth,
} from './retrieval-telemetry.js';

export const MEMORY_ARCHIVE_CANDIDATE_AGE_DAYS = 90;

export interface MemoryLifecycleHealth {
  total: number;
  fresh: number;
  needsVerification: number;
  stale: number;
  staleRules: number;
  protectedRules: number;
  archiveCandidates: number;
  archiveCandidateIds: string[];
  /**
   * True when canonical Memory could not be loaded (e.g. remote
   * storage unavailable). Memory state is then unknown, not clean.
   */
  unavailable?: boolean;
}

export interface LifecycleDriftReport {
  ok: boolean;
  memory: MemoryLifecycleHealth;
  adaptive: AdaptiveRetrievalLifecycleHealth;
  telemetry: RetrievalTelemetryFileHealth;
  projection: {
    operationCount: number;
    conflicts: number;
    invalidKeys: number;
  };
  warnings: string[];
}

function ageDays(iso: string, now: number): number {
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.max(0, (now - parsed) / (24 * 60 * 60 * 1_000));
}

export function inspectMemoryLifecycle(
  memories: MemoryRecord[],
  now = Date.now()
): MemoryLifecycleHealth {
  const quality = inspectMemoryQuality(memories, now);
  /*
   * Long-term rules are never automatic archive candidates.
   *
   * A stale rule means "verify this rule", not "delete it".
   */
  const staleRules = quality.items.filter(
    (item) => item.scope === 'rule' && item.freshness === 'stale'
  );
  const archiveCandidates = quality.items.filter(
    (item) =>
      item.scope !== 'rule' &&
      item.freshness === 'stale' &&
      ageDays(item.observedAt, now) >= MEMORY_ARCHIVE_CANDIDATE_AGE_DAYS
  );
  return {
    total: quality.total,
    fresh: quality.fresh,
    needsVerification: quality.needsVerification,
    stale: quality.stale,
    staleRules: staleRules.length,
    protectedRules: quality.rules,
    archiveCandidates: archiveCandidates.length,
    archiveCandidateIds: archiveCandidates.map((item) => item.id),
  };
}

export function inspectLifecycleDrift(
  project: Pick<ProjectManifest, 'rootPath'>,
  memories: MemoryRecord[],
  projection: MemoryProjectionDiagnostics,
  now = Date.now(),
  memoryError?: string
): LifecycleDriftReport {
  const memory =
    memoryError === undefined
      ? inspectMemoryLifecycle(memories, now)
      : {
          ...inspectMemoryLifecycle([], now),
          unavailable: true,
        };
  const adaptive = inspectAdaptiveRetrievalLifecycle(project, now);
  const telemetry = inspectRetrievalTelemetryFile(project, { now });
  const warnings: string[] = [];
  if (memoryError !== undefined) {
    warnings.push(
      `Canonical Memory unavailable: ${memoryError.split(/\s+/u)[0] ?? 'storage error'}`
    );
  }
  if (memory.needsVerification > 0) {
    warnings.push(`${memory.needsVerification} Memory record(s) need verification`);
  }
  if (memory.staleRules > 0) {
    warnings.push(`${memory.staleRules} long-term rule(s) are stale and require review`);
  }
  if (memory.archiveCandidates > 0) {
    warnings.push(
      `${memory.archiveCandidates} stale non-rule Memory record(s) are archive candidates`
    );
  }
  if (adaptive.expiredRules > 0) {
    warnings.push(`${adaptive.expiredRules} adaptive routing rule(s) expired`);
  }
  if (adaptive.recertifyDue > 0) {
    warnings.push(`${adaptive.recertifyDue} adaptive routing rule(s) are due for re-certification`);
  }
  if (!adaptive.benchmarkPassed) {
    warnings.push('Adaptive routing no longer passes the production retrieval benchmark');
  }
  if (telemetry.invalidLines > 0) {
    warnings.push(`${telemetry.invalidLines} malformed retrieval telemetry line(s) require repair`);
  }
  if (telemetry.overMaxAge || telemetry.overMaxBytes || telemetry.overMaxEvents) {
    warnings.push('Retrieval telemetry retention maintenance is due');
  }
  if (projection.conflicts > 0) {
    warnings.push(`${projection.conflicts} Memory projection conflict(s) detected`);
  }
  if (projection.invalidKeys > 0) {
    warnings.push(`${projection.invalidKeys} invalid Memory replication key(s) detected`);
  }
  /*
   * Stale Memory is not itself corruption.
   *
   * Hard failure is reserved for:
   * - projection corruption/conflict,
   * - malformed telemetry,
   * - adaptive benchmark regression.
   */
  const ok =
    memoryError === undefined &&
    projection.conflicts === 0 &&
    projection.invalidKeys === 0 &&
    telemetry.invalidLines === 0 &&
    adaptive.benchmarkPassed;
  return {
    ok,
    memory,
    adaptive,
    telemetry,
    projection: {
      operationCount: projection.operationCount,
      conflicts: projection.conflicts,
      invalidKeys: projection.invalidKeys,
    },
    warnings,
  };
}

export function telemetryBytes(project: Pick<ProjectManifest, 'rootPath'>): number {
  try {
    return statSync(retrievalTelemetryPath(project)).size;
  } catch {
    return 0;
  }
}
