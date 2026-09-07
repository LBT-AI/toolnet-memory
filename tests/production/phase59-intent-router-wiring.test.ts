import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Phase 59 production wiring', () => {
  it('keeps the existing ask command and routes it through intent-aware retrieval', () => {
    const bin = readFileSync('bin/toolnet-memory', 'utf8');
    const cli = readFileSync('src/work-continuity/memory-query-cli.ts', 'utf8');
    expect(bin).toContain('ask)');
    expect(bin).toContain('bundle/memory-query.js');
    expect(cli).toContain('routeRetrievalIntent');
    expect(cli).toContain('retrieveIntentAwareAnswer');
    expect(cli).toContain('--debug-route');
  });

  it('routes MCP memory_agent_ask through the same Phase 59 router', () => {
    const source = readFileSync('src/mcp/tools/memory-agent-ask.ts', 'utf8');
    expect(source).toContain('retrieveIntentAwareAnswer');
    expect(source).toContain("routing: 'intent-aware' as const");
    expect(source).toContain('retrievalRoute:');
  });

  it('does not create a second top-level retrieval command', () => {
    const bin = readFileSync('bin/toolnet-memory', 'utf8');
    expect(bin).not.toContain('intent:route)');
    expect(bin).not.toContain('retrieve:route)');
  });
});
