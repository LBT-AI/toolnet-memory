import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PRODUCTION_PACK_REQUIRED_FILES } from '../../src/production/production-certify.js';

describe('Phase 58B architecture and replication explainability', () => {
  it('ships one non-empty top-level architecture overview', () => {
    const architecture = readFileSync('docs/architecture.md', 'utf8');
    expect(architecture.length).toBeGreaterThan(5_000);
    expect(architecture).toContain('Persistent Task Core');
    expect(architecture).toContain('Task Mirror Layer');
    expect(architecture).toContain('Cross-host replication');
    expect(architecture).toContain('MCP boundary');
    expect(architecture).toContain('Current Work');
    expect(architecture).toContain('occurredAt is metadata only');
    expect(architecture).toContain('hostId');
    expect(architecture).toContain('payloadSha256');
  });

  it('includes architecture.md in the production npm package', () => {
    expect(PRODUCTION_PACK_REQUIRED_FILES).toContain('docs/architecture.md');
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
      files?: string[];
    };
    expect(pkg.files).toContain('docs/architecture.md');
  });

  it('documents task:conflicts --explain without adding another top-level command', () => {
    const cli = readFileSync('src/tasks/cli.ts', 'utf8');
    const bin = readFileSync('bin/toolnet-memory', 'utf8');
    const help = readFileSync('packages/cli/help.ts', 'utf8');
    expect(cli).toContain("booleanFlag(parsed, 'explain')");
    expect(cli).toContain('replication.explainConflicts');
    expect(bin).toContain('task:conflicts)');
    expect(help).toContain('toolnet-memory task:conflicts [--explain]');
    expect(bin).not.toContain('task:merge-debug)');
    expect(bin).not.toContain('task:replication-debug)');
  });

  it('uses the production canonical ordering primitive for explanation', () => {
    const core = readFileSync('src/tasks/replication/core.ts', 'utf8');
    expect(core).toContain('const ordered = canonicalOperationOrder(deduped.operations);');
    expect(core).toContain('occurredAtUsedForOrdering:');
    expect(core).toContain('occurredAt is informational only and is not a merge-order key.');
  });
});
