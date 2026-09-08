import { randomUUID } from 'node:crypto';
import {
  appendFileSync,
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

import type { ProjectManifest } from '../core/types.js';
import type { CompositeRetrievalPlan, CompositeRetrievalResult } from './composite-retrieval.js';
import { measureRetrievalExecution } from './retrieval-quality.js';

export const RETRIEVAL_TELEMETRY_SCHEMA_VERSION = 1;
export const RETRIEVAL_TELEMETRY_DEFAULT_MAX_EVENTS = 5_000;
export const RETRIEVAL_TELEMETRY_DEFAULT_MAX_BYTES = 2 * 1024 * 1024;

export type RetrievalTelemetrySurface = 'cli' | 'mcp';
export type RetrievalTelemetryOutcome = 'success' | 'no_result' | 'error';

export interface RetrievalTelemetryEvent {
  version: 1;
  eventId: string;
  occurredAt: string;
  surface: RetrievalTelemetrySurface;
  outcome: RetrievalTelemetryOutcome;
  durationMs: number;
  mode: 'single' | 'composite';
  intents: string[];
  plannedSources: string[];
  attemptedSources: string[];
  selectedSource: string;
  omittedIntents: string[];
  primaryConfidence: number;
  resultCount: number;
  answerChars: number;
  estimatedTokens: number;
  provenanceCoverage: number;
  conflicts: string[];
  sourceBudgetExceeded: boolean;
  errorCode?: string;
}

export interface RetrievalTelemetryRecordOptions {
  surface: RetrievalTelemetrySurface;
  durationMs: number;
  occurredAt?: string;
  maxEvents?: number;
  maxBytes?: number;
}

export interface RetrievalTelemetryErrorOptions extends RetrievalTelemetryRecordOptions {
  error: unknown;
}

export interface RetrievalTelemetrySummary {
  windowHours: number;
  totalStored: number;
  eventsInWindow: number;
  success: number;
  noResult: number;
  errors: number;
  single: number;
  composite: number;
  averageDurationMs: number;
  p95DurationMs: number;
  averageEstimatedTokens: number;
  averageAttemptedSources: number;
  averageProvenanceCoverage: number;
  conflictEvents: number;
  sourceBudgetViolations: number;
  bySurface: Record<string, number>;
  byIntent: Record<string, number>;
  bySource: Record<string, number>;
}

export interface RetrievalTelemetrySummaryOptions {
  now?: number;
  windowHours?: number;
}

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function rounded(value: number, digits = 3): number {
  const scale = 10 ** digits;
  return Math.round(finite(value) * scale) / scale;
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function enabledValue(value: string | undefined): boolean {
  if (!value) {
    return true;
  }
  return !['0', 'false', 'off', 'disabled', 'no'].includes(value.trim().toLocaleLowerCase());
}

export function retrievalTelemetryEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return enabledValue(env.TOOLNET_RETRIEVAL_TELEMETRY);
}

export function retrievalTelemetryPath(project: Pick<ProjectManifest, 'rootPath'>): string {
  return join(project.rootPath, '.toolnet', 'retrieval', 'telemetry.jsonl');
}

function safeErrorCode(error: unknown): string {
  const value = error instanceof Error ? error.message : String(error);
  /*
   * Never persist arbitrary exception text.
   *
   * Only an uppercase machine-code-looking token
   * may leave the current process.
   */
  const match = value.match(/\b[A-Z][A-Z0-9_:-]{2,80}\b/u);
  return match?.[0] ?? 'UNCLASSIFIED_ERROR';
}

function createDirectory(file: string): void {
  const directory = dirname(file);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  try {
    chmodSync(directory, 0o700);
  } catch {
    /*
     * Permission hardening is best effort on filesystems
     * that do not expose POSIX modes.
     */
  }
}

function appendTelemetryEvent(
  file: string,
  event: RetrievalTelemetryEvent,
  options: RetrievalTelemetryRecordOptions
): void {
  createDirectory(file);
  appendFileSync(file, `${JSON.stringify(event)}\n`, { encoding: 'utf8', mode: 0o600 });
  try {
    chmodSync(file, 0o600);
  } catch {
    // best effort
  }
  const maxBytes = Math.max(
    1_024,
    Math.trunc(options.maxBytes ?? RETRIEVAL_TELEMETRY_DEFAULT_MAX_BYTES)
  );
  let size = 0;
  try {
    size = statSync(file).size;
  } catch {
    return;
  }
  if (size <= maxBytes) {
    return;
  }
  const maxEvents = Math.max(
    10,
    Math.trunc(options.maxEvents ?? RETRIEVAL_TELEMETRY_DEFAULT_MAX_EVENTS)
  );
  let lines: string[];
  try {
    lines = readFileSync(file, 'utf8')
      .split(/\r?\n/u)
      .filter((line) => line.trim());
  } catch {
    return;
  }
  const kept = lines.slice(-maxEvents);
  const temporary = `${file}.tmp`;
  try {
    writeFileSync(temporary, kept.length > 0 ? `${kept.join('\n')}\n` : '', {
      encoding: 'utf8',
      mode: 0o600,
    });
    renameSync(temporary, file);
    try {
      chmodSync(file, 0o600);
    } catch {
      // best effort
    }
  } catch {
    /*
     * Telemetry is non-authoritative.
     * Failure to compact must never fail retrieval.
     */
  }
}

function eventFromResult(
  result: CompositeRetrievalResult,
  options: RetrievalTelemetryRecordOptions
): RetrievalTelemetryEvent {
  const execution = measureRetrievalExecution(result);
  return {
    version: RETRIEVAL_TELEMETRY_SCHEMA_VERSION,
    eventId: randomUUID(),
    occurredAt: options.occurredAt ?? new Date().toISOString(),
    surface: options.surface,
    outcome: result.source === 'none' ? 'no_result' : 'success',
    durationMs: rounded(Math.max(0, options.durationMs)),
    mode: result.mode,
    intents: unique(result.plan.steps.map((step) => step.intent)),
    plannedSources: unique(result.plan.sources),
    attemptedSources: unique(result.attemptedSources),
    selectedSource: result.source,
    omittedIntents: unique(result.plan.omittedIntents),
    primaryConfidence: rounded(result.route.confidence),
    resultCount: Math.max(0, Math.trunc(result.stats.resultCount)),
    answerChars: execution.answerChars,
    estimatedTokens: execution.estimatedTokens,
    provenanceCoverage: rounded(execution.provenanceCoverage),
    conflicts: unique(result.conflicts.map((conflict) => conflict.code)),
    sourceBudgetExceeded: execution.sourceBudgetExceeded,
  };
}

function eventFromError(
  plan: CompositeRetrievalPlan,
  options: RetrievalTelemetryErrorOptions
): RetrievalTelemetryEvent {
  return {
    version: RETRIEVAL_TELEMETRY_SCHEMA_VERSION,
    eventId: randomUUID(),
    occurredAt: options.occurredAt ?? new Date().toISOString(),
    surface: options.surface,
    outcome: 'error',
    durationMs: rounded(Math.max(0, options.durationMs)),
    mode: plan.mode,
    intents: unique(plan.steps.map((step) => step.intent)),
    plannedSources: unique(plan.sources),
    attemptedSources: [],
    selectedSource: 'none',
    omittedIntents: unique(plan.omittedIntents),
    primaryConfidence: rounded(plan.primaryRoute.confidence),
    resultCount: 0,
    answerChars: 0,
    estimatedTokens: 0,
    provenanceCoverage: 0,
    conflicts: [],
    sourceBudgetExceeded: false,
    errorCode: safeErrorCode(options.error),
  };
}

/**
 * Best-effort and local-only.
 *
 * Telemetry MUST NEVER change retrieval success/failure.
 */
export function recordRetrievalTelemetry(
  project: Pick<ProjectManifest, 'rootPath'>,
  result: CompositeRetrievalResult,
  options: RetrievalTelemetryRecordOptions
): boolean {
  if (!retrievalTelemetryEnabled()) {
    return false;
  }
  try {
    appendTelemetryEvent(
      retrievalTelemetryPath(project),
      eventFromResult(result, options),
      options
    );
    return true;
  } catch {
    return false;
  }
}

export function recordRetrievalTelemetryError(
  project: Pick<ProjectManifest, 'rootPath'>,
  plan: CompositeRetrievalPlan,
  options: RetrievalTelemetryErrorOptions
): boolean {
  if (!retrievalTelemetryEnabled()) {
    return false;
  }
  try {
    appendTelemetryEvent(retrievalTelemetryPath(project), eventFromError(plan, options), options);
    return true;
  } catch {
    return false;
  }
}

function validEvent(value: unknown): value is RetrievalTelemetryEvent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const event = value as Record<string, unknown>;
  return (
    event.version === 1 &&
    typeof event.eventId === 'string' &&
    typeof event.occurredAt === 'string' &&
    Number.isFinite(Date.parse(event.occurredAt)) &&
    (event.surface === 'cli' || event.surface === 'mcp') &&
    (event.outcome === 'success' || event.outcome === 'no_result' || event.outcome === 'error') &&
    (event.mode === 'single' || event.mode === 'composite') &&
    Array.isArray(event.intents) &&
    Array.isArray(event.plannedSources) &&
    Array.isArray(event.attemptedSources) &&
    typeof event.selectedSource === 'string' &&
    typeof event.durationMs === 'number'
  );
}

export function readRetrievalTelemetry(
  project: Pick<ProjectManifest, 'rootPath'>
): RetrievalTelemetryEvent[] {
  const file = retrievalTelemetryPath(project);
  if (!existsSync(file)) {
    return [];
  }
  let text: string;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return [];
  }
  const events: RetrievalTelemetryEvent[] = [];
  for (const line of text.split(/\r?\n/u)) {
    if (!line.trim()) {
      continue;
    }
    try {
      const parsed = JSON.parse(line);
      if (validEvent(parsed)) {
        events.push(parsed);
      }
    } catch {
      /*
       * Telemetry is diagnostic.
       * One malformed line must not affect normal product use.
       */
    }
  }
  return events;
}

function increment(target: Record<string, number>, key: string): void {
  target[key] = (target[key] ?? 0) + 1;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function percentile95(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * 0.95) - 1));
  return sorted[index] ?? 0;
}

export function summarizeRetrievalTelemetry(
  project: Pick<ProjectManifest, 'rootPath'>,
  options: RetrievalTelemetrySummaryOptions = {}
): RetrievalTelemetrySummary {
  const all = readRetrievalTelemetry(project);
  const now = options.now ?? Date.now();
  const windowHours = Math.max(1, Math.min(24 * 365, Math.trunc(options.windowHours ?? 24 * 7)));
  const threshold = now - windowHours * 60 * 60 * 1_000;
  const events = all.filter((event) => Date.parse(event.occurredAt) >= threshold);
  const durations = events.map((event) => event.durationMs);
  const tokens = events.map((event) => event.estimatedTokens);
  const attempted = events.map((event) => event.attemptedSources.length);
  const provenance = events
    .filter((event) => event.outcome === 'success')
    .map((event) => event.provenanceCoverage);
  const bySurface: Record<string, number> = {};
  const byIntent: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  for (const event of events) {
    increment(bySurface, event.surface);
    for (const intent of event.intents) {
      increment(byIntent, intent);
    }
    for (const source of event.attemptedSources) {
      increment(bySource, source);
    }
  }
  return {
    windowHours,
    totalStored: all.length,
    eventsInWindow: events.length,
    success: events.filter((event) => event.outcome === 'success').length,
    noResult: events.filter((event) => event.outcome === 'no_result').length,
    errors: events.filter((event) => event.outcome === 'error').length,
    single: events.filter((event) => event.mode === 'single').length,
    composite: events.filter((event) => event.mode === 'composite').length,
    averageDurationMs: rounded(average(durations)),
    p95DurationMs: rounded(percentile95(durations)),
    averageEstimatedTokens: rounded(average(tokens)),
    averageAttemptedSources: rounded(average(attempted)),
    averageProvenanceCoverage: rounded(average(provenance)),
    conflictEvents: events.filter((event) => event.conflicts.length > 0).length,
    sourceBudgetViolations: events.filter((event) => event.sourceBudgetExceeded).length,
    bySurface,
    byIntent,
    bySource,
  };
}

/**
 * Used by tests and production certification.
 */
export const RETRIEVAL_TELEMETRY_FORBIDDEN_KEYS = [
  'question',
  'answer',
  'query',
  'prompt',
  'filePath',
  'taskId',
  'memoryContent',
  'sourceRef',
] as const;

// ============================================================================
// Phase 66 — telemetry lifecycle
// ============================================================================
export const RETRIEVAL_TELEMETRY_DEFAULT_MAX_AGE_DAYS = 30;

export interface RetrievalTelemetryFileHealth {
  exists: boolean;
  bytes: number;
  totalLines: number;
  validEvents: number;
  invalidLines: number;
  oldestEventAt?: string;
  newestEventAt?: string;
  overMaxEvents: boolean;
  overMaxBytes: boolean;
  overMaxAge: boolean;
}

export interface RetrievalTelemetryMaintenanceOptions {
  now?: number;
  maxAgeDays?: number;
  maxEvents?: number;
  maxBytes?: number;
}

export interface RetrievalTelemetryMaintenanceResult {
  before: RetrievalTelemetryFileHealth;
  after: RetrievalTelemetryFileHealth;
  removedExpired: number;
  removedMalformed: number;
  removedOverflow: number;
  changed: boolean;
}

function rawTelemetryLines(project: Pick<ProjectManifest, 'rootPath'>): string[] {
  const file = retrievalTelemetryPath(project);
  if (!existsSync(file)) {
    return [];
  }
  try {
    return readFileSync(file, 'utf8')
      .split(/\r?\n/u)
      .filter((line) => line.trim());
  } catch {
    return [];
  }
}

function parseTelemetryLines(lines: string[]): {
  valid: RetrievalTelemetryEvent[];
  invalid: number;
} {
  const valid: RetrievalTelemetryEvent[] = [];
  let invalid = 0;
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (validEvent(parsed)) {
        valid.push(parsed);
      } else {
        invalid += 1;
      }
    } catch {
      invalid += 1;
    }
  }
  return { valid, invalid };
}

export function inspectRetrievalTelemetryFile(
  project: Pick<ProjectManifest, 'rootPath'>,
  options: RetrievalTelemetryMaintenanceOptions = {}
): RetrievalTelemetryFileHealth {
  const file = retrievalTelemetryPath(project);
  const now = options.now ?? Date.now();
  const maxAgeDays = Math.max(
    1,
    Math.trunc(options.maxAgeDays ?? RETRIEVAL_TELEMETRY_DEFAULT_MAX_AGE_DAYS)
  );
  const maxEvents = Math.max(
    10,
    Math.trunc(options.maxEvents ?? RETRIEVAL_TELEMETRY_DEFAULT_MAX_EVENTS)
  );
  const maxBytes = Math.max(
    1_024,
    Math.trunc(options.maxBytes ?? RETRIEVAL_TELEMETRY_DEFAULT_MAX_BYTES)
  );
  if (!existsSync(file)) {
    return {
      exists: false,
      bytes: 0,
      totalLines: 0,
      validEvents: 0,
      invalidLines: 0,
      overMaxEvents: false,
      overMaxBytes: false,
      overMaxAge: false,
    };
  }
  const lines = rawTelemetryLines(project);
  const parsed = parseTelemetryLines(lines);
  const ordered = [...parsed.valid].sort((left, right) =>
    left.occurredAt.localeCompare(right.occurredAt)
  );
  let bytes = 0;
  try {
    bytes = statSync(file).size;
  } catch {
    bytes = 0;
  }
  const oldest = ordered[0]?.occurredAt;
  const newest = ordered[ordered.length - 1]?.occurredAt;
  const cutoff = now - maxAgeDays * 24 * 60 * 60 * 1_000;
  return {
    exists: true,
    bytes,
    totalLines: lines.length,
    validEvents: parsed.valid.length,
    invalidLines: parsed.invalid,
    ...(oldest ? { oldestEventAt: oldest } : {}),
    ...(newest ? { newestEventAt: newest } : {}),
    overMaxEvents: parsed.valid.length > maxEvents,
    overMaxBytes: bytes > maxBytes,
    overMaxAge: Boolean(oldest && Date.parse(oldest) < cutoff),
  };
}

/**
 * Phase 66 local maintenance.
 *
 * Telemetry is diagnostic/non-authoritative, so:
 *
 * - malformed records may be discarded;
 * - old records may be discarded;
 * - newest records are retained within count/byte bounds.
 */
export function maintainRetrievalTelemetry(
  project: Pick<ProjectManifest, 'rootPath'>,
  options: RetrievalTelemetryMaintenanceOptions = {}
): RetrievalTelemetryMaintenanceResult {
  const file = retrievalTelemetryPath(project);
  const before = inspectRetrievalTelemetryFile(project, options);
  if (!before.exists) {
    return {
      before,
      after: before,
      removedExpired: 0,
      removedMalformed: 0,
      removedOverflow: 0,
      changed: false,
    };
  }
  const now = options.now ?? Date.now();
  const maxAgeDays = Math.max(
    1,
    Math.trunc(options.maxAgeDays ?? RETRIEVAL_TELEMETRY_DEFAULT_MAX_AGE_DAYS)
  );
  const maxEvents = Math.max(
    10,
    Math.trunc(options.maxEvents ?? RETRIEVAL_TELEMETRY_DEFAULT_MAX_EVENTS)
  );
  const maxBytes = Math.max(
    1_024,
    Math.trunc(options.maxBytes ?? RETRIEVAL_TELEMETRY_DEFAULT_MAX_BYTES)
  );
  const lines = rawTelemetryLines(project);
  const parsed = parseTelemetryLines(lines);
  const cutoff = now - maxAgeDays * 24 * 60 * 60 * 1_000;
  const recent = parsed.valid
    .filter((event) => Date.parse(event.occurredAt) >= cutoff)
    .sort(
      (left, right) =>
        left.occurredAt.localeCompare(right.occurredAt) || left.eventId.localeCompare(right.eventId)
    );
  const removedExpired = parsed.valid.length - recent.length;
  const kept: RetrievalTelemetryEvent[] = [];
  let bytes = 0;
  for (let index = recent.length - 1; index >= 0; index -= 1) {
    if (kept.length >= maxEvents) {
      break;
    }
    const event = recent[index]!;
    const line = `${JSON.stringify(event)}\n`;
    const lineBytes = Buffer.byteLength(line, 'utf8');
    if (kept.length > 0 && bytes + lineBytes > maxBytes) {
      break;
    }
    kept.unshift(event);
    bytes += lineBytes;
  }
  const removedOverflow = recent.length - kept.length;
  const temporary = `${file}.phase66.tmp`;
  createDirectory(file);
  writeFileSync(
    temporary,
    kept.length ? `${kept.map((event) => JSON.stringify(event)).join('\n')}\n` : '',
    {
      encoding: 'utf8',
      mode: 0o600,
    }
  );
  renameSync(temporary, file);
  try {
    chmodSync(file, 0o600);
  } catch {
    // best effort
  }
  const after = inspectRetrievalTelemetryFile(project, options);
  return {
    before,
    after,
    removedExpired,
    removedMalformed: parsed.invalid,
    removedOverflow,
    changed: removedExpired > 0 || parsed.invalid > 0 || removedOverflow > 0,
  };
}
