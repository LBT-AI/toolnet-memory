import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('Phase 61 production wiring', () => {
  it('adds the retrieval:eval script and keeps ask on bundle/memory-query.js', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    expect(pkg.scripts['retrieval:eval']).toContain('retrieval-quality-eval');
    expect(pkg.scripts['phase61:certify']).toContain('phase61-retrieval-quality');
    const bin = readFileSync('bin/toolnet-memory', 'utf8');
    expect(bin).toContain('ask)');
    expect(bin).toContain('bundle/memory-query.js');
  });

  it('wires the debug-route output through explainability and cost metrics', () => {
    const cli = readFileSync('src/work-continuity/memory-query-cli.ts', 'utf8');
    expect(cli).toContain('explainRetrievalPlan');
    expect(cli).toContain('measureRetrievalExecution');
    expect(cli).toContain('estimated_tokens=');
    expect(cli).toContain('provenance_coverage=');
    expect(cli).toContain('answer_chars=');
  });

  it('exposes a deterministic evaluation CLI with gate thresholds', () => {
    const source = readFileSync('src/production/retrieval-quality-eval-cli.ts', 'utf8');
    expect(source).toContain('evaluateRetrievalPlanner');
    expect(source).toContain('evaluateRetrievalQualityGate');
    expect(source).toContain('PHASE61_STRICT_THRESHOLDS');
    expect(source).toContain('renderRetrievalQualityReport');
    expect(source).toContain("'--strict'");
    expect(source).toContain("'--json'");
  });

  it('keeps the benchmark as external ground truth', () => {
    const source = readFileSync('src/work-continuity/retrieval-quality-benchmark.ts', 'utf8');
    expect(source).toContain("'phase61-v1'");
    expect(source).toContain('vi-current-task');
    expect(source).toContain('vi-budget-four-intents');
    expect(source).toContain('expectedOmittedIntents');
  });

  it('adds no new top-level CLI command', () => {
    const bin = readFileSync('bin/toolnet-memory', 'utf8');
    expect(bin).not.toContain('retrieval:eval)');
    expect(bin).not.toContain('quality:gate)');
    expect(bin).not.toContain('benchmark:run)');
  });
});
