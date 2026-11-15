/**
 * ToolNet v0.7 context token benchmark.
 *
 * Compares the measured size of the v0.6.2-style startup context with the tiny
 * and standard resume packets for the same project state. It measures text that
 * actually exists (the caller supplies the legacy baseline), never estimates a
 * reduction from a formula.
 *
 * Token counts are estimates from the repository's existing heuristic unless a
 * real tokenizer is injected. The benchmark reports what it measured and does
 * not claim model-exact accounting.
 */

import type { AuthoritySnapshot } from './authority-state.js';
import { buildProjectBrain } from './project-brain.js';
import { toResumeSource } from './resume.js';
import { compileResumePacket } from '../work-continuity/resume-packet-v07.js';
import { estimateTokens } from '../work-continuity/token-budget.js';

export interface ResumeTokenBenchmarkInput {
  snapshot: AuthoritySnapshot;
  /** Full legacy (v0.6.2) startup context, e.g. stable work state + rules. */
  baselineText: string;
  currentCodeRevision?: string;
  countTokens?: (text: string) => number;
}

export interface ResumeTokenBenchmarkResult {
  baselineTokens: number;
  tinyTokens: number;
  standardTokens: number;
  tinyReductionPercent: number;
  standardReductionPercent: number;
  tinyTargetMet: boolean;
  standardTargetMet: boolean;
  missingMandatoryFacts: string[];
  warnings: string[];
}

const TINY_TARGET = 400;
const STANDARD_TARGET = 1_500;

function reduction(baseline: number, next: number): number {
  if (baseline <= 0) {
    return 0;
  }

  return Math.round(((baseline - next) / baseline) * 1_000) / 10;
}

export function benchmarkResumeTokens(
  input: ResumeTokenBenchmarkInput
): ResumeTokenBenchmarkResult {
  const countTokens = input.countTokens ?? estimateTokens;

  const brain = buildProjectBrain({
    snapshot: input.snapshot,
    ...(input.currentCodeRevision === undefined
      ? {}
      : { currentCodeRevision: input.currentCodeRevision }),
  });

  const source = toResumeSource(input.snapshot, brain);

  const tiny = compileResumePacket(source, { mode: 'tiny', countTokens });
  const standard = compileResumePacket(source, { mode: 'standard', countTokens });

  const mandatoryFacts = [
    ...brain.mandatoryRules.map((rule) => rule.text),
    ...brain.criticalFlows.map((flow) => flow.description),
    source.activeTask.title,
    ...source.taskBoard.completed,
  ];

  const missingMandatoryFacts = mandatoryFacts.filter((fact) => !tiny.text.includes(fact));

  const baselineTokens = countTokens(input.baselineText);

  return {
    baselineTokens,
    tinyTokens: tiny.estimatedTokens,
    standardTokens: standard.estimatedTokens,
    tinyReductionPercent: reduction(baselineTokens, tiny.estimatedTokens),
    standardReductionPercent: reduction(baselineTokens, standard.estimatedTokens),
    tinyTargetMet: tiny.estimatedTokens <= TINY_TARGET && missingMandatoryFacts.length === 0,
    standardTargetMet:
      standard.estimatedTokens <= STANDARD_TARGET && missingMandatoryFacts.length === 0,
    missingMandatoryFacts,
    warnings: [...brain.warnings, ...tiny.warnings],
  };
}
