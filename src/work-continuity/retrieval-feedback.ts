import {
  appendFileSync,
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

import type { ProjectManifest } from '../core/types.js';
import { planCompositeRetrieval, type CompositeRetrievalPlan } from './composite-retrieval.js';
import {
  evaluateRetrievalPlanner,
  evaluateRetrievalQualityGate,
  PHASE62_PRODUCTION_THRESHOLDS,
} from './retrieval-quality.js';
import {
  RETRIEVAL_QUALITY_PHASE62_BENCHMARK,
  RETRIEVAL_QUALITY_PHASE62_BENCHMARK_VERSION,
} from './retrieval-quality-adversarial.js';
import {
  routeForRetrievalIntent,
  type IntentAwareRetrievalIntent,
  type IntentAwareRetrievalRoute,
  type IntentAwareRetrievalSource,
} from './intent-aware-retrieval.js';

export const RETRIEVAL_FEEDBACK_SCHEMA_VERSION = 1;
export const RETRIEVAL_ADAPTIVE_OVERRIDE_SCHEMA_VERSION = 1;
export const RETRIEVAL_ADAPTIVE_MIN_SUPPORT = 3;
export const RETRIEVAL_ADAPTIVE_MIN_CONFIDENCE = 0.8;
export const RETRIEVAL_ADAPTIVE_RECERTIFY_DAYS = 30;
export const RETRIEVAL_ADAPTIVE_MAX_AGE_DAYS = 90;
export const RETRIEVAL_FEEDBACK_RETENTION_DAYS = 90;

export type RetrievalFeedbackSurface = 'cli' | 'mcp';

export interface RetrievalFeedbackEvent {
  version: 1;
  eventId: string;
  occurredAt: string;
  surface: RetrievalFeedbackSurface;
  routeSignature: string;
  predictedIntent: IntentAwareRetrievalIntent;
  expectedIntent: IntentAwareRetrievalIntent;
  predictedSource: IntentAwareRetrievalSource;
  expectedSource: IntentAwareRetrievalSource;
  reasons: string[];
}

export interface AdaptiveRetrievalRule {
  ruleId: string;
  routeSignature: string;
  fromIntent: IntentAwareRetrievalIntent;
  toIntent: IntentAwareRetrievalIntent;
  fromSource: IntentAwareRetrievalSource;
  toSource: IntentAwareRetrievalSource;
  support: number;
  totalFeedback: number;
  confidence: number;
  activatedAt: string;
  /**
   * Newest explicit correction supporting this rule.
   *
   * Phase 66 uses this for rule decay.
   */
  lastConfirmedAt?: string;
  benchmarkVersion: string;
}

export interface AdaptiveRetrievalOverrides {
  version: 1;
  updatedAt: string;
  benchmarkVersion: string;
  rules: AdaptiveRetrievalRule[];
}

export interface AdaptiveRetrievalRefreshResult {
  status: 'promoted' | 'updated' | 'unchanged' | 'rejected';
  candidateRules: number;
  activeRules: number;
  benchmarkPassed: boolean;
  benchmarkCases: number;
  failures: string[];
}

export interface RetrievalFeedbackResult {
  recorded: boolean;
  status: 'recorded' | 'already_correct' | 'composite_not_supported';
  routeSignature?: string;
  predictedIntent?: IntentAwareRetrievalIntent;
  expectedIntent?: IntentAwareRetrievalIntent;
  refresh?: AdaptiveRetrievalRefreshResult;
}

export interface RetrievalFeedbackSummary {
  feedbackEvents: number;
  activeRules: number;
  signatures: number;
  benchmarkVersion: string;
  rules: AdaptiveRetrievalRule[];
}

const IGNORED_SIGNATURE_REASONS = new Set([
  'composite-plan',
  'adaptive-feedback',
  'explicit-intent',
]);

function rounded(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function safeReason(value: string): string | undefined {
  const normalized = value.trim().toLocaleLowerCase();
  if (!normalized || normalized.length > 80) {
    return undefined;
  }
  if (!/^[a-z0-9:_-]+$/u.test(normalized)) {
    return undefined;
  }
  return normalized;
}

function canonicalReasons(route: IntentAwareRetrievalRoute): string[] {
  return [
    ...new Set(
      route.reasons
        .map(safeReason)
        .filter((value): value is string => Boolean(value))
        .filter(
          (reason) => !IGNORED_SIGNATURE_REASONS.has(reason) && !reason.startsWith('adaptive-rule:')
        )
    ),
  ].sort();
}

/**
 * Structural route signature only.
 *
 * It contains classifier machine-reason codes.
 *
 * It contains NO question text and NO hash/fingerprint
 * derived from the question.
 */
export function retrievalRouteSignature(route: IntentAwareRetrievalRoute): string {
  const reasons = canonicalReasons(route);
  return [route.intent, reasons.length > 0 ? reasons.join('+') : 'no-reason'].join('|');
}

function feedbackPath(project: Pick<ProjectManifest, 'rootPath'>): string {
  return join(project.rootPath, '.toolnet', 'retrieval', 'feedback.jsonl');
}

export function adaptiveOverridesPath(project: Pick<ProjectManifest, 'rootPath'>): string {
  return join(project.rootPath, '.toolnet', 'retrieval', 'overrides.json');
}

function ensureDirectory(file: string): void {
  const directory = dirname(file);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  try {
    chmodSync(directory, 0o700);
  } catch {
    // best effort
  }
}

function safeJsonWrite(file: string, value: unknown): void {
  ensureDirectory(file);
  const temporary = `${file}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
  renameSync(temporary, file);
  try {
    chmodSync(file, 0o600);
  } catch {
    // best effort
  }
}

function appendFeedback(
  project: Pick<ProjectManifest, 'rootPath'>,
  event: RetrievalFeedbackEvent
): void {
  const file = feedbackPath(project);
  ensureDirectory(file);
  appendFileSync(file, `${JSON.stringify(event)}\n`, { encoding: 'utf8', mode: 0o600 });
  try {
    chmodSync(file, 0o600);
  } catch {
    // best effort
  }
}

function validFeedback(value: unknown): value is RetrievalFeedbackEvent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const item = value as Record<string, unknown>;
  return (
    item.version === 1 &&
    typeof item.eventId === 'string' &&
    typeof item.occurredAt === 'string' &&
    typeof item.routeSignature === 'string' &&
    typeof item.predictedIntent === 'string' &&
    typeof item.expectedIntent === 'string' &&
    typeof item.predictedSource === 'string' &&
    typeof item.expectedSource === 'string' &&
    Array.isArray(item.reasons)
  );
}

export function readRetrievalFeedback(
  project: Pick<ProjectManifest, 'rootPath'>
): RetrievalFeedbackEvent[] {
  const file = feedbackPath(project);
  if (!existsSync(file)) {
    return [];
  }
  let text = '';
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return [];
  }
  const output: RetrievalFeedbackEvent[] = [];
  for (const line of text.split(/\r?\n/u)) {
    if (!line.trim()) {
      continue;
    }
    try {
      const parsed = JSON.parse(line);
      if (validFeedback(parsed)) {
        output.push(parsed);
      }
    } catch {
      // feedback is advisory
    }
  }
  return output;
}

function validOverrides(value: unknown): value is AdaptiveRetrievalOverrides {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const item = value as Record<string, unknown>;
  return (
    item.version === 1 &&
    typeof item.updatedAt === 'string' &&
    typeof item.benchmarkVersion === 'string' &&
    Array.isArray(item.rules)
  );
}

export function loadAdaptiveRetrievalOverrides(
  project: Pick<ProjectManifest, 'rootPath'>
): AdaptiveRetrievalOverrides {
  const file = adaptiveOverridesPath(project);
  if (!existsSync(file)) {
    return {
      version: RETRIEVAL_ADAPTIVE_OVERRIDE_SCHEMA_VERSION,
      updatedAt: '1970-01-01T00:00:00.000Z',
      benchmarkVersion: RETRIEVAL_QUALITY_PHASE62_BENCHMARK_VERSION,
      rules: [],
    };
  }
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    if (validOverrides(parsed)) {
      return parsed;
    }
  } catch {
    // fail closed to no overrides
  }
  return {
    version: RETRIEVAL_ADAPTIVE_OVERRIDE_SCHEMA_VERSION,
    updatedAt: '1970-01-01T00:00:00.000Z',
    benchmarkVersion: RETRIEVAL_QUALITY_PHASE62_BENCHMARK_VERSION,
    rules: [],
  };
}

function ruleId(signature: string, expected: IntentAwareRetrievalIntent): string {
  const safe = signature
    .replace(/[^a-z0-9|+:_-]+/giu, '-')
    .replace(/\|/gu, '--')
    .replace(/\+/gu, '-')
    .slice(0, 120);
  return ['adaptive', safe, 'to', expected].join('-');
}

function buildCandidates(
  events: RetrievalFeedbackEvent[],
  existing: AdaptiveRetrievalOverrides
): AdaptiveRetrievalRule[] {
  const bySignature = new Map<string, RetrievalFeedbackEvent[]>();
  const feedbackCutoff = Date.now() - RETRIEVAL_FEEDBACK_RETENTION_DAYS * 24 * 60 * 60 * 1_000;
  for (const event of events) {
    if (Date.parse(event.occurredAt) < feedbackCutoff) {
      continue;
    }
    const list = bySignature.get(event.routeSignature) ?? [];
    list.push(event);
    bySignature.set(event.routeSignature, list);
  }
  const output: AdaptiveRetrievalRule[] = [];
  for (const [signature, group] of bySignature) {
    if (group.length < RETRIEVAL_ADAPTIVE_MIN_SUPPORT) {
      continue;
    }
    const counts = new Map<IntentAwareRetrievalIntent, number>();
    for (const event of group) {
      counts.set(event.expectedIntent, (counts.get(event.expectedIntent) ?? 0) + 1);
    }
    const ranked = [...counts.entries()].sort(
      ([leftIntent, left], [rightIntent, right]) =>
        right - left || leftIntent.localeCompare(rightIntent)
    );
    const winner = ranked[0];
    if (!winner) {
      continue;
    }
    const [expectedIntent, support] = winner;
    const confidence = support / group.length;
    if (
      support < RETRIEVAL_ADAPTIVE_MIN_SUPPORT ||
      confidence < RETRIEVAL_ADAPTIVE_MIN_CONFIDENCE
    ) {
      continue;
    }
    const first = group[0]!;
    if (first.predictedIntent === expectedIntent) {
      continue;
    }
    const expectedRoute = routeForRetrievalIntent(expectedIntent);
    const id = ruleId(signature, expectedIntent);
    const previous = existing.rules.find((rule) => rule.ruleId === id);
    const supporting = group
      .filter((event) => event.expectedIntent === expectedIntent)
      .map((event) => event.occurredAt)
      .sort();
    const lastConfirmedAt =
      supporting[supporting.length - 1] ??
      previous?.lastConfirmedAt ??
      previous?.activatedAt ??
      new Date().toISOString();
    output.push({
      ruleId: id,
      routeSignature: signature,
      fromIntent: first.predictedIntent,
      toIntent: expectedIntent,
      fromSource: first.predictedSource,
      toSource: expectedRoute.primarySource,
      support,
      totalFeedback: group.length,
      confidence: rounded(confidence),
      activatedAt: previous?.activatedAt ?? new Date().toISOString(),
      lastConfirmedAt,
      benchmarkVersion: RETRIEVAL_QUALITY_PHASE62_BENCHMARK_VERSION,
    });
  }
  return output.sort((left, right) => left.routeSignature.localeCompare(right.routeSignature));
}

function adaptiveRuleReferenceTime(rule: AdaptiveRetrievalRule): number {
  const value = rule.lastConfirmedAt ?? rule.activatedAt;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function adaptiveRuleExpired(rule: AdaptiveRetrievalRule, now = Date.now()): boolean {
  return (
    now - adaptiveRuleReferenceTime(rule) > RETRIEVAL_ADAPTIVE_MAX_AGE_DAYS * 24 * 60 * 60 * 1_000
  );
}

export function applyAdaptiveRetrievalRoute(
  route: IntentAwareRetrievalRoute,
  overrides: AdaptiveRetrievalOverrides
): IntentAwareRetrievalRoute {
  const signature = retrievalRouteSignature(route);
  const rule = overrides.rules.find(
    (candidate) =>
      candidate.routeSignature === signature &&
      candidate.fromIntent === route.intent &&
      !adaptiveRuleExpired(candidate)
  );
  if (!rule) {
    return route;
  }
  return routeForRetrievalIntent(rule.toIntent, {
    confidence: Math.max(route.confidence, rule.confidence),
    reasons: [...route.reasons, 'adaptive-feedback', `adaptive-rule:${rule.ruleId}`],
  });
}

export function planAdaptiveRetrieval(
  project: Pick<ProjectManifest, 'rootPath'>,
  question: string,
  options: {
    maxSources?: number;
  } = {}
): CompositeRetrievalPlan {
  const overrides = loadAdaptiveRetrievalOverrides(project);
  return planCompositeRetrieval(question, {
    maxSources: options.maxSources,
    routeOverride: (route) => applyAdaptiveRetrievalRoute(route, overrides),
  });
}

function sameRuleSet(left: AdaptiveRetrievalRule[], right: AdaptiveRetrievalRule[]): boolean {
  const normalize = (rules: AdaptiveRetrievalRule[]) =>
    rules.map((rule) => ({ ...rule, activatedAt: 'stable' }));
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
}

export function refreshAdaptiveRetrievalOverrides(
  project: Pick<ProjectManifest, 'rootPath'>
): AdaptiveRetrievalRefreshResult {
  const existing = loadAdaptiveRetrievalOverrides(project);
  const events = readRetrievalFeedback(project);
  const candidates = buildCandidates(events, existing);
  const candidateConfig: AdaptiveRetrievalOverrides = {
    version: RETRIEVAL_ADAPTIVE_OVERRIDE_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    benchmarkVersion: RETRIEVAL_QUALITY_PHASE62_BENCHMARK_VERSION,
    rules: candidates,
  };
  const report = evaluateRetrievalPlanner(
    RETRIEVAL_QUALITY_PHASE62_BENCHMARK,
    (question, options) =>
      planCompositeRetrieval(question, {
        maxSources: options?.maxSources,
        routeOverride: (route) => applyAdaptiveRetrievalRoute(route, candidateConfig),
      }),
    {
      benchmarkVersion: `${RETRIEVAL_QUALITY_PHASE62_BENCHMARK_VERSION}+adaptive`,
    }
  );
  const gate = evaluateRetrievalQualityGate(report, PHASE62_PRODUCTION_THRESHOLDS);
  if (!gate.passed) {
    return {
      status: 'rejected',
      candidateRules: candidates.length,
      activeRules: existing.rules.length,
      benchmarkPassed: false,
      benchmarkCases: report.totalCases,
      failures: [
        ...gate.failures,
        ...report.cases
          .filter((item) => !item.passed)
          .slice(0, 10)
          .map(
            (item) =>
              `${item.id}: intents=${item.predictedIntents.join(',')} sources=${item.predictedSources.join(',')}`
          ),
      ],
    };
  }
  safeJsonWrite(adaptiveOverridesPath(project), candidateConfig);
  const unchanged = sameRuleSet(existing.rules, candidates);
  return {
    status: unchanged
      ? 'unchanged'
      : candidates.length > existing.rules.length
        ? 'promoted'
        : 'updated',
    candidateRules: candidates.length,
    activeRules: candidates.length,
    benchmarkPassed: true,
    benchmarkCases: report.totalCases,
    failures: [],
  };
}

export function recordRetrievalFeedback(
  project: Pick<ProjectManifest, 'rootPath'>,
  baselinePlan: CompositeRetrievalPlan,
  expectedIntent: IntentAwareRetrievalIntent,
  surface: RetrievalFeedbackSurface
): RetrievalFeedbackResult {
  if (baselinePlan.mode !== 'single') {
    return {
      recorded: false,
      status: 'composite_not_supported',
    };
  }
  const route = baselinePlan.primaryRoute;
  if (route.intent === expectedIntent) {
    return {
      recorded: false,
      status: 'already_correct',
      routeSignature: retrievalRouteSignature(route),
      predictedIntent: route.intent,
      expectedIntent,
    };
  }
  const expectedRoute = routeForRetrievalIntent(expectedIntent);
  const event: RetrievalFeedbackEvent = {
    version: RETRIEVAL_FEEDBACK_SCHEMA_VERSION,
    eventId: randomUUID(),
    occurredAt: new Date().toISOString(),
    surface,
    routeSignature: retrievalRouteSignature(route),
    predictedIntent: route.intent,
    expectedIntent,
    predictedSource: route.primarySource,
    expectedSource: expectedRoute.primarySource,
    reasons: canonicalReasons(route),
  };
  appendFeedback(project, event);
  return {
    recorded: true,
    status: 'recorded',
    routeSignature: event.routeSignature,
    predictedIntent: event.predictedIntent,
    expectedIntent: event.expectedIntent,
    refresh: refreshAdaptiveRetrievalOverrides(project),
  };
}

export function summarizeRetrievalFeedback(
  project: Pick<ProjectManifest, 'rootPath'>
): RetrievalFeedbackSummary {
  const feedback = readRetrievalFeedback(project);
  const overrides = loadAdaptiveRetrievalOverrides(project);
  return {
    feedbackEvents: feedback.length,
    activeRules: overrides.rules.length,
    signatures: new Set(feedback.map((item) => item.routeSignature)).size,
    benchmarkVersion: overrides.benchmarkVersion,
    rules: overrides.rules,
  };
}

/**
 * Phase 64 privacy contract.
 */
export const RETRIEVAL_FEEDBACK_FORBIDDEN_KEYS = [
  'question',
  'answer',
  'query',
  'queryHash',
  'prompt',
  'filePath',
  'taskId',
  'memoryContent',
  'sourceRef',
] as const;

// ============================================================================
// Phase 66 — adaptive rule lifecycle
// ============================================================================
export interface AdaptiveRetrievalLifecycleHealth {
  totalRules: number;
  effectiveRules: number;
  expiredRules: number;
  recertifyDue: number;
  benchmarkPassed: boolean;
  benchmarkCases: number;
  feedbackEvents: number;
  oldFeedbackEvents: number;
}

export interface AdaptiveRetrievalMaintenanceResult {
  before: AdaptiveRetrievalLifecycleHealth;
  after: AdaptiveRetrievalLifecycleHealth;
  expiredRuleIds: string[];
  rolledBackRuleIds: string[];
  removedFeedbackEvents: number;
  benchmarkPassed: boolean;
  changed: boolean;
}

function ruleAgeDays(rule: AdaptiveRetrievalRule, now: number): number {
  return Math.max(0, (now - adaptiveRuleReferenceTime(rule)) / (24 * 60 * 60 * 1_000));
}

function benchmarkAdaptiveRules(rules: AdaptiveRetrievalRule[]) {
  const config: AdaptiveRetrievalOverrides = {
    version: RETRIEVAL_ADAPTIVE_OVERRIDE_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    benchmarkVersion: RETRIEVAL_QUALITY_PHASE62_BENCHMARK_VERSION,
    rules,
  };
  const report = evaluateRetrievalPlanner(
    RETRIEVAL_QUALITY_PHASE62_BENCHMARK,
    (question, options) =>
      planCompositeRetrieval(question, {
        maxSources: options?.maxSources,
        routeOverride: (route) => applyAdaptiveRetrievalRoute(route, config),
      }),
    {
      benchmarkVersion: `${RETRIEVAL_QUALITY_PHASE62_BENCHMARK_VERSION}+phase66-lifecycle`,
    }
  );
  const gate = evaluateRetrievalQualityGate(report, PHASE62_PRODUCTION_THRESHOLDS);
  return { report, gate };
}

export function inspectAdaptiveRetrievalLifecycle(
  project: Pick<ProjectManifest, 'rootPath'>,
  now = Date.now()
): AdaptiveRetrievalLifecycleHealth {
  const overrides = loadAdaptiveRetrievalOverrides(project);
  const feedback = readRetrievalFeedback(project);
  const feedbackCutoff = now - RETRIEVAL_FEEDBACK_RETENTION_DAYS * 24 * 60 * 60 * 1_000;
  const effective = overrides.rules.filter((rule) => !adaptiveRuleExpired(rule, now));
  const certification = benchmarkAdaptiveRules(effective);
  return {
    totalRules: overrides.rules.length,
    effectiveRules: effective.length,
    expiredRules: overrides.rules.length - effective.length,
    recertifyDue: effective.filter(
      (rule) =>
        ruleAgeDays(rule, now) >= RETRIEVAL_ADAPTIVE_RECERTIFY_DAYS ||
        rule.benchmarkVersion !== RETRIEVAL_QUALITY_PHASE62_BENCHMARK_VERSION
    ).length,
    benchmarkPassed: certification.gate.passed,
    benchmarkCases: certification.report.totalCases,
    feedbackEvents: feedback.length,
    oldFeedbackEvents: feedback.filter((event) => Date.parse(event.occurredAt) < feedbackCutoff)
      .length,
  };
}

function writeFeedbackEvents(
  project: Pick<ProjectManifest, 'rootPath'>,
  events: RetrievalFeedbackEvent[]
): void {
  const file = feedbackPath(project);
  ensureDirectory(file);
  const temporary = `${file}.phase66.tmp`;
  writeFileSync(
    temporary,
    events.length ? `${events.map((event) => JSON.stringify(event)).join('\n')}\n` : '',
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
}

/**
 * Re-certifies currently effective local overrides.
 *
 * Canonical Task/Memory state is never touched.
 */
export function maintainAdaptiveRetrievalOverrides(
  project: Pick<ProjectManifest, 'rootPath'>,
  now = Date.now()
): AdaptiveRetrievalMaintenanceResult {
  const before = inspectAdaptiveRetrievalLifecycle(project, now);
  const existing = loadAdaptiveRetrievalOverrides(project);
  const feedback = readRetrievalFeedback(project);
  const feedbackCutoff = now - RETRIEVAL_FEEDBACK_RETENTION_DAYS * 24 * 60 * 60 * 1_000;
  const recentFeedback = feedback.filter((event) => Date.parse(event.occurredAt) >= feedbackCutoff);
  const removedFeedbackEvents = feedback.length - recentFeedback.length;
  if (removedFeedbackEvents > 0) {
    writeFeedbackEvents(project, recentFeedback);
  }
  const expired = existing.rules
    .filter((rule) => adaptiveRuleExpired(rule, now))
    .map((rule) => rule.ruleId);
  let rules = existing.rules
    .filter((rule) => !adaptiveRuleExpired(rule, now))
    .sort((left, right) => left.ruleId.localeCompare(right.ruleId));
  const rolledBack: string[] = [];
  let certification = benchmarkAdaptiveRules(rules);
  /*
   * If software/router drift makes the existing adaptive set
   * fail the 65-case production benchmark, remove only enough
   * rules to restore the production invariant.
   */
  while (!certification.gate.passed && rules.length > 0) {
    let repaired = false;
    for (const rule of rules) {
      const trial = rules.filter((candidate) => candidate.ruleId !== rule.ruleId);
      const trialCertification = benchmarkAdaptiveRules(trial);
      if (trialCertification.gate.passed) {
        rolledBack.push(rule.ruleId);
        rules = trial;
        certification = trialCertification;
        repaired = true;
        break;
      }
    }
    if (repaired) {
      continue;
    }
    /*
     * Multiple interacting adaptive rules may be responsible.
     *
     * Adaptive routing is advisory, so fail closed to the
     * deterministic Phase 59/60 baseline.
     */
    rolledBack.push(...rules.map((rule) => rule.ruleId));
    rules = [];
    certification = benchmarkAdaptiveRules([]);
    break;
  }
  const updated: AdaptiveRetrievalOverrides = {
    version: RETRIEVAL_ADAPTIVE_OVERRIDE_SCHEMA_VERSION,
    updatedAt: new Date(now).toISOString(),
    benchmarkVersion: RETRIEVAL_QUALITY_PHASE62_BENCHMARK_VERSION,
    rules,
  };
  safeJsonWrite(adaptiveOverridesPath(project), updated);
  const after = inspectAdaptiveRetrievalLifecycle(project, now);
  return {
    before,
    after,
    expiredRuleIds: expired,
    rolledBackRuleIds: rolledBack,
    removedFeedbackEvents,
    benchmarkPassed: certification.gate.passed,
    changed: expired.length > 0 || rolledBack.length > 0 || removedFeedbackEvents > 0,
  };
}
