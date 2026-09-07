import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Phase 59 production wiring', () => {
  it('keeps the existing ask command and Phase 59 engine under the composite planner', () => {
    const bin = readFileSync('bin/toolnet-memory', 'utf8');
    const cli = readFileSync('src/work-continuity/memory-query-cli.ts', 'utf8');
    const planner = readFileSync('src/work-continuity/composite-retrieval.ts', 'utf8');
    expect(bin).toContain('ask)');
    expect(bin).toContain('bundle/memory-query.js');
    expect(cli).toContain('retrieveCompositeAnswer');
    expect(planner).toContain('routeRetrievalIntent');
    expect(planner).toContain('retrieveIntentAwareAnswer');
    expect(cli).toContain('--debug-route');
  });

  it('keeps Phase 59 as the single-intent execution engine for MCP', () => {
    const planner = readFileSync('src/work-continuity/composite-retrieval.ts', 'utf8');
    const source = readFileSync('src/mcp/tools/memory-agent-ask.ts', 'utf8');
    expect(planner).toContain('retrieveIntentAwareAnswer');
    expect(source).toContain('retrieveCompositeAnswer');
    expect(source).toContain('retrievalRoute:');
  });

  it('does not create a second top-level retrieval command', () => {
    const bin = readFileSync('bin/toolnet-memory', 'utf8');
    expect(bin).not.toContain('intent:route)');
    expect(bin).not.toContain('retrieve:route)');
    expect(bin).not.toContain('retrieve:plan)');
  });
});
