import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('MCP multi-client bootstrap contract', () => {
  it('does not hold the project-wide ProjectLock for the MCP process lifetime', () => {
    const source = readFileSync('src/mcp/bootstrap.ts', 'utf8');

    expect(source).not.toContain("from '../production/project-lock.js'");
    expect(source).not.toContain('new ProjectLock(project.id)');
    expect(source).toContain('MCP servers are client-scoped, not project-singletons.');
  });
});
