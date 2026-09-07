import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Phase 57 memory:review production parity', () => {
  it('routes npm CLI through a production bundle', () => {
    const bin = readFileSync('bin/toolnet-memory', 'utf8');
    expect(bin).toContain('memory:review)');
    expect(bin).toContain('run bundle/memory-review.js src/session/memory-review-cli.ts');
  });

  it('includes memory review in production bundle', () => {
    const build = readFileSync('scripts/build-bundle.mjs', 'utf8');
    expect(build).toContain("'memory-review': 'src/session/memory-review-cli.ts'");
  });

  it('keeps standalone parity', () => {
    const standalone = readFileSync('src/standalone/cli.ts', 'utf8');
    expect(standalone).toContain("case 'memory:review':");
    expect(standalone).toContain("import('../session/memory-review-cli.js')");
  });
});
