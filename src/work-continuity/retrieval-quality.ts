import type { CompositeRetrievalPlan, CompositeRetrievalResult } from './composite-retrieval.js';
import { planCompositeRetrieval } from './composite-retrieval.js';
import type {
  IntentAwareRetrievalIntent,
  IntentAwareRetrievalSource,
} from './intent-aware-retrieval.js';
import { estimateTokens } from './token-budget.js';
import {
  RETRIEVAL_QUALITY_BENCHMARK,
  RETRIEVAL_QUALITY_BENCHMARK_VERSION,
  type RetrievalQualityBenchmarkCase,
} from './retrieval-quality-benchmark.js';

export interface RetrievalQualityPRF {
  precision: number;
  recall: number;
  f1: number;
  truePositive: number;
  falsePositive: number;
  falseNegative: number;
}

export interface RetrievalQualityCaseResult {
  id: string;
  language: string;
  question: string;
  passed: boolean;
  expectedMode: string;
  predictedMode: string;
  expectedIntents: IntentAwareRetrievalIntent[];
  predictedIntents: IntentAwareRetrievalIntent[];
  expectedSources: IntentAwareRetrievalSource[];
  predictedSources: IntentAwareRetrievalSource[];
  expectedOmittedIntents: IntentAwareRetrievalIntent[];
  predictedOmittedIntents: IntentAwareRetrievalIntent[];
  modeCorrect: boolean;
  intentsExact: boolean;
  sourcesExact: boolean;
  omittedExact: boolean;
  unexpectedSources: IntentAwareRetrievalSource[];
  missingSources: IntentAwareRetrievalSource[];
  missingIntents: IntentAwareRetrievalIntent[];
  unexpectedIntents: IntentAwareRetrievalIntent[];
  sourceBudgetViolation: boolean;
}

export interface RetrievalQualityReport {
  benchmarkVersion: string;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  exactCaseAccuracy: number;
  modeAccuracy: number;
  intentExactAccuracy: number;
  sourceExactAccuracy: number;
  omittedIntentAccuracy: number;
  intentMicro: RetrievalQualityPRF;
  sourceMicro: RetrievalQualityPRF;
  unnecessarySourceReads: number;
  missingSourceReads: number;
  sourceBudgetViolations: number;
  averagePlannedSources: number;
  maxPlannedSources: number;
  cases: RetrievalQualityCaseResult[];
}

export interface RetrievalQualityThresholds {
  exactCaseAccuracy: number;
  modeAccuracy: number;
  intentF1: number;
  sourceF1: number;
  sourceExactAccuracy: number;
  maxUnnecessarySourceReads: number;
  maxMissingSourceReads: number;
  maxSourceBudgetViolations: number;
}

export interface RetrievalQualityGate {
  passed: boolean;
  failures: string[];
  thresholds: RetrievalQualityThresholds;
}

export interface RetrievalExecutionMetrics {
  mode: string;
  plannedSources: number;
  attemptedSources: number;
  successfulFragments: number;
  answerChars: number;
  estimatedTokens: number;
  provenanceFragments: number;
  provenanceCoverage: number;
  conflicts: number;
  sourceBudgetExceeded: boolean;
}

export type RetrievalPlanner = (
  question: string,
  options?: {
    maxSources?: number;
  }
) => CompositeRetrievalPlan;

export const PHASE61_DEFAULT_THRESHOLDS: RetrievalQualityThresholds = {
  exactCaseAccuracy: 0.95,
  modeAccuracy: 0.98,
  intentF1: 0.98,
  sourceF1: 0.99,
  sourceExactAccuracy: 0.98,
  maxUnnecessarySourceReads: 0,
  maxMissingSourceReads: 0,
  maxSourceBudgetViolations: 0,
};

export const PHASE61_STRICT_THRESHOLDS: RetrievalQualityThresholds = {
  exactCaseAccuracy: 0.98,
  modeAccuracy: 1,
  intentF1: 0.99,
  sourceF1: 1,
  sourceExactAccuracy: 1,
  maxUnnecessarySourceReads: 0,
  maxMissingSourceReads: 0,
  maxSourceBudgetViolations: 0,
};

export const PHASE62_PRODUCTION_THRESHOLDS: RetrievalQualityThresholds = {
  /*
   * Phase 62 benchmark is release-blocking.
   *
   * Every fixed benchmark case must remain correct.
   */
  exactCaseAccuracy: 1,
  modeAccuracy: 1,
  intentF1: 1,
  sourceF1: 1,
  sourceExactAccuracy: 1,
  maxUnnecessarySourceReads: 0,
  maxMissingSourceReads: 0,
  maxSourceBudgetViolations: 0,
};

export interface RetrievalQualityEvaluationOptions {
  benchmarkVersion?: string;
}

function uniqueSorted<T extends string>(values: T[]): T[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function sameSet<T extends string>(left: T[], right: T[]): boolean {
  const a = uniqueSorted(left);
  const b = uniqueSorted(right);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function difference<T extends string>(left: T[], right: T[]): T[] {
  const rightSet = new Set(right);
  return uniqueSorted(left.filter((value) => !rightSet.has(value)));
}

function safeRatio(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 1;
  }
  return numerator / denominator;
}

function prf(
  truePositive: number,
  falsePositive: number,
  falseNegative: number
): RetrievalQualityPRF {
  const precision = safeRatio(truePositive, truePositive + falsePositive);
  const recall = safeRatio(truePositive, truePositive + falseNegative);
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  return {
    precision,
    recall,
    f1,
    truePositive,
    falsePositive,
    falseNegative,
  };
}

function countsForSets<T extends string>(
  expected: T[],
  predicted: T[]
): {
  truePositive: number;
  falsePositive: number;
  falseNegative: number;
} {
  const expectedSet = new Set(expected);
  const predictedSet = new Set(predicted);
  let truePositive = 0;
  for (const value of predictedSet) {
    if (expectedSet.has(value)) {
      truePositive += 1;
    }
  }
  return {
    truePositive,
    falsePositive: predictedSet.size - truePositive,
    falseNegative: expectedSet.size - truePositive,
  };
}

/**
 * Pure benchmark evaluation.
 *
 * A custom planner may be supplied by tests so the evaluation
 * harness itself can prove it detects regressions.
 */
export function evaluateRetrievalPlanner(
  cases: RetrievalQualityBenchmarkCase[] = RETRIEVAL_QUALITY_BENCHMARK,
  planner: RetrievalPlanner = planCompositeRetrieval,
  options: RetrievalQualityEvaluationOptions = {}
): RetrievalQualityReport {
  let modeCorrect = 0;
  let intentExact = 0;
  let sourceExact = 0;
  let omittedExact = 0;
  let intentTP = 0;
  let intentFP = 0;
  let intentFN = 0;
  let sourceTP = 0;
  let sourceFP = 0;
  let sourceFN = 0;
  let unnecessarySourceReads = 0;
  let missingSourceReads = 0;
  let sourceBudgetViolations = 0;
  let totalPlannedSources = 0;
  let maxPlannedSources = 0;
  const results: RetrievalQualityCaseResult[] = [];
  for (const benchmark of cases) {
    const plan = planner(benchmark.question, {
      maxSources: benchmark.maxSources,
    });
    const predictedIntents = uniqueSorted(plan.steps.map((step) => step.intent));
    const predictedSources = uniqueSorted(plan.sources);
    const expectedIntents = uniqueSorted(benchmark.expectedIntents);
    const expectedSources = uniqueSorted(benchmark.expectedSources);
    const expectedOmitted = uniqueSorted(benchmark.expectedOmittedIntents ?? []);
    const predictedOmitted = uniqueSorted(plan.omittedIntents);
    const modeIsCorrect = plan.mode === benchmark.expectedMode;
    const intentsAreExact = sameSet(expectedIntents, predictedIntents);
    const sourcesAreExact = sameSet(expectedSources, predictedSources);
    const omittedAreExact = sameSet(expectedOmitted, predictedOmitted);
    const unexpectedSources = difference(predictedSources, expectedSources);
    const missingSources = difference(expectedSources, predictedSources);
    const missingIntents = difference(expectedIntents, predictedIntents);
    const unexpectedIntents = difference(predictedIntents, expectedIntents);
    const budget = Math.min(benchmark.maxSources ?? 3, plan.maxSources);
    const budgetViolation = plan.sources.length > budget;
    if (modeIsCorrect) {
      modeCorrect += 1;
    }
    if (intentsAreExact) {
      intentExact += 1;
    }
    if (sourcesAreExact) {
      sourceExact += 1;
    }
    if (omittedAreExact) {
      omittedExact += 1;
    }
    const intentCounts = countsForSets(expectedIntents, predictedIntents);
    intentTP += intentCounts.truePositive;
    intentFP += intentCounts.falsePositive;
    intentFN += intentCounts.falseNegative;
    const sourceCounts = countsForSets(expectedSources, predictedSources);
    sourceTP += sourceCounts.truePositive;
    sourceFP += sourceCounts.falsePositive;
    sourceFN += sourceCounts.falseNegative;
    unnecessarySourceReads += unexpectedSources.length;
    missingSourceReads += missingSources.length;
    if (budgetViolation) {
      sourceBudgetViolations += 1;
    }
    totalPlannedSources += plan.sources.length;
    maxPlannedSources = Math.max(maxPlannedSources, plan.sources.length);
    const passed =
      modeIsCorrect && intentsAreExact && sourcesAreExact && omittedAreExact && !budgetViolation;
    results.push({
      id: benchmark.id,
      language: benchmark.language,
      question: benchmark.question,
      passed,
      expectedMode: benchmark.expectedMode,
      predictedMode: plan.mode,
      expectedIntents,
      predictedIntents,
      expectedSources,
      predictedSources,
      expectedOmittedIntents: expectedOmitted,
      predictedOmittedIntents: predictedOmitted,
      modeCorrect: modeIsCorrect,
      intentsExact: intentsAreExact,
      sourcesExact: sourcesAreExact,
      omittedExact: omittedAreExact,
      unexpectedSources,
      missingSources,
      missingIntents,
      unexpectedIntents,
      sourceBudgetViolation: budgetViolation,
    });
  }
  const total = cases.length;
  const passedCases = results.filter((result) => result.passed).length;
  return {
    benchmarkVersion: options.benchmarkVersion ?? RETRIEVAL_QUALITY_BENCHMARK_VERSION,
    totalCases: total,
    passedCases,
    failedCases: total - passedCases,
    exactCaseAccuracy: safeRatio(passedCases, total),
    modeAccuracy: safeRatio(modeCorrect, total),
    intentExactAccuracy: safeRatio(intentExact, total),
    sourceExactAccuracy: safeRatio(sourceExact, total),
    omittedIntentAccuracy: safeRatio(omittedExact, total),
    intentMicro: prf(intentTP, intentFP, intentFN),
    sourceMicro: prf(sourceTP, sourceFP, sourceFN),
    unnecessarySourceReads,
    missingSourceReads,
    sourceBudgetViolations,
    averagePlannedSources: safeRatio(totalPlannedSources, total),
    maxPlannedSources,
    cases: results,
  };
}

export function evaluateRetrievalQualityGate(
  report: RetrievalQualityReport,
  thresholds: RetrievalQualityThresholds = PHASE61_DEFAULT_THRESHOLDS
): RetrievalQualityGate {
  const failures: string[] = [];
  if (report.exactCaseAccuracy < thresholds.exactCaseAccuracy) {
    failures.push(
      `exactCaseAccuracy ${report.exactCaseAccuracy.toFixed(4)} < ${thresholds.exactCaseAccuracy.toFixed(4)}`
    );
  }
  if (report.modeAccuracy < thresholds.modeAccuracy) {
    failures.push(
      `modeAccuracy ${report.modeAccuracy.toFixed(4)} < ${thresholds.modeAccuracy.toFixed(4)}`
    );
  }
  if (report.intentMicro.f1 < thresholds.intentF1) {
    failures.push(
      `intentF1 ${report.intentMicro.f1.toFixed(4)} < ${thresholds.intentF1.toFixed(4)}`
    );
  }
  if (report.sourceMicro.f1 < thresholds.sourceF1) {
    failures.push(
      `sourceF1 ${report.sourceMicro.f1.toFixed(4)} < ${thresholds.sourceF1.toFixed(4)}`
    );
  }
  if (report.sourceExactAccuracy < thresholds.sourceExactAccuracy) {
    failures.push(
      `sourceExactAccuracy ${report.sourceExactAccuracy.toFixed(4)} < ${thresholds.sourceExactAccuracy.toFixed(4)}`
    );
  }
  if (report.unnecessarySourceReads > thresholds.maxUnnecessarySourceReads) {
    failures.push(
      `unnecessarySourceReads ${report.unnecessarySourceReads} > ${thresholds.maxUnnecessarySourceReads}`
    );
  }
  if (report.missingSourceReads > thresholds.maxMissingSourceReads) {
    failures.push(
      `missingSourceReads ${report.missingSourceReads} > ${thresholds.maxMissingSourceReads}`
    );
  }
  if (report.sourceBudgetViolations > thresholds.maxSourceBudgetViolations) {
    failures.push(
      `sourceBudgetViolations ${report.sourceBudgetViolations} > ${thresholds.maxSourceBudgetViolations}`
    );
  }
  return {
    passed: failures.length === 0,
    failures,
    thresholds,
  };
}

/**
 * Runtime cost measurement for an actual Phase 60 result.
 */
export function measureRetrievalExecution(
  result: CompositeRetrievalResult
): RetrievalExecutionMetrics {
  const provenanceFragments = result.fragments.filter((fragment) =>
    result.answer.includes(`source: ${fragment.source}`)
  ).length;
  return {
    mode: result.mode,
    plannedSources: result.plan.sources.length,
    attemptedSources: result.attemptedSources.length,
    successfulFragments: result.fragments.length,
    answerChars: result.answer.length,
    estimatedTokens: estimateTokens(result.answer),
    provenanceFragments,
    provenanceCoverage:
      result.fragments.length > 0 ? provenanceFragments / result.fragments.length : 1,
    conflicts: result.conflicts.length,
    sourceBudgetExceeded: result.attemptedSources.length > result.plan.maxSources,
  };
}

/**
 * Human-readable deterministic plan explanation.
 *
 * No source is read here.
 */
export function explainRetrievalPlan(plan: CompositeRetrievalPlan): string[] {
  const output = [
    `mode=${plan.mode}`,
    `source_budget=${plan.sources.length}/${plan.maxSources}`,
    `planned_sources=${plan.sources.join(',') || 'none'}`,
    `omitted_intents=${plan.omittedIntents.join(',') || 'none'}`,
  ];
  for (const step of plan.steps) {
    output.push(
      [
        `step[${step.index}]`,
        `intent=${step.intent}`,
        `source=${step.source}`,
        `authority=${step.authority}`,
        `confidence=${step.route.confidence.toFixed(2)}`,
        `reasons=${step.route.reasons.join(',') || 'none'}`,
        `question=${JSON.stringify(step.question)}`,
      ].join(' ')
    );
  }
  return output;
}

export function renderRetrievalQualityReport(report: RetrievalQualityReport): string {
  const percent = (value: number) => `${(value * 100).toFixed(2)}%`;
  const lines = [
    `Retrieval benchmark: ${report.benchmarkVersion}`,
    `Cases: ${report.passedCases}/${report.totalCases} passed`,
    `Exact case accuracy: ${percent(report.exactCaseAccuracy)}`,
    `Mode accuracy: ${percent(report.modeAccuracy)}`,
    `Intent exact accuracy: ${percent(report.intentExactAccuracy)}`,
    `Intent precision: ${percent(report.intentMicro.precision)}`,
    `Intent recall: ${percent(report.intentMicro.recall)}`,
    `Intent F1: ${percent(report.intentMicro.f1)}`,
    `Source exact accuracy: ${percent(report.sourceExactAccuracy)}`,
    `Source precision: ${percent(report.sourceMicro.precision)}`,
    `Source recall: ${percent(report.sourceMicro.recall)}`,
    `Source F1: ${percent(report.sourceMicro.f1)}`,
    `Average planned sources: ${report.averagePlannedSources.toFixed(2)}`,
    `Maximum planned sources: ${report.maxPlannedSources}`,
    `Unnecessary source reads: ${report.unnecessarySourceReads}`,
    `Missing source reads: ${report.missingSourceReads}`,
    `Source budget violations: ${report.sourceBudgetViolations}`,
  ];
  const failed = report.cases.filter((item) => !item.passed);
  if (failed.length > 0) {
    lines.push('', 'Failures:');
    for (const item of failed) {
      lines.push(
        `- ${item.id}: ${item.question}`,
        `  mode: expected=${item.expectedMode} actual=${item.predictedMode}`,
        `  intents: expected=${item.expectedIntents.join(',')} actual=${item.predictedIntents.join(',')}`,
        `  sources: expected=${item.expectedSources.join(',')} actual=${item.predictedSources.join(',')}`,
        `  omitted: expected=${item.expectedOmittedIntents.join(',')} actual=${item.predictedOmittedIntents.join(',')}`
      );
    }
  }
  return lines.join('\n');
}
