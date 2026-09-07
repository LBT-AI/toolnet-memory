import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Phase 60 production wiring', () => {
  it('routes the existing ask CLI through the Composite Planner', () => {
    const cli = readFileSync('src/work-continuity/memory-query-cli.ts', 'utf8');
    expect(cli).toContain('planCompositeRetrieval');
    expect(cli).toContain('compositePlanNeedsStorage');
    expect(cli).toContain('retrieveCompositeAnswer');
    expect(cli).toContain('[ToolNet Retrieval Planner]');
  });

  it('routes MCP memory_agent_ask through the same planner', () => {
    const source = readFileSync('src/mcp/tools/memory-agent-ask.ts', 'utf8');
    expect(source).toContain('retrieveCompositeAnswer');
    expect(source).toContain('retrievalPlan:');
    expect(source).toContain('retrievalFragments:');
    expect(source).toContain('retrievalConflicts:');
    expect(source).toContain('composite-intent-aware');
  });

  it('keeps Phase 59 as the underlying execution engine', () => {
    const source = readFileSync('src/work-continuity/composite-retrieval.ts', 'utf8');
    expect(source).toContain('retrieveIntentAwareAnswer');
    expect(source).toContain('routeForRetrievalIntent');
  });

  it('adds no new top-level CLI command', () => {
    const bin = readFileSync('bin/toolnet-memory', 'utf8');
    expect(bin).not.toContain('retrieve:plan)');
    expect(bin).not.toContain('composite:ask)');
    expect(bin).not.toContain('retrieval:composite)');
  });
});
