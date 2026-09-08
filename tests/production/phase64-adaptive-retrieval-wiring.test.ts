import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { certifyAdaptiveRetrieval } from '../../src/production/retrieval-adaptive-certify.js';

describe('Phase 64 production adaptive routing', () => {
  it('passes promotion privacy and benchmark-rejection certification', () => {
    const result = certifyAdaptiveRetrieval();
    expect(result, JSON.stringify(result, null, 2)).toMatchObject({
      passed: true,
      safeRulePromoted: true,
      safeRuleApplied: true,
      benchmarkBreakingRuleRejected: true,
      previousRulesPreserved: true,
      privacySafe: true,
    });
  });

  it('wires adaptive routing into CLI ask', () => {
    const source = readFileSync('src/work-continuity/memory-query-cli.ts', 'utf8');
    expect(source).toContain('loadAdaptiveRetrievalOverrides');
    expect(source).toContain('applyAdaptiveRetrievalRoute');
    expect(source).toContain('--feedback-intent');
    expect(source).toContain('recordRetrievalFeedback');
  });

  it('wires the same adaptive routing into MCP', () => {
    const source = readFileSync('src/mcp/tools/memory-agent-ask.ts', 'utf8');
    expect(source).toContain('feedbackIntent');
    expect(source).toContain('loadAdaptiveRetrievalOverrides');
    expect(source).toContain('recordRetrievalFeedback');
  });

  it('makes adaptive routing a production release gate', () => {
    const source = readFileSync('src/production/production-certify.ts', 'utf8');
    expect(source).toContain('certifyAdaptiveRetrieval');
    expect(source).toContain("'phase64-adaptive-retrieval'");
  });

  it('adds no new public top-level command', () => {
    const bin = readFileSync('bin/toolnet-memory', 'utf8');
    expect(bin).not.toContain('retrieval:feedback)');
    expect(bin).not.toContain('adaptive:route)');
    expect(bin).not.toContain('retrieval:adapt)');
  });
});
