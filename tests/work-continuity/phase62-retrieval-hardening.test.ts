import { describe, expect, it } from 'vitest';

import { planCompositeRetrieval } from '../../src/work-continuity/composite-retrieval.js';
import {
  RETRIEVAL_QUALITY_ADVERSARIAL_BENCHMARK,
  RETRIEVAL_QUALITY_PHASE62_BENCHMARK,
  RETRIEVAL_QUALITY_PHASE62_BENCHMARK_VERSION,
} from '../../src/work-continuity/retrieval-quality-adversarial.js';
import {
  evaluateRetrievalPlanner,
  evaluateRetrievalQualityGate,
  PHASE62_PRODUCTION_THRESHOLDS,
} from '../../src/work-continuity/retrieval-quality.js';

describe('Phase 62 Retrieval Hardening', () => {
  it('extends Phase 61 to a fixed 65-case benchmark', () => {
    expect(RETRIEVAL_QUALITY_PHASE62_BENCHMARK_VERSION).toBe('phase62-v2');
    expect(RETRIEVAL_QUALITY_ADVERSARIAL_BENCHMARK).toHaveLength(36);
    expect(RETRIEVAL_QUALITY_PHASE62_BENCHMARK).toHaveLength(65);
    const ids = RETRIEVAL_QUALITY_PHASE62_BENCHMARK.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('contains paraphrase, negation, ambiguity, punctuation and budget cases', () => {
    const tags = new Set(RETRIEVAL_QUALITY_ADVERSARIAL_BENCHMARK.flatMap((item) => item.tags));
    expect(tags).toContain('paraphrase');
    expect(tags).toContain('negation');
    expect(tags).toContain('ambiguous');
    expect(tags).toContain('punctuation');
    expect(tags).toContain('budget');
    expect(tags).toContain('three-source');
  });

  it('passes every hardened production benchmark case', () => {
    const report = evaluateRetrievalPlanner(RETRIEVAL_QUALITY_PHASE62_BENCHMARK, undefined, {
      benchmarkVersion: RETRIEVAL_QUALITY_PHASE62_BENCHMARK_VERSION,
    });
    const gate = evaluateRetrievalQualityGate(report, PHASE62_PRODUCTION_THRESHOLDS);
    expect(report.benchmarkVersion).toBe('phase62-v2');
    expect(
      report.passedCases,
      JSON.stringify(
        report.cases.filter((item) => !item.passed),
        null,
        2
      )
    ).toBe(65);
    expect(report.exactCaseAccuracy).toBe(1);
    expect(report.intentMicro.f1).toBe(1);
    expect(report.sourceMicro.f1).toBe(1);
    expect(report.unnecessarySourceReads).toBe(0);
    expect(report.missingSourceReads).toBe(0);
    expect(report.sourceBudgetViolations).toBe(0);
    expect(gate.failures).toEqual([]);
    expect(gate.passed).toBe(true);
  });

  it('does not let explicitly rejected history steal current work', () => {
    const vi = planCompositeRetrieval('không cần lịch sử, task hiện tại là gì?');
    const en = planCompositeRetrieval("don't need history, what is the current task?");
    expect(vi.mode).toBe('single');
    expect(en.mode).toBe('single');
    expect(vi.steps.map((step) => step.intent)).toEqual(['current_work']);
    expect(en.steps.map((step) => step.intent)).toEqual(['current_work']);
  });

  it('keeps deployment execution-state questions above generic why intent', () => {
    const plan = planCompositeRetrieval('why is the deployment not verified yet?');
    expect(plan.mode).toBe('single');
    expect(plan.steps[0]?.intent).toBe('artifact');
    expect(plan.sources).toEqual(['task-artifacts']);
  });

  it('still enforces a three-source hard budget under four explicit intents', () => {
    const plan = planCompositeRetrieval(
      'task hiện tại là gì và deploy production verified chưa và TaskStore nằm file nào và lý do chọn append-only log là gì?'
    );
    expect(plan.sources).toEqual(['persistent-tasks', 'task-artifacts', 'code-intelligence']);
    expect(plan.sources.length).toBe(3);
    expect(plan.omittedIntents).toContain('decision');
  });
});
