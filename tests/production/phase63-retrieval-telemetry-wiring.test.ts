import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('Phase 63 production telemetry wiring', () => {
  it('records CLI ask retrieval telemetry', () => {
    const source = readFileSync('src/work-continuity/memory-query-cli.ts', 'utf8');
    expect(source).toContain('recordRetrievalTelemetry');
    expect(source).toContain('recordRetrievalTelemetryError');
    expect(source).toContain("surface: 'cli'");
  });

  it('records MCP retrieval telemetry through the same store', () => {
    const source = readFileSync('src/mcp/tools/memory-agent-ask.ts', 'utf8');
    expect(source).toContain('recordRetrievalTelemetry');
    expect(source).toContain('recordRetrievalTelemetryError');
    expect(source).toContain("surface: 'mcp'");
  });

  it('surfaces compact telemetry in the existing status command', () => {
    const source = readFileSync('src/production/status-cli.ts', 'utf8');
    expect(source).toContain('summarizeRetrievalTelemetry');
    expect(source).toContain("'Retrieval 7d'");
    expect(source).toContain("'Retrieval health'");
  });

  it('makes packaged privacy-safe telemetry production certified', () => {
    const smoke = readFileSync('src/production/retrieval-production-certify.ts', 'utf8');
    const certify = readFileSync('src/production/production-certify.ts', 'utf8');
    expect(smoke).toContain('telemetryPrivacySafe');
    expect(smoke).toContain('telemetryPassed');
    expect(certify).toContain("'phase63-retrieval-telemetry'");
  });

  it('does not add a public telemetry command', () => {
    const bin = readFileSync('bin/toolnet-memory', 'utf8');
    expect(bin).not.toContain('retrieval:telemetry)');
    expect(bin).not.toContain('telemetry:retrieval)');
  });
});
