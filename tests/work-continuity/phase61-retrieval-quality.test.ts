import { describe, expect, it } from 'vitest';

import {
  planCompositeRetrieval,
  retrieveCompositeAnswer,
} from '../../src/work-continuity/composite-retrieval.js';
import { routeForRetrievalIntent } from '../../src/work-continuity/intent-aware-retrieval.js';
import {
  PHASE61_DEFAULT_THRESHOLDS,
  PHASE61_STRICT_THRESHOLDS,
  evaluateRetrievalPlanner,
  evaluateRetrievalQualityGate,
  explainRetrievalPlan,
  measureRetrievalExecution,
  renderRetrievalQualityReport,
} from '../../src/work-continuity/retrieval-quality.js';
import {
  RETRIEVAL_QUALITY_BENCHMARK,
  RETRIEVAL_QUALITY_BENCHMARK_VERSION,
} from '../../src/work-continuity/retrieval-quality-benchmark.js';

describe('Phase 61 retrieval quality benchmark', () => {
  it('evaluates the full fixed benchmark and passes the default gate', () => {
    const report = evaluateRetrievalPlanner();
    const gate = evaluateRetrievalQualityGate(report);
    expect(report.benchmarkVersion).toBe(RETRIEVAL_QUALITY_BENCHMARK_VERSION);
    expect(report.totalCases).toBe(RETRIEVAL_QUALITY_BENCHMARK.length);
    expect(report.passedCases).toBe(report.totalCases);
    expect(report.exactCaseAccuracy).toBeGreaterThanOrEqual(
      PHASE61_DEFAULT_THRESHOLDS.exactCaseAccuracy
    );
    expect(report.modeAccuracy).toBeGreaterThanOrEqual(PHASE61_DEFAULT_THRESHOLDS.modeAccuracy);
    expect(report.intentMicro.f1).toBeGreaterThanOrEqual(PHASE61_DEFAULT_THRESHOLDS.intentF1);
    expect(report.sourceMicro.f1).toBeGreaterThanOrEqual(PHASE61_DEFAULT_THRESHOLDS.sourceF1);
    expect(report.unnecessarySourceReads).toBe(0);
    expect(report.missingSourceReads).toBe(0);
    expect(report.sourceBudgetViolations).toBe(0);
    expect(gate.passed).toBe(true);
    expect(gate.failures).toEqual([]);
  });

  it('passes the strict thresholds as well', () => {
    const report = evaluateRetrievalPlanner();
    const gate = evaluateRetrievalQualityGate(report, PHASE61_STRICT_THRESHOLDS);
    expect(gate.passed).toBe(true);
  });

  it('detects a routing regression through a broken custom planner', () => {
    // A planner that always routes to summary must fail the gate.
    const regressedPlanner = (question: string) => {
      const base = planCompositeRetrieval(question);
      const route = routeForRetrievalIntent('summary', {
        confidence: 0.9,
        reasons: ['regression-detector'],
      });
      return {
        ...base,
        mode: 'single' as const,
        steps: [
          {
            index: 0,
            intent: route.intent,
            question,
            route,
            source: route.primarySource,
            authority: 20,
            label: 'Summary',
          },
        ],
        sources: [route.primarySource],
        omittedIntents: [],
        primaryRoute: route,
      };
    };
    const report = evaluateRetrievalPlanner(RETRIEVAL_QUALITY_BENCHMARK, regressedPlanner);
    const gate = evaluateRetrievalQualityGate(report);
    expect(gate.passed).toBe(false);
    expect(gate.failures.length).toBeGreaterThan(0);
    expect(report.failedCases).toBeGreaterThan(0);
    expect(
      report.cases.some(
        (item) => item.missingIntents.length > 0 || item.unexpectedSources.length > 0
      )
    ).toBe(true);
  });

  it('reports per-case detail for failures', () => {
    const regressedPlanner = (question: string) => {
      const base = planCompositeRetrieval(question);
      const route = routeForRetrievalIntent('artifact', {
        confidence: 0.9,
        reasons: ['regression-detector'],
      });
      return {
        ...base,
        mode: 'single' as const,
        steps: [
          {
            index: 0,
            intent: route.intent,
            question,
            route,
            source: route.primarySource,
            authority: 450,
            label: 'Artifact Evidence',
          },
        ],
        sources: [route.primarySource],
        omittedIntents: [],
        primaryRoute: route,
      };
    };
    const report = evaluateRetrievalPlanner(
      RETRIEVAL_QUALITY_BENCHMARK.filter((item) => item.id === 'vi-rule'),
      regressedPlanner
    );
    expect(report.failedCases).toBe(1);
    const failed = report.cases[0]!;
    expect(failed.passed).toBe(false);
    expect(failed.expectedIntents).toEqual(['rules']);
    expect(failed.predictedIntents).toEqual(['artifact']);
    expect(failed.missingIntents).toEqual(['rules']);
    expect(failed.unexpectedIntents).toEqual(['artifact']);
  });
});

describe('Phase 61 explainability and execution cost', () => {
  it('explains every planned step without reading any source', () => {
    const plan = planCompositeRetrieval(
      'task hiện tại là gì, deploy production verified chưa và TaskStore class được định nghĩa ở đâu?'
    );
    expect(plan.mode).toBe('composite');
    const lines = explainRetrievalPlan(plan);
    expect(lines[0]).toContain('mode=composite');
    expect(lines.some((line) => line.startsWith('source_budget='))).toBe(true);
    expect(lines.some((line) => line.startsWith('planned_sources='))).toBe(true);
    const stepLines = lines.filter((line) => line.startsWith('step['));
    expect(stepLines).toHaveLength(plan.steps.length);
    for (const step of plan.steps) {
      const matching = stepLines.find((line) => line.includes(`step[${step.index}]`));
      expect(matching).toContain(`intent=${step.intent}`);
      expect(matching).toContain(`source=${step.source}`);
      expect(matching).toContain(`authority=${step.authority}`);
      expect(matching).toContain('confidence=');
      expect(matching).toContain('reasons=');
    }
  });

  it('measures execution cost, provenance coverage and conflicts', async () => {
    const manifest = {
      id: 'phase61-test-project',
      name: 'phase61-test-project',
      rootPath: '/tmp/phase61-test-project',
      createdAt: '2026-09-08T00:00:00.000Z',
      updatedAt: '2026-09-08T00:00:00.000Z',
      graphVersion: 1,
      memoryVersion: 1,
    };
    const plan = planCompositeRetrieval(
      'quy tắc production là gì và vì sao chọn append-only operation log?'
    );
    expect(plan.mode).toBe('composite');
    const result = await retrieveCompositeAnswer(manifest, plan.question, {
      plan,
      loadMemories: async () => [
        {
          id: 'm1',
          projectId: 'phase61-test-project',
          type: 'rule',
          scope: 'rule',
          content: 'Production deploys must always be verified before release.',
          confidence: 0.96,
          importance: 'high',
          importanceScore: 0.9,
          tags: ['rule'],
          source: 'test',
          createdAt: '2026-09-01T00:00:00.000Z',
          updatedAt: '2026-09-01T00:00:00.000Z',
          observedAt: '2026-09-01T00:00:00.000Z',
          verifiedAt: '2026-09-01T00:00:00.000Z',
        },
      ],
      now: Date.parse('2026-09-08T00:00:00.000Z'),
    });
    const metrics = measureRetrievalExecution(result);
    expect(metrics.mode).toBe('composite');
    expect(metrics.answerChars).toBe(result.answer.length);
    expect(metrics.estimatedTokens).toBeGreaterThan(0);
    expect(metrics.successfulFragments).toBeGreaterThan(0);
    expect(metrics.provenanceCoverage).toBe(1);
    expect(metrics.sourceBudgetExceeded).toBe(false);
  });

  it('renders a human-readable report with key metrics', () => {
    const report = evaluateRetrievalPlanner();
    const rendered = renderRetrievalQualityReport(report);
    expect(rendered).toContain(report.benchmarkVersion);
    expect(rendered).toContain(`Cases: ${report.passedCases}/${report.totalCases} passed`);
    expect(rendered).toContain('Exact case accuracy:');
    expect(rendered).toContain('Intent F1:');
    expect(rendered).toContain('Source F1:');
    expect(rendered).toContain('Unnecessary source reads: 0');
    expect(rendered).toContain('Missing source reads: 0');
    expect(rendered).toContain('Source budget violations: 0');
  });
});
